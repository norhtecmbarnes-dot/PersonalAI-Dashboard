import { clamp } from './vec';

/**
 * Keyboard + pointer-lock mouse + Gamepad API, collapsed into one `FrameInput`
 * the engine consumes once per tick.
 *
 * Control-scheme decision worth recording: flight is **mouse or arrow keys**,
 * never WASD. That is deliberate. The brief's own command list claims A, F, G,
 * H, L, C, T, M, S and P — including A (aft view) and S (shields) — so WASD
 * cannot also be pitch/yaw without keys doing two jobs. Arrows give keyboard
 * flight, WASD is left free, and every letter key means exactly one thing.
 */

export type CommandKey =
  | 'fore'
  | 'aft'
  | 'toggleView'
  | 'chart'
  | 'scan'
  | 'warp'
  | 'computer'
  | 'track'
  | 'nextTarget'
  | 'shields'
  | 'pause'
  | 'confirm'
  | 'cancel';

export interface FrameInput {
  /** Rate input from keyboard/gamepad, -1..1. */
  pitch: number;
  yaw: number;
  /** Stepped speed change from `[` / `]` or gamepad shoulders. */
  speedDelta: number;
  /** Absolute speed request from the 0-9 number keys. */
  setSpeed: number | null;
  fire: boolean;
  /** Warp is a *hold* in the original: hold to fly the tunnel. */
  warpHeld: boolean;
  /** Mouse look delta in pixels, already accumulated for this frame. */
  mouseDx: number;
  mouseDy: number;
  commands: Set<CommandKey>;
  pointerLocked: boolean;
  gamepad: boolean;
}

const KEY_COMMANDS: Record<string, CommandKey> = {
  KeyF: 'fore',
  KeyA: 'aft',
  KeyV: 'toggleView',
  KeyG: 'chart',
  KeyH: 'warp',
  KeyL: 'scan',
  KeyC: 'computer',
  KeyT: 'track',
  KeyM: 'nextTarget',
  KeyS: 'shields',
  KeyP: 'pause',
  Enter: 'confirm',
  Escape: 'cancel',
};

const PREVENT_DEFAULT = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  'BracketLeft',
  'BracketRight',
  'Tab',
]);

const DEADZONE = 0.16;

export class InputManager {
  private keys = new Set<string>();
  private commands = new Set<CommandKey>();
  private mouseDx = 0;
  private mouseDy = 0;
  private fireHeld = false;
  private warpHeld = false;
  private locked = false;
  private attached = false;
  private canvas: HTMLCanvasElement | null = null;
  private win: Window | null = null;
  private prevGamepadButtons: boolean[] = [];
  private firstGestureFired = false;
  private firstGestureHandlers: (() => void)[] = [];
  /** The engine decides when grabbing the cursor is appropriate. */
  private lockPredicate: (() => boolean) | null = null;

  setPointerLockAllowed(predicate: () => boolean): void {
    this.lockPredicate = predicate;
  }

  private canGrabCursor(): boolean {
    return this.lockPredicate ? this.lockPredicate() : true;
  }

  attach(canvas: HTMLCanvasElement, win: Window = window): void {
    if (this.attached) return;
    this.canvas = canvas;
    this.win = win;
    win.addEventListener('keydown', this.onKeyDown, { passive: false });
    win.addEventListener('keyup', this.onKeyUp);
    win.addEventListener('blur', this.onBlur);
    win.addEventListener('mousemove', this.onMouseMove);
    win.addEventListener('mousedown', this.onMouseDown);
    win.addEventListener('mouseup', this.onMouseUp);
    win.addEventListener('contextmenu', this.onContextMenu);
    win.addEventListener('pointerdown', this.handleFirstGesture, { once: true });
    win.addEventListener('keydown', this.handleFirstGesture, { once: true });
    win.addEventListener('gamepadconnected', this.onGamepadConnected);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.attached = true;
  }

  detach(): void {
    const win = this.win;
    if (!win || !this.attached) return;
    win.removeEventListener('keydown', this.onKeyDown);
    win.removeEventListener('keyup', this.onKeyUp);
    win.removeEventListener('blur', this.onBlur);
    win.removeEventListener('mousemove', this.onMouseMove);
    win.removeEventListener('mousedown', this.onMouseDown);
    win.removeEventListener('mouseup', this.onMouseUp);
    win.removeEventListener('contextmenu', this.onContextMenu);
    win.removeEventListener('gamepadconnected', this.onGamepadConnected);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.keys.clear();
    this.commands.clear();
    this.attached = false;
    this.canvas = null;
    this.win = null;
  }

  get pointerLocked(): boolean {
    return this.locked;
  }

  requestPointerLock(): void {
    const canvas = this.canvas;
    if (!canvas) return;
    try {
      const anyCanvas = canvas as HTMLCanvasElement & {
        requestPointerLock: (options?: { unadjustedMovement?: boolean }) => Promise<void> | void;
      };
      const result = anyCanvas.requestPointerLock({ unadjustedMovement: true });
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => {
          // Unadjusted movement is unsupported on some platforms; plain lock is fine.
          try {
            canvas.requestPointerLock();
          } catch {
            /* ignore */
          }
        });
      }
    } catch {
      /* pointer lock unsupported — arrow keys still fly the ship */
    }
  }

  releasePointerLock(): void {
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch {
      /* ignore */
    }
  }

  /** Called once, the first time the player interacts — used to unlock audio. */
  onFirstGesture(cb: () => void): void {
    if (this.firstGestureFired) {
      cb();
      return;
    }
    this.firstGestureHandlers.push(cb);
  }

  /** Drain one frame of input. One-shot commands are cleared after reading. */
  poll(): FrameInput {
    const keys = this.keys;
    const gamepad = this.readGamepad();

    let pitch = 0;
    let yaw = 0;
    if (keys.has('ArrowUp')) pitch += 1;
    if (keys.has('ArrowDown')) pitch -= 1;
    if (keys.has('ArrowLeft')) yaw -= 1;
    if (keys.has('ArrowRight')) yaw += 1;

    pitch += gamepad.pitch;
    yaw += gamepad.yaw;

    let setSpeed: number | null = null;
    for (let i = 0; i <= 9; i++) {
      if (keys.has(`Digit${i}`) || keys.has(`Numpad${i}`)) {
        setSpeed = i;
        break;
      }
    }

    let speedDelta = 0;
    if (keys.has('BracketRight') || keys.has('Equal') || keys.has('NumpadAdd')) speedDelta += 1;
    if (keys.has('BracketLeft') || keys.has('Minus') || keys.has('NumpadSubtract')) speedDelta -= 1;
    speedDelta += gamepad.speedDelta;

    const fire = this.fireHeld || keys.has('Space') || gamepad.fire;
    // Warp is a hold. Enter counts as holding it so a keyboard player can
    // confirm on the chart and keep the tunnel running without re-pressing.
    const warpHeld = this.warpHeld || keys.has('KeyH') || keys.has('Enter') || gamepad.warp;

    const frame: FrameInput = {
      pitch: clamp(pitch, -1, 1),
      yaw: clamp(yaw, -1, 1),
      speedDelta: clamp(speedDelta, -1, 1),
      setSpeed,
      fire,
      warpHeld,
      mouseDx: this.mouseDx,
      mouseDy: this.mouseDy,
      commands: new Set(this.commands),
      pointerLocked: this.locked,
      gamepad: gamepad.connected,
    };

    this.mouseDx = 0;
    this.mouseDy = 0;
    this.commands.clear();

    return frame;
  }

  /** True if any input source is active — used to cancel docking, etc. */
  private readGamepad(): {
    connected: boolean;
    pitch: number;
    yaw: number;
    speedDelta: number;
    fire: boolean;
    warp: boolean;
  } {
    const empty = {
      connected: false,
      pitch: 0,
      yaw: 0,
      speedDelta: 0,
      fire: false,
      warp: false,
    };
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return empty;

    const pads = navigator.getGamepads();
    let pad: Gamepad | null = null;
    for (const candidate of pads) {
      if (candidate && candidate.connected) {
        pad = candidate;
        break;
      }
    }
    if (!pad) {
      this.prevGamepadButtons = [];
      return empty;
    }

    const axis = (i: number) => {
      const value = pad.axes[i] ?? 0;
      return Math.abs(value) < DEADZONE ? 0 : value;
    };

    const pressed = (i: number) => Boolean(pad.buttons[i]?.pressed);
    const edge = (i: number) => {
      const now = pressed(i);
      const was = this.prevGamepadButtons[i] ?? false;
      return now && !was;
    };

    // Face + shoulder edges become one-shot commands.
    if (edge(0)) this.commands.add('shields'); // A
    if (edge(1)) this.commands.add('computer'); // B
    if (edge(2)) this.commands.add('nextTarget'); // X
    if (edge(3)) this.commands.add('toggleView'); // Y
    if (edge(8)) this.commands.add('pause'); // Start / Menu
    if (edge(12)) this.commands.add('chart'); // D-pad up
    if (edge(13)) this.commands.add('scan'); // D-pad down
    if (edge(14)) this.commands.add('fore'); // D-pad left
    if (edge(15)) this.commands.add('aft'); // D-pad right

    const buttons: boolean[] = [];
    for (let i = 0; i < pad.buttons.length; i++) buttons.push(pressed(i));
    this.prevGamepadButtons = buttons;

    let speedDelta = 0;
    if (pressed(4)) speedDelta -= 1; // LB
    if (pressed(5)) speedDelta += 1; // RB

    return {
      connected: true,
      pitch: -axis(3),
      yaw: axis(2),
      speedDelta,
      fire: pressed(7) || pressed(6), // RT / LT
      warp: edge(9) || pressed(9) || edge(10) || pressed(10), // Select / L3
    };
  }

  private onGamepadConnected = () => {
    this.firstGestureFired = true;
    for (const handler of this.firstGestureHandlers.splice(0)) handler();
  };

  private handleFirstGesture = () => {
    if (this.firstGestureFired) return;
    this.firstGestureFired = true;
    for (const handler of this.firstGestureHandlers.splice(0)) handler();
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (PREVENT_DEFAULT.has(event.code)) event.preventDefault();
    if (event.repeat) return;

    this.keys.add(event.code);

    if (event.code === 'Space') this.fireHeld = true;
    if (event.code === 'KeyH' || event.code === 'Enter') this.warpHeld = true;

    const command = KEY_COMMANDS[event.code];
    if (command) {
      if (command === 'warp') return; // hold-only, handled via warpHeld
      this.commands.add(command);
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
    if (event.code === 'Space') this.fireHeld = false;
    if (event.code === 'KeyH' || event.code === 'Enter') this.warpHeld = false;
  };

  private onBlur = () => {
    // Never leave a key stuck down when focus leaves the window.
    this.keys.clear();
    this.fireHeld = false;
    this.warpHeld = false;
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.locked) return;
    this.mouseDx += event.movementX;
    this.mouseDy += event.movementY;
  };

  private onMouseDown = (event: MouseEvent) => {
    if (event.button !== 0) return;
    // Do not steal the cursor while a chart, scan or menu panel is open.
    if (this.canGrabCursor()) this.fireHeld = true;
    if (!this.locked && this.canGrabCursor()) this.requestPointerLock();
  };

  private onMouseUp = (event: MouseEvent) => {
    if (event.button === 0) this.fireHeld = false;
  };

  private onContextMenu = (event: Event) => {
    event.preventDefault();
  };

  private onPointerLockChange = () => {
    this.locked = document.pointerLockElement === this.canvas;
    if (!this.locked) {
      this.fireHeld = false;
    }
  };
}
