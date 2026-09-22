import { TUNING, getDifficulty, rankForScore, type Difficulty, type DifficultyId } from './data/schema';
import { Store } from './core/store';
import { InputManager, type FrameInput } from './core/input';
import {
  healthySystems,
  type EnemyKind,
  type EnemyShip,
  type Galaxy,
  type GalaxyCell,
  type Mode,
  type MissionStats,
  type PlayerState,
  type RankResult,
  type Systems,
  type ViewMode,
} from './core/types';
import { clamp, dist, dot, normalize, sub, v3, type Vec3 } from './core/vec';
import {
  aliveBases,
  allEnemiesCleared,
  cellAt,
  createGalaxy,
  planWarp,
  tickStarDate,
  totalEnemies,
} from './galaxy/chart';
import { buildSectorLayout, type SectorLayout } from './galaxy/sector';
import { assignDetails, promoteQueued, spawnDart, updateDart } from './enemies/dart';
import { spawnLance, updateLance } from './enemies/lance';
import { spawnAnvil, updateAnvil } from './enemies/anvil';
import { playerVelocity, updatePlayerShip, type ShipInput } from './ship/player';
import { PhotonPool, findHit, resolveInterceptions } from './weapons/photons';
import {
  applyPlayerHit,
  canFire,
  drainPerSecond,
  fireIntervalScale,
  repairAll,
  trackingAssistFor,
} from './sim/energy';
import { beginWarp, missedDestination, updateWarp, warpOutcome, type WarpState } from './warp/hyperwarp';
import { beginDock, dockPrompt, updateDock, type DockState } from './dock/docking';
import { GameRenderer } from './render/scene';
import { drawCockpit, type HudContact, type HudDockBox, type HudLockBox, type HudState } from './render/hud';
import { GameAudio } from './audio/audio';

const FIXED_STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;
const MESSAGE_SECONDS = 3.4;

export interface GameSettings {
  invertAft: boolean;
  sensitivity: number;
  damageNumbers: boolean;
  filmGrain: boolean;
  audio: boolean;
  showDebug: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  invertAft: true,
  sensitivity: 1,
  damageNumbers: true,
  filmGrain: true,
  audio: true,
  showDebug: false,
};

export interface ChartCellView {
  x: number;
  y: number;
  kind: GalaxyCell['kind'];
  enemies: number;
  base: boolean;
  baseAlive: boolean;
  surrounded: boolean;
  visited: boolean;
  isPlayer: boolean;
  cost: number;
  affordable: boolean;
}

export interface ChartSnapshot {
  width: number;
  height: number;
  playerX: number;
  playerY: number;
  cursorX: number;
  cursorY: number;
  cells: ChartCellView[];
  plan: { distance: number; cost: number; affordable: boolean; label: string } | null;
  energy: number;
  hostilesInSector: number;
  starDate: number;
}

export interface ScanContact {
  x: number;
  y: number;
  hostile: boolean;
  ghost: boolean;
  range: number;
}

export interface ScanSnapshot {
  contacts: ScanContact[];
  range: number;
  base: { x: number; y: number } | null;
  ghosts: boolean;
  degraded: boolean;
}

export interface UiState {
  mode: Mode;
  paused: boolean;
  message: string;
  alert: boolean;
  difficulty: DifficultyId;
  difficultyLabel: string;
  starDate: number;
  kills: number;
  enemiesLeft: number;
  basesLeft: number;
  totalEnemies: number;
  totalBases: number;
  energy: number;
  speed: number;
  shields: boolean;
  systems: Systems;
  hull: number;
  rank: RankResult | null;
  chart: ChartSnapshot | null;
  scan: ScanSnapshot | null;
  showFirstRun: boolean;
  audioOn: boolean;
  settings: GameSettings;
  bestScores: Partial<Record<DifficultyId, number>>;
  missionActive: boolean;
  pointerLocked: boolean;
  fps: number;
  reason: string;
}

interface DamageMark {
  x: number;
  y: number;
  text: string;
  life: number;
  hostile: boolean;
}

const SETTINGS_KEY = 'star-raiders-settings';
const BEST_KEY = 'star-raiders-best';
const INTRO_KEY = 'star-raiders-intro-seen';

function loadJson<T extends object>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return fallback;
    return { ...fallback, ...(parsed as object) } as T;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be blocked — the game still plays */
  }
}

export interface GameOptions {
  webglCanvas: HTMLCanvasElement;
  hudCanvas: HTMLCanvasElement;
  container: HTMLElement;
  difficulty: DifficultyId;
  seed: number;
}

export class StarRaidersGame {
  readonly state: Store<UiState>;
  readonly settings: GameSettings;
  private readonly input = new InputManager();
  private readonly audio = new GameAudio();
  private readonly renderer: GameRenderer;
  private readonly hudCtx: CanvasRenderingContext2D;
  private readonly container: HTMLElement;
  private readonly difficultyId: DifficultyId;
  private readonly seed: number;
  private difficulty: Difficulty;
  private galaxy: Galaxy;
  private readonly pool = new PhotonPool(256);

  private player: PlayerState;
  private enemies: EnemyShip[] = [];
  private sector: SectorLayout | null = null;
  private mode: Mode = 'title';
  private paused = false;
  private running = false;
  private view: ViewMode = 'fore';

  private accumulator = 0;
  private lastTime = 0;
  private rafId = 0;
  private fps = 60;
  private message = '';
  private messageTimer = 0;
  private alert = false;
  private alertPulse = 0;
  private hitFlash = 0;
  private boundaryFlash = 0;
  private asteroidCooldown = 0;
  private dockingGrace = 0;
  private ambientTimer = 0;
  private chartNavTimer = 0;
  private chartCursor = { x: 1, y: 0 };

  private dockState: DockState | null = null;
  private warpState: WarpState | null = null;
  private pendingWarp: { x: number; y: number } | null = null;
  private targeting = { on: false, tracked: false, target: null as EnemyShip | null };
  private marks: DamageMark[] = [];
  private stats: MissionStats = this.freshStats();
  private rankResult: RankResult | null = null;
  private rankReason = '';
  private bestScores: Partial<Record<DifficultyId, number>>;
  private resizeObserver: ResizeObserver | null = null;
  private hudSize = { width: 1280, height: 720, dpr: 1 };

  private frameInput: FrameInput = EMPTY_INPUT();

  private readonly playerVel: Vec3 = v3();
  private readonly scratch: Vec3 = v3();
  private readonly scratch2: Vec3 = v3();

  constructor(options: GameOptions) {
    this.container = options.container;
    this.difficultyId = options.difficulty;
    this.seed = options.seed;
    this.difficulty = getDifficulty(options.difficulty);
    this.galaxy = createGalaxy({ difficulty: this.difficulty, seed: this.seed });

    this.settings = loadJson<GameSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
    this.bestScores = loadJson<Partial<Record<DifficultyId, number>>>(BEST_KEY, {});

    this.player = this.freshPlayer();

    const hudCtx = options.hudCanvas.getContext('2d');
    if (!hudCtx) throw new Error('2D canvas context unavailable — the cockpit cannot be drawn.');
    this.hudCtx = hudCtx;

    this.renderer = new GameRenderer(
      options.webglCanvas,
      TUNING.sector.starCount,
      TUNING.sector.dustCount,
      TUNING.sector.radius,
    );

    const introSeen = typeof window !== 'undefined' && window.localStorage.getItem(INTRO_KEY) === '1';

    this.state = new Store<UiState>({
      mode: 'title',
      paused: false,
      message: '',
      alert: false,
      difficulty: options.difficulty,
      difficultyLabel: this.difficulty.label,
      starDate: 1,
      kills: 0,
      enemiesLeft: totalEnemies(this.galaxy),
      basesLeft: aliveBases(this.galaxy).length,
      totalEnemies: totalEnemies(this.galaxy),
      totalBases: this.galaxy.startingBases,
      energy: TUNING.energy.start,
      speed: 0,
      shields: false,
      systems: healthySystems(),
      hull: TUNING.hull.start,
      rank: null,
      chart: null,
      scan: null,
      showFirstRun: !introSeen,
      audioOn: this.settings.audio,
      settings: { ...this.settings },
      bestScores: { ...this.bestScores },
      missionActive: false,
      pointerLocked: false,
      fps: 60,
      reason: '',
    });

    this.audio.setEnabled(this.settings.audio);
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  start(): void {
    if (this.running) return;
    this.running = true;

    this.input.attach(this.renderer.canvas, window);
    this.input.setPointerLockAllowed(() => this.mode === 'flying' && !this.paused);
    this.input.onFirstGesture(() => {
      this.audio.unlock();
      this.audio.setEnabled(this.settings.audio);
      this.syncUi({ pointerLocked: this.input.pointerLocked });
    });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.container);
    }
    this.resize();

    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.input.detach();
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
    this.audio.dispose();
  }

  // -------------------------------------------------------------------------
  // Public actions
  // -------------------------------------------------------------------------

  setDifficulty(id: DifficultyId): void {
    if (this.state.get().missionActive) return;
    this.difficulty = getDifficulty(id);
    this.syncUi({ difficulty: id, difficultyLabel: this.difficulty.label });
  }

  beginMission(): void {
    // A fresh mission is a fresh galaxy — same seed, so a bug still reproduces.
    this.galaxy = createGalaxy({ difficulty: this.difficulty, seed: this.seed });

    this.stats = this.freshStats();
    this.rankResult = null;
    this.rankReason = '';
    this.player = this.freshPlayer();
    this.pool.clear();
    this.marks = [];
    this.enemies = [];
    this.message = '';
    this.messageTimer = 0;
    this.alert = false;
    this.view = 'fore';
    this.paused = false;
    this.accumulator = 0;
    this.dockState = null;
    this.warpState = null;
    this.pendingWarp = null;
    this.targeting = { on: false, tracked: false, target: null };
    this.chartCursor = { x: 1, y: 0 };

    this.enterSector(0, Math.floor(this.galaxy.height / 2), false);
    this.mode = 'flying';

    this.syncUi({
      missionActive: true,
      rank: null,
      mode: 'flying',
      paused: false,
      energy: TUNING.energy.start,
      hull: TUNING.hull.start,
      systems: healthySystems(),
      kills: 0,
      starDate: 1,
      totalEnemies: totalEnemies(this.galaxy),
      totalBases: this.galaxy.startingBases,
      reason: '',
    });

    this.radio('SYSTEMS ONLINE — GOOD HUNTING');
    this.input.requestPointerLock();
  }

  openChart(): void {
    if (this.mode !== 'flying') return;
    this.mode = 'chart';
    this.chartNavTimer = 0.25;
    this.input.releasePointerLock();
    this.syncUi({ mode: 'chart', chart: this.buildChartSnapshot() });
  }

  closeChart(): void {
    if (this.mode !== 'chart') return;
    this.mode = 'flying';
    this.syncUi({ mode: 'flying', chart: null });
    this.input.requestPointerLock();
  }

  moveCursor(dx: number, dy: number): void {
    this.setCursor(this.chartCursor.x + dx, this.chartCursor.y + dy);
  }

  setCursor(x: number, y: number): void {
    this.chartCursor.x = clamp(x, 0, this.galaxy.width - 1);
    this.chartCursor.y = clamp(y, 0, this.galaxy.height - 1);
    this.syncUi({ chart: this.buildChartSnapshot() });
  }

  confirmWarp(): void {
    if (this.mode !== 'chart') return;
    const plan = planWarp(this.galaxy, this.chartCursor.x, this.chartCursor.y, this.player.energy);
    if (plan.distance < 0.5) {
      this.radio('ALREADY IN THAT SECTOR');
      return;
    }
    if (!plan.affordable) {
      this.radio('INSUFFICIENT ENERGY FOR WARP');
      return;
    }

    this.pendingWarp = { x: this.chartCursor.x, y: this.chartCursor.y };
    this.player.energy -= plan.cost;
    this.stats.warps += 1;
    const warp = beginWarp(
      this.galaxy.playerX,
      this.galaxy.playerY,
      this.chartCursor.x,
      this.chartCursor.y,
      this.difficulty,
    );
    warp.cost = plan.cost;
    this.warpState = warp;
    this.mode = 'warp';
    this.syncUi({ mode: 'warp', chart: null });
    this.audio.warpRise(warp.duration);
  }

  abortWarp(): void {
    if (this.mode !== 'warp' || !this.warpState) return;
    this.player.energy = Math.max(0, this.player.energy - TUNING.energy.warpAbortFee);
    this.stats.warpMisses += 1;
    this.warpState = null;
    this.pendingWarp = null;
    this.mode = 'flying';
    this.setSpeedQuiet(TUNING.ship.defaultSpeedAfterWarp);
    this.syncUi({ mode: 'flying' });
    this.radio('WARP ABORTED');
    this.input.requestPointerLock();
  }

  openScan(): void {
    if (this.mode !== 'flying') return;
    this.mode = 'scan';
    this.input.releasePointerLock();
    this.syncUi({ mode: 'scan', scan: this.buildScanSnapshot() });
  }

  closeScan(): void {
    if (this.mode !== 'scan') return;
    this.mode = 'flying';
    this.syncUi({ mode: 'flying', scan: null });
    this.input.requestPointerLock();
  }

  togglePause(): void {
    if (this.mode === 'title' || this.mode === 'rank') return;
    this.paused = !this.paused;
    if (this.paused) this.input.releasePointerLock();
    else this.input.requestPointerLock();
    this.syncUi({ paused: this.paused });
  }

  toggleAudio(): void {
    this.settings.audio = !this.settings.audio;
    this.audio.unlock();
    this.audio.setEnabled(this.settings.audio);
    saveJson(SETTINGS_KEY, this.settings);
    this.syncUi({ audioOn: this.settings.audio, settings: { ...this.settings } });
  }

  updateSettings(patch: Partial<GameSettings>): void {
    Object.assign(this.settings, patch);
    saveJson(SETTINGS_KEY, this.settings);
    this.syncUi({ settings: { ...this.settings } });
  }

  dismissFirstRun(): void {
    if (typeof window !== 'undefined') window.localStorage.setItem(INTRO_KEY, '1');
    this.syncUi({ showFirstRun: false });
  }

  requestPointerLock(): void {
    this.input.requestPointerLock();
  }

  backToTitle(): void {
    this.mode = 'title';
    this.paused = false;
    this.pool.clear();
    this.enemies = [];
    this.sector = null;
    this.dockState = null;
    this.warpState = null;
    this.renderer.resetEffects();
    this.input.releasePointerLock();
    this.syncUi({
      mode: 'title',
      missionActive: false,
      rank: null,
      paused: false,
      alert: false,
      chart: null,
      scan: null,
    });
  }

  // -------------------------------------------------------------------------
  // Fresh state helpers
  // -------------------------------------------------------------------------

  private freshPlayer(): PlayerState {
    return {
      pos: v3(0, 0, 0),
      heading: v3(0, 0, -1),
      up: v3(0, 1, 0),
      right: v3(1, 0, 0),
      pitch: 0,
      yaw: 0,
      roll: 0,
      speed: 0,
      targetSpeed: 0,
      shields: false,
      energy: TUNING.energy.start,
      hull: TUNING.hull.start,
      systems: healthySystems(),
      fireTimer: 0,
      tube: 0,
      tracking: false,
      targetIndex: 0,
    };
  }

  private freshStats(): MissionStats {
    return {
      kills: 0,
      energyUsed: 0,
      seconds: 0,
      basesLostToEnemy: 0,
      basesYouKilled: 0,
      warpMisses: 0,
      warps: 0,
      deaths: 0,
      outcome: 'abort',
    };
  }

  private setSpeedQuiet(speed: number): void {
    this.player.targetSpeed = clamp(speed, 0, TUNING.ship.maxSpeed);
    this.player.speed = this.player.targetSpeed;
  }

  // -------------------------------------------------------------------------
  // Main loop
  // -------------------------------------------------------------------------

  private frame = (now: number) => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.frame);

    const rawDt = Math.min(0.25, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.fps = this.fps * 0.9 + (1 / Math.max(rawDt, 1e-4)) * 0.1;

    this.frameInput = this.input.poll();
    this.handleCommands(this.frameInput, rawDt);

    const simulating = !this.paused && this.mode !== 'title' && this.mode !== 'rank';
    if (simulating) {
      this.accumulator += rawDt;
      let steps = 0;
      while (this.accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
        this.stepSim(FIXED_STEP);
        this.accumulator -= FIXED_STEP;
        steps++;
      }
      if (steps >= MAX_STEPS_PER_FRAME) this.accumulator = 0;
    } else {
      this.accumulator = 0;
    }

    this.renderer.updateEffects(rawDt);
    this.updateMarks(rawDt);
    this.tickTimers(rawDt);

    // Push simulation state into the scene graph. Without this the world
    // renders as empty space — the meshes are created lazily from these calls.
    this.renderer.syncEnemies(this.enemies);
    this.renderer.syncBolts(this.pool);

    // Always render: the starfield is the title screen backdrop too.
    this.renderer.render(this.player, this.view, this.player.speed);
    this.drawHud();
    this.syncAmbientUi(rawDt);
  };

  private tickTimers(dt: number): void {
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) {
        this.message = '';
        this.syncUi({ message: '' });
      }
    }
    this.alertPulse += dt;
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 2.6);
    if (this.boundaryFlash > 0) this.boundaryFlash = Math.max(0, this.boundaryFlash - dt * 1.4);
    if (this.asteroidCooldown > 0) this.asteroidCooldown = Math.max(0, this.asteroidCooldown - dt);
    if (this.dockingGrace > 0) this.dockingGrace = Math.max(0, this.dockingGrace - dt);
  }

  private updateMarks(dt: number): void {
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const mark = this.marks[i];
      mark.life -= dt;
      mark.y += dt * 0.06;
      if (mark.life <= 0) this.marks.splice(i, 1);
    }
  }

  private syncAmbientUi(dt: number): void {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 0.18;

    this.syncUi({
      energy: Math.round(this.player.energy),
      speed: Math.round(this.player.speed),
      hull: Math.round(this.player.hull),
      shields: this.player.shields,
      systems: { ...this.player.systems },
      kills: this.stats.kills,
      enemiesLeft: totalEnemies(this.galaxy) + this.liveEnemyCount(),
      basesLeft: aliveBases(this.galaxy).length,
      starDate: this.galaxy.starDate,
      alert: this.alert,
      pointerLocked: this.input.pointerLocked,
      fps: Math.round(this.fps),
    });
  }

  // -------------------------------------------------------------------------
  // Commands
  // -------------------------------------------------------------------------

  private handleCommands(frame: FrameInput, dt: number): void {
    if (this.mode === 'title' || this.mode === 'rank') return;

    if (frame.commands.has('pause')) this.togglePause();
    if (this.paused) return;

    if (this.mode === 'warp') {
      if (frame.commands.has('cancel') || frame.setSpeed !== null || frame.speedDelta !== 0) {
        this.abortWarp();
      }
      return;
    }

    if (this.mode === 'chart') {
      if (frame.commands.has('chart') || frame.commands.has('cancel')) {
        this.closeChart();
        return;
      }
      if (frame.commands.has('confirm') || frame.commands.has('warp') || frame.warpHeld) {
        this.confirmWarp();
        return;
      }
      // Arrow keys walk the cursor around the chart.
      this.chartNavTimer = Math.max(0, this.chartNavTimer - dt);
      if (this.chartNavTimer <= 0) {
        let dx = 0;
        let dy = 0;
        if (frame.yaw > 0.5) dx = 1;
        else if (frame.yaw < -0.5) dx = -1;
        if (frame.pitch > 0.5) dy = -1;
        else if (frame.pitch < -0.5) dy = 1;
        if (dx !== 0 || dy !== 0) {
          this.moveCursor(dx, dy);
          this.chartNavTimer = 0.16;
        }
      }
      return;
    }

    if (this.mode === 'scan') {
      if (frame.commands.has('scan') || frame.commands.has('cancel')) this.closeScan();
      return;
    }

    if (this.mode === 'docked') {
      // The prompt promises "any key": throttle keys launch too, not just
      // command keys.
      if (frame.commands.size === 0 && frame.setSpeed === null) return;
      this.mode = 'flying';
      this.syncUi({ mode: 'flying' });
      this.input.requestPointerLock();
      return;
    }

    if (frame.commands.has('chart')) {
      this.openChart();
      return;
    }
    if (frame.commands.has('scan')) {
      this.openScan();
      return;
    }
    if (frame.commands.has('shields')) this.toggleShields();
    if (frame.commands.has('computer')) this.toggleComputer();
    if (frame.commands.has('track')) this.toggleTracking();
    if (frame.commands.has('nextTarget')) this.cycleTarget();
    if (frame.commands.has('fore')) this.setView('fore');
    if (frame.commands.has('aft')) this.setView('aft');
    if (frame.commands.has('toggleView')) this.setView(this.view === 'fore' ? 'aft' : 'fore');
  }

  private toggleShields(): void {
    if (this.player.systems.shields === 'dead') {
      this.player.shields = false;
      this.radio('SHIELDS DESTROYED');
      return;
    }
    this.player.shields = !this.player.shields;
  }

  private toggleComputer(): void {
    if (this.player.systems.computer === 'dead') {
      this.targeting.on = false;
      this.targeting.target = null;
      this.radio('ATTACK COMPUTER DESTROYED');
      return;
    }
    this.targeting.on = !this.targeting.on;
    if (!this.targeting.on) {
      this.targeting.target = null;
      this.targeting.tracked = false;
    } else {
      this.acquireTarget();
    }
  }

  private toggleTracking(): void {
    if (!this.targeting.on) {
      this.radio('ATTACK COMPUTER OFF');
      return;
    }
    if (!this.targeting.target) this.acquireTarget();
    this.targeting.tracked = Boolean(this.targeting.target);
    if (!this.targeting.tracked) this.radio('NO TARGET');
  }

  private cycleTarget(): void {
    if (!this.targeting.on) {
      this.radio('ATTACK COMPUTER OFF');
      return;
    }
    const live = this.enemies.filter(e => e.active && !e.drone);
    if (live.length === 0) {
      this.targeting.target = null;
      this.radio('NO CONTACTS');
      return;
    }
    const current = this.targeting.target;
    const index = current ? live.indexOf(current) : -1;
    this.targeting.target = live[(index + 1) % live.length];
    this.targeting.tracked = true;
  }

  private setView(view: ViewMode): void {
    this.view = view;
  }

  // -------------------------------------------------------------------------
  // Simulation
  // -------------------------------------------------------------------------

  private stepSim(dt: number): void {
    if (this.mode === 'title' || this.mode === 'rank') return;
    this.stats.seconds += dt;

    if (this.mode === 'flying' || this.mode === 'docking' || this.mode === 'docked') {
      this.stepFlight(dt);
    } else if (this.mode === 'warp') {
      this.stepWarp(dt);
    } else {
      // Chart or scan open: station keeping. Nothing shoots while the player
      // cannot see, but the clock and the drains keep running.
      this.player.speed = 0;
      this.applyBaseDrain(dt);
      this.tickGalaxyClock(dt);
    }

    this.pool.update(dt);
    this.updateEnemyTargeting();
  }

  private stepFlight(dt: number): void {
    // Docked is a held state, not a phase of flight: the base is servicing the
    // ship, nothing drains, and one key press launches. Without this early
    // return the docking check would immediately re-acquire the same base.
    if (this.mode === 'docked') {
      this.player.speed = 0;
      this.tickGalaxyClock(dt);
      this.checkMissionEnd();
      return;
    }

    const frame = this.frameInput;

    const shipInput: ShipInput = {
      pitch: frame.pitch,
      yaw: frame.yaw,
      mouseDx: frame.mouseDx,
      mouseDy: frame.mouseDy,
      setSpeed: frame.setSpeed,
      speedDelta: frame.speedDelta,
      invertAft: this.settings.invertAft,
      mouseSensitivity: TUNING.ship.mouseSensitivity * this.settings.sensitivity,
    };

    const result = updatePlayerShip(
      this.player,
      shipInput,
      dt,
      this.view,
      this.player.systems,
      TUNING.sector.radius,
    );
    if (result.atBoundary) this.boundaryFlash = 1;

    this.applyBaseDrain(dt);
    this.tryFire(dt, frame);

    playerVelocity(this.player, this.playerVel);
    assignDetails(this.enemies);
    promoteQueued(this.enemies);

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      if (!enemy.detail && !enemy.drone && enemy.state !== 'queue') continue;

      // Per-class AI dispatch. Darts flank, Lances duel head-on, Anvils snipe.
      let orders: { pos: Vec3; dir: Vec3; speed: number; life: number; damage?: { hull: number; energy: number; pierce?: number } }[] = [];
      if (enemy.kind === 'lance') {
        const lanceCfg = TUNING.enemies.lance;
        const order = updateLance(enemy, this.player, this.playerVel, dt, this.difficulty);
        if (order) orders = [{ ...order, damage: { hull: lanceCfg.boltHull, energy: lanceCfg.boltEnergy } }];
      } else if (enemy.kind === 'anvil') {
        const anvilCfg = TUNING.enemies.anvil;
        orders = updateAnvil(enemy, this.player, this.playerVel, dt, this.difficulty).map(order => ({
          ...order,
          // Anvil bolts carry the shield-piercing payload.
          damage: { hull: anvilCfg.boltHull, energy: anvilCfg.boltEnergy, pierce: anvilCfg.shieldPierce },
        }));
      } else {
        // Darts use the classic generic damage path — their tuning IS the
        // baseline the brief's drain table describes.
        const order = updateDart(enemy, this.player, this.playerVel, dt, this.difficulty, this.enemies);
        if (order) orders = [order];
      }
      for (const order of orders) {
        this.pool.spawn(false, order.pos, order.dir, order.speed, order.life, order.damage);
      }
    }

    this.spawnPendingReinforcements();
    this.resolveCombat();
    this.checkAsteroidCollision();
    this.updateDocking(dt, result);
    this.checkBaseIntegrity();
    this.tickGalaxyClock(dt);
    this.checkMissionEnd();
  }

  private applyBaseDrain(dt: number): void {
    const drain = drainPerSecond(this.player, this.targeting.on) * dt;
    this.player.energy = Math.max(0, this.player.energy - drain);
    this.stats.energyUsed += drain;
  }

  private tickGalaxyClock(dt: number): void {
    const events = tickStarDate(this.galaxy, dt, this.difficulty);
    for (const event of events) {
      if (event.kind === 'surrounded') {
        this.radio(event.text);
      } else {
        this.stats.basesLostToEnemy += 1;
        this.radio(event.text);
        if (aliveBases(this.galaxy).length === 0) {
          this.finishMission('abort', 'ALL BASES LOST');
          return;
        }
      }
    }
  }

  private liveEnemyCount(): number {
    return this.enemies.filter(e => e.active && !e.drone).length;
  }

  private spawnPendingReinforcements(): void {
    const cell = cellAt(this.galaxy, this.galaxy.playerX, this.galaxy.playerY);
    if (!cell || cell.enemies <= 0) return;

    const count = cell.enemies;
    cell.enemies = 0;
    if (!cell.base && (cell.kind === 'patrol' || cell.kind === 'taskforce' || cell.kind === 'fleet')) {
      cell.kind = 'empty';
    }

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random();
      const direction = v3(Math.cos(angle), (Math.random() - 0.5) * 0.5, Math.sin(angle));
      normalize(direction, direction);
      const enemy = this.spawnEnemy(this.reinforcementKind(count, i), v3(
        direction.x * TUNING.sector.radius * 0.8,
        direction.y * TUNING.sector.radius * 0.8,
        direction.z * TUNING.sector.radius * 0.8,
      ), Math.floor(Math.random() * 1e9));
      enemy.state = 'approach';
      this.enemies.push(enemy);
    }
    this.raiseAlert();
  }

  /** Fleet rule for mid-battle reinforcements: 3+ brings a Lance, 4+ an Anvil. */
  private reinforcementKind(count: number, index: number): EnemyKind {
    if (count >= 4 && index === count - 1) return 'anvil';
    if (count >= 3 && index === 0) return 'lance';
    return 'dart';
  }

  /** Single factory for enemy ships — keeps kind, seed and difficulty together. */
  private spawnEnemy(kind: EnemyKind, pos: Vec3, seed: number): EnemyShip {
    switch (kind) {
      case 'lance':
        return spawnLance({ pos, difficulty: this.difficulty, seed });
      case 'anvil':
        return spawnAnvil({ pos, difficulty: this.difficulty, seed });
      default:
        return spawnDart({ pos, difficulty: this.difficulty, seed });
    }
  }

  private raiseAlert(): void {
    if (this.alert) return;
    this.alert = true;
    this.audio.alert();
    this.radio('RED ALERT — HOSTILES IN SECTOR');
  }

  // -------------------------------------------------------------------------
  // Firing and combat
  // -------------------------------------------------------------------------

  private aimDirection(): Vec3 {
    const p = this.player;
    const out = v3(p.heading.x, p.heading.y, p.heading.z);

    const assist = trackingAssistFor(p.systems);
    const target = this.targeting.on ? this.targeting.target : null;
    if (assist > 0 && target && target.active) {
      const delta = sub(this.scratch, target.pos, p.pos);
      const range = Math.hypot(delta.x, delta.y, delta.z);
      const travel = range / TUNING.weapons.photonSpeed;
      const aim = v3(
        target.pos.x + target.vel.x * travel,
        target.pos.y + target.vel.y * travel,
        target.pos.z + target.vel.z * travel,
      );
      const toAim = sub(this.scratch2, aim, p.pos);
      normalize(toAim, toAim);
      out.x += (toAim.x - out.x) * assist * 8;
      out.y += (toAim.y - out.y) * assist * 8;
      out.z += (toAim.z - out.z) * assist * 8;
      normalize(out, out);
    }
    return out;
  }

  private tryFire(dt: number, frame: FrameInput): void {
    const p = this.player;
    p.fireTimer -= dt;
    if (!frame.fire || p.fireTimer > 0) return;

    if (!canFire(p.systems)) {
      p.fireTimer = 0.6;
      this.radio('PHOTONS DESTROYED');
      return;
    }

    const linked = this.targeting.on && this.targeting.tracked && Boolean(this.targeting.target);
    const cost = linked ? TUNING.energy.photon * 2 : TUNING.energy.photon;
    if (p.energy < cost) {
      p.fireTimer = 0.6;
      this.radio('INSUFFICIENT ENERGY');
      return;
    }

    // A locked target fires both tubes as a paired burst.
    p.fireTimer = TUNING.weapons.tubeCooldown * fireIntervalScale(p.systems) * (linked ? 1.7 : 1);
    p.energy -= cost;
    this.stats.energyUsed += cost;

    const dir = this.aimDirection();
    const tubes = linked ? [0, 1] : [p.tube];
    p.tube = p.tube === 0 ? 1 : 0;

    for (const tube of tubes) {
      const lateral = tube === 0 ? -1 : 1;
      const origin = v3(
        p.pos.x + p.right.x * lateral * 34 + p.up.x * -20 + p.heading.x * 70,
        p.pos.y + p.right.y * lateral * 34 + p.up.y * -20 + p.heading.y * 70,
        p.pos.z + p.right.z * lateral * 34 + p.up.z * -20 + p.heading.z * 70,
      );
      this.pool.spawn(true, origin, dir, TUNING.weapons.photonSpeed, TUNING.weapons.photonLife);
    }

    this.audio.photon();
  }

  private resolveCombat(): void {
    // Bolt-versus-bolt interception: the brief's "clip an incoming bolt".
    const intercepts = resolveInterceptions(this.pool);
    if (intercepts > 0) {
      const cost = intercepts * TUNING.energy.boltIntercept;
      this.player.energy = Math.max(0, this.player.energy - cost);
      this.stats.energyUsed += cost;
      this.audio.shieldHit();
    }

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      if (!enemy.detail && !enemy.drone && enemy.state === 'queue') continue;

      const hit = findHit(this.pool, true, enemy.pos, TUNING.weapons.hitRadius + 40);
      if (!hit) continue;

      hit.active = false;
      enemy.hull -= TUNING.weapons.photonDamage;
      this.renderer.spawnExplosion(enemy.pos, false, true);
      this.audio.shieldHit();

      if (enemy.hull <= 0) {
        enemy.active = false;
        this.renderer.spawnExplosion(enemy.pos, true, true);
        this.audio.explosion(true);
        if (enemy.drone) {
          this.radio('TRAINING DRONE DESTROYED');
        } else {
          this.stats.kills += 1;
          this.radio('VEYDrim SHIP DESTROYED');
        }
      }
    }

    // Hostile bolts against the player. The bolt carries its shooter's damage
    // profile — the Anvil's volley pierces shields by design.
    const playerHit = findHit(this.pool, false, this.player.pos, TUNING.weapons.hitRadius + 20);
    if (playerHit) {
      playerHit.active = false;
      this.damagePlayer(false, playerHit.pos, playerHit.damage);
    }

    if (this.alert && this.liveEnemyCount() === 0) {
      this.alert = false;
      this.radio('SECTOR CLEAR');
    }
  }

  private damagePlayer(fromAsteroid: boolean, at?: Vec3, bolt?: { hull: number; energy: number; pierce?: number }): void {
    const result = applyPlayerHit(
      this.player,
      fromAsteroid ? 'asteroid' : 'enemy-bolt',
      Math.random,
      fromAsteroid ? undefined : bolt,
    );
    this.hitFlash = 1;

    if (result.absorbedByShield) this.audio.shieldHit();
    else this.audio.hullHit();
    this.renderer.spawnShieldHit(at ?? this.player.pos);

    if (this.settings.damageNumbers && at) {
      const projected = this.renderer.project(at);
      if (projected.inFront) {
        this.marks.push({
          x: projected.x,
          y: projected.y,
          text: `-${Math.round(result.energyLost)}`,
          life: 1.1,
          hostile: true,
        });
      }
    }

    if (result.systemLost) this.radio(`${result.systemLost.toUpperCase()} DAMAGED`);

    if (result.destroyed) {
      this.stats.deaths += 1;
      this.renderer.spawnExplosion(this.player.pos, true, false);
      this.audio.explosion(true);
      this.finishMission('destroyed', 'STARSHIP DESTROYED');
    }
  }

  private checkAsteroidCollision(): void {
    if (!this.sector || this.asteroidCooldown > 0) return;
    for (const asteroid of this.sector.asteroids) {
      if (dist(this.player.pos, asteroid.pos) > asteroid.radius + 45) continue;

      this.asteroidCooldown = 0.9;
      const away = normalize(this.scratch, sub(this.scratch2, this.player.pos, asteroid.pos));
      const push = asteroid.radius + 60;
      this.player.pos.x = asteroid.pos.x + away.x * push;
      this.player.pos.y = asteroid.pos.y + away.y * push;
      this.player.pos.z = asteroid.pos.z + away.z * push;
      this.damagePlayer(true, this.player.pos);
      return;
    }
  }

  private currentBasePosition(): Vec3 | null {
    const cell = cellAt(this.galaxy, this.galaxy.playerX, this.galaxy.playerY);
    if (!cell || !cell.base || !cell.baseAlive) return null;
    return this.sector?.base?.pos ?? null;
  }

  private updateEnemyTargeting(): void {
    if (!this.targeting.on) {
      this.targeting.target = null;
      return;
    }
    const target = this.targeting.target;
    if (target && (!target.active || target.state === 'queue')) {
      this.targeting.target = null;
      this.targeting.tracked = false;
    }
    if (!this.targeting.target || !this.targeting.tracked) this.acquireTarget();
  }

  private acquireTarget(): void {
    const live = this.enemies.filter(e => e.active && (e.drone || e.detail));
    if (live.length === 0) {
      this.targeting.target = null;
      return;
    }

    let best: EnemyShip | null = null;
    let bestScore = -Infinity;
    for (const enemy of live) {
      const delta = sub(this.scratch, enemy.pos, this.player.pos);
      const range = Math.hypot(delta.x, delta.y, delta.z);
      const forward =
        delta.x * this.player.heading.x +
        delta.y * this.player.heading.y +
        delta.z * this.player.heading.z;
      const alignment = forward / Math.max(1, range);
      const score = alignment * 2000 - range;
      if (score > bestScore) {
        bestScore = score;
        best = enemy;
      }
    }
    this.targeting.target = best;
  }

  // -------------------------------------------------------------------------
  // Docking
  // -------------------------------------------------------------------------

  private updateDocking(dt: number, shipResult: { throttleChanged: boolean; attitudeChanged: boolean }): void {
    const base = this.currentBasePosition();
    if (!base) {
      this.dockState = null;
      return;
    }

    const delta = sub(this.scratch, base, this.player.pos);
    const range = Math.hypot(delta.x, delta.y, delta.z);
    const toward = normalize(this.scratch2, delta);
    const centeredness = dot(toward, this.player.heading);

    // Acquire only with the base roughly ahead (the brief: "acquire base in
    // fore view"). A loose gate here keeps the prompt honest — the strict
    // centring gate still governs the brackets themselves.
    const roughlyAhead = centeredness > 0.2;
    if (
      !this.dockState &&
      this.dockingGrace <= 0 &&
      range < TUNING.base.dockRange * 1.3 &&
      roughlyAhead
    ) {
      this.dockState = beginDock(this.galaxy.playerX, this.galaxy.playerY);
      this.mode = 'docking';
      this.syncUi({ mode: 'docking' });
      this.radio('BASE IN RANGE — MATCH DOCKING SPEED');
    }

    if (!this.dockState) return;

    if (range > TUNING.base.dockRange * 2.2) {
      this.dockState = null;
      this.dockingGrace = 3;
      if (this.mode === 'docking') {
        this.mode = 'flying';
        this.syncUi({ mode: 'flying' });
      }
      return;
    }

    const wasTransferring = this.dockState.phase === 'transfer';
    this.dockState = updateDock(
      this.dockState,
      {
        speed: this.player.speed,
        centeredness,
        range,
        moving: wasTransferring && (shipResult.throttleChanged || shipResult.attitudeChanged),
      },
      dt,
    );

    if (this.dockState.cancelled) {
      this.dockState = null;
      this.dockingGrace = 3;
      this.mode = 'flying';
      this.syncUi({ mode: 'flying' });
      this.radio('DOCKING ABORTED');
      return;
    }

    if (this.dockState.phase === 'complete') {
      this.dockState = null;
      this.dockingGrace = 4;
      this.setSpeedQuiet(0);
      repairAll(this.player);
      this.mode = 'docked';
      this.syncUi({
        mode: 'docked',
        energy: TUNING.energy.start,
        hull: TUNING.hull.start,
        systems: healthySystems(),
      });
      this.radio('ORBIT ESTABLISHED — SYSTEMS RESTORED');
    }
  }

  private checkBaseIntegrity(): void {
    const cell = cellAt(this.galaxy, this.galaxy.playerX, this.galaxy.playerY);
    if (!cell || !cell.base || !cell.baseAlive) return;
    const base = this.sector?.base?.pos;
    if (!base) return;

    const hit = findHit(this.pool, true, base, TUNING.base.radius * 1.4);
    if (!hit) return;

    hit.active = false;
    cell.baseAlive = false;
    this.stats.basesYouKilled += 1;
    this.renderer.spawnExplosion(base, true, false);
    this.audio.explosion(true);
    this.radio('YOU DESTROYED A HELION BASE');
    if (aliveBases(this.galaxy).length === 0) this.finishMission('abort', 'ALL BASES LOST');
  }

  // -------------------------------------------------------------------------
  // Warp
  // -------------------------------------------------------------------------

  private stepWarp(dt: number): void {
    const warp = this.warpState;
    if (!warp) return;

    // Warp is a hold. A short grace lets an Enter-confirm settle first.
    if (!this.frameInput.warpHeld && warp.elapsed > 0.3) {
      this.abortWarp();
      return;
    }

    updateWarp(warp, dt, {
      yaw: this.frameInput.yaw,
      pitch: this.frameInput.pitch,
      mouseDx: this.frameInput.mouseDx,
      mouseDy: this.frameInput.mouseDy,
    });

    this.player.speed = 0;

    const outcome = warpOutcome(warp);
    if (outcome === 'pending') return;

    if (outcome === 'aligned' && this.pendingWarp) {
      this.audio.warpSlam();
      this.renderer.spawnWarpStreaks(this.player.pos);
      this.arriveAt(this.pendingWarp.x, this.pendingWarp.y);
    } else {
      const miss = missedDestination(warp, this.galaxy.width, this.galaxy.height);
      this.stats.warpMisses += 1;
      this.audio.warpSlam();
      this.arriveAt(miss.x, miss.y);
      this.radio('WARP MISALIGNED — OFF COURSE');
    }

    this.warpState = null;
    this.pendingWarp = null;
    this.mode = 'flying';
    this.setSpeedQuiet(TUNING.ship.defaultSpeedAfterWarp);
    this.syncUi({ mode: 'flying' });
    this.input.requestPointerLock();
  }

  private arriveAt(x: number, y: number): void {
    this.leaveSector();
    this.enterSector(x, y, true);
  }

  // -------------------------------------------------------------------------
  // Sectors
  // -------------------------------------------------------------------------

  private leaveSector(): void {
    const cell = cellAt(this.galaxy, this.galaxy.playerX, this.galaxy.playerY);
    if (cell) {
      cell.enemies = this.liveEnemyCount();
      if (!cell.base) {
        if (cell.enemies >= 2) {
          cell.kind = cell.enemies >= 4 ? 'fleet' : cell.enemies === 3 ? 'taskforce' : 'patrol';
        } else if (cell.kind !== 'asteroids') {
          cell.kind = 'empty';
        }
      }
    }
    this.pool.clear();
    this.enemies = [];
    this.dockState = null;
    this.targeting = { on: false, tracked: false, target: null };
  }

  private enterSector(x: number, y: number, viaWarp: boolean): void {
    this.galaxy.playerX = x;
    this.galaxy.playerY = y;
    const cell = cellAt(this.galaxy, x, y);
    if (!cell) return;

    const firstVisit = !cell.visited;
    const cellEnemies = cell.enemies;
    cell.enemies = 0;

    this.sector = buildSectorLayout({
      cell,
      sectorRadius: TUNING.sector.radius,
      droneCount: firstVisit ? TUNING.sector.droneCount : 0,
      enemyShipCount: cellEnemies,
      hasBase: cell.base && cell.baseAlive,
    });

    this.renderer.setSector(this.sector);
    this.renderer.resetEffects();

    this.player.pos = v3(0, 0, 0);
    this.player.pitch = 0;
    this.player.yaw = 0;
    this.player.roll = 0;
    this.player.fireTimer = 0;
    this.setSpeedQuiet(viaWarp ? TUNING.ship.defaultSpeedAfterWarp : 0);
    if (!viaWarp) this.player.speed = 0;

    this.enemies = [];
    for (const spawn of this.sector.enemySpawns) {
      const enemy = this.spawnEnemy(spawn.kind, spawn.pos, spawn.seed);
      enemy.state = 'approach';
      this.enemies.push(enemy);
    }
    for (const spawn of this.sector.droneSpawns) {
      const drone = spawnDart({
        pos: v3(spawn.pos.x, spawn.pos.y, spawn.pos.z),
        difficulty: this.difficulty,
        seed: spawn.seed,
        drone: true,
      });
      drone.state = 'approach';
      drone.detail = true;
      this.enemies.push(drone);
    }

    cell.visited = true;
    this.alert = this.liveEnemyCount() > 0;
    if (this.alert) this.audio.alert();

    this.syncUi({
      alert: this.alert,
      enemiesLeft: totalEnemies(this.galaxy) + this.liveEnemyCount(),
      basesLeft: aliveBases(this.galaxy).length,
    });
  }

  // -------------------------------------------------------------------------
  // Mission end and rank
  // -------------------------------------------------------------------------

  private checkMissionEnd(): void {
    if (this.mode === 'rank') return;

    if (this.player.energy <= 0) {
      this.finishMission('abort', 'ENERGY EXHAUSTED');
      return;
    }
    if (this.player.hull <= 0) {
      this.finishMission('destroyed', 'STARSHIP DESTROYED');
      return;
    }
    if (aliveBases(this.galaxy).length === 0) {
      this.finishMission('abort', 'ALL BASES LOST');
      return;
    }
    if (allEnemiesCleared(this.galaxy) && this.liveEnemyCount() === 0) {
      this.finishMission('success', 'MISSION COMPLETED');
    }
  }

  private finishMission(outcome: MissionStats['outcome'], reason: string): void {
    if (this.mode === 'rank') return;

    this.stats.outcome = outcome;
    this.stats.seconds = Math.round(this.stats.seconds);

    const m = this.difficulty.skillFactor * TUNING.score.outcome[outcome];
    const raw =
      m +
      TUNING.score.kills * this.stats.kills -
      this.stats.energyUsed / TUNING.score.energyDivisor -
      this.stats.seconds / TUNING.score.secondsDivisor -
      TUNING.score.baseLostPenalty * this.stats.basesLostToEnemy -
      TUNING.score.baseKilledPenalty * this.stats.basesYouKilled;

    const score = Math.max(0, Math.round(raw));
    const previousBest = this.bestScores[this.difficultyId] ?? null;
    const isPersonalBest = previousBest === null || score > previousBest;
    if (isPersonalBest) {
      this.bestScores[this.difficultyId] = score;
      saveJson(BEST_KEY, this.bestScores);
    }

    this.rankReason = reason;
    this.rankResult = {
      score,
      title: rankForScore(score),
      reason,
      difficulty: this.difficulty.label,
      previousBest,
      isPersonalBest,
      stats: { ...this.stats },
    };

    this.mode = 'rank';
    this.alert = false;
    this.input.releasePointerLock();
    this.syncUi({
      mode: 'rank',
      rank: this.rankResult,
      alert: false,
      missionActive: false,
      bestScores: { ...this.bestScores },
      reason,
    });
  }

  // -------------------------------------------------------------------------
  // Snapshots for the React panels
  // -------------------------------------------------------------------------

  private buildChartSnapshot(): ChartSnapshot {
    const galaxy = this.galaxy;
    const cells: ChartCellView[] = [];
    for (const cell of galaxy.cells) {
      const isPlayer = cell.x === galaxy.playerX && cell.y === galaxy.playerY;
      const plan = planWarp(galaxy, cell.x, cell.y, this.player.energy);
      cells.push({
        x: cell.x,
        y: cell.y,
        kind: cell.kind,
        enemies: isPlayer ? this.liveEnemyCount() : cell.enemies,
        base: cell.base,
        baseAlive: cell.baseAlive,
        surrounded: cell.surroundSeconds > 0,
        visited: cell.visited,
        isPlayer,
        cost: plan.cost,
        affordable: plan.affordable,
      });
    }

    const cursorIsPlayer = this.chartCursor.x === galaxy.playerX && this.chartCursor.y === galaxy.playerY;
    const plan = planWarp(galaxy, this.chartCursor.x, this.chartCursor.y, this.player.energy);
    const cursorCell = cellAt(galaxy, this.chartCursor.x, this.chartCursor.y);

    return {
      width: galaxy.width,
      height: galaxy.height,
      playerX: galaxy.playerX,
      playerY: galaxy.playerY,
      cursorX: this.chartCursor.x,
      cursorY: this.chartCursor.y,
      cells,
      plan: cursorIsPlayer
        ? null
        : {
            distance: plan.distance,
            cost: plan.cost,
            affordable: plan.affordable,
            label: describeCell(cursorCell),
          },
      energy: Math.round(this.player.energy),
      hostilesInSector: this.liveEnemyCount(),
      starDate: galaxy.starDate,
    };
  }

  private buildScanSnapshot(): ScanSnapshot {
    const scannerState = this.player.systems.scanner;
    const ghostChance =
      scannerState === 'dead'
        ? TUNING.scan.ghostChanceDead
        : scannerState === 'damaged'
          ? TUNING.scan.ghostChanceDamaged
          : 0;

    const contacts: ScanContact[] = [];
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      if (!enemy.detail && !enemy.drone && enemy.state === 'queue') continue;
      contacts.push({
        x: enemy.pos.x,
        y: enemy.pos.z,
        hostile: !enemy.drone,
        ghost: false,
        range: Math.hypot(enemy.pos.x, enemy.pos.y, enemy.pos.z),
      });
    }
    for (const asteroid of this.sector?.asteroids ?? []) {
      contacts.push({ x: asteroid.pos.x, y: asteroid.pos.z, hostile: false, ghost: false, range: 0 });
    }
    if (ghostChance > 0) {
      const ghosts = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < ghosts; i++) {
        if (Math.random() > ghostChance) continue;
        const angle = Math.random() * Math.PI * 2;
        const distance = 1200 + Math.random() * 7000;
        contacts.push({
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          hostile: Math.random() < 0.5,
          ghost: true,
          range: distance,
        });
      }
    }

    const base = this.currentBasePosition();
    return {
      contacts,
      range: TUNING.scan.range,
      base: base ? { x: base.x, y: base.z } : null,
      ghosts: ghostChance > 0,
      degraded: scannerState !== 'ok',
    };
  }

  private syncUi(patch: Partial<UiState>): void {
    this.state.set(patch);
  }

  private radio(text: string): void {
    this.message = text;
    this.messageTimer = MESSAGE_SECONDS;
    this.audio.radio();
    this.syncUi({ message: text });
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(240, Math.floor(rect.height));
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;

    this.renderer.resize(width, height, dpr);

    const canvas = this.hudCtx.canvas;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.hudSize = { width, height, dpr };
  }

  private drawHud(): void {
    const { width, height, dpr } = this.hudSize;
    const ctx = this.hudCtx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // No instruments before launch — the title screen is just the starfield.
    if (this.mode === 'title') {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const ui = this.state.get();
    const hud: HudState = {
      width,
      height,
      mode: this.mode,
      view: this.view,
      energy: this.player.energy,
      energyMax: TUNING.energy.start,
      hull: this.player.hull,
      speed: this.player.speed,
      targetSpeed: this.player.targetSpeed,
      shields: this.player.shields,
      systems: this.player.systems,
      computerOn: this.targeting.on,
      tracking: this.targeting.tracked && Boolean(this.targeting.target),
      alert: this.alert,
      alertPulse: this.alertPulse,
      hitFlash: this.hitFlash,
      message: this.message,
      prompt: this.currentPrompt(),
      atBoundary: this.boundaryFlash > 0.2,
      starDate: this.galaxy.starDate,
      sectorLabel: `SECTOR ${this.galaxy.playerX + 1}-${this.galaxy.playerY + 1}`,
      enemiesLeft: ui.enemiesLeft,
      basesLeft: ui.basesLeft,
      kills: this.stats.kills,
      contacts: this.buildContacts(),
      lockBox: this.buildLockBox(),
      dockBox: this.buildDockBox(),
      warp: this.warpState
        ? {
            gateX: this.warpState.gateX,
            gateY: this.warpState.gateY,
            aimX: this.warpState.aimX,
            aimY: this.warpState.aimY,
            aligned: this.warpState.aligned,
            secondsLeft: this.warpState.duration - this.warpState.elapsed,
            cost: this.warpState.cost,
            destination: `SECTOR ${this.warpState.toX + 1}-${this.warpState.toY + 1}`,
          }
        : null,
      showDebug: this.settings.showDebug,
      fps: this.fps,
      drawCalls: this.renderer.stats.drawCalls,
    };

    drawCockpit(ctx, hud);
    this.drawDamageMarks(ctx);
  }

  private currentPrompt(): string {
    if (this.mode === 'warp' && this.warpState) {
      return this.warpState.aligned ? 'HOLD WARP' : 'ALIGN NOSE PIP ON GATE';
    }
    if (this.mode === 'docked') return 'DOCKED — PRESS ANY KEY TO LAUNCH';
    if (this.dockState) {
      const base = this.currentBasePosition();
      if (base) {
        const delta = sub(this.scratch, base, this.player.pos);
        const range = Math.hypot(delta.x, delta.y, delta.z);
        const toward = normalize(this.scratch2, delta);
        return dockPrompt(
          this.dockState,
          dot(toward, this.player.heading) >= TUNING.base.acquireDot,
          range <= TUNING.base.dockRange,
        );
      }
    }
    if (this.mode === 'flying' && !this.input.pointerLocked) return 'CLICK FOR MOUSE AIM — ARROWS ALSO FLY';
    return '';
  }

  private buildContacts(): HudContact[] {
    const contacts: HudContact[] = [];
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      if (!enemy.detail && !enemy.drone && enemy.state === 'queue') continue;
      const rel = this.relativeToShip(enemy.pos);
      contacts.push({
        angle: rel.angle,
        elevation: rel.elevation,
        hostile: !enemy.drone,
        fore: rel.forward > 0,
        range: rel.range,
      });
    }
    const base = this.currentBasePosition();
    if (base) {
      const rel = this.relativeToShip(base);
      contacts.push({
        angle: rel.angle,
        elevation: rel.elevation,
        hostile: false,
        fore: rel.forward > 0,
        range: rel.range,
      });
    }
    return contacts;
  }

  private relativeToShip(pos: Vec3): { angle: number; elevation: number; forward: number; range: number } {
    const p = this.player;
    const dx = pos.x - p.pos.x;
    const dy = pos.y - p.pos.y;
    const dz = pos.z - p.pos.z;
    const forward = dx * p.heading.x + dy * p.heading.y + dz * p.heading.z;
    const side = dx * p.right.x + dy * p.right.y + dz * p.right.z;
    const up = dx * p.up.x + dy * p.up.y + dz * p.up.z;
    const range = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const perspective = Math.max(1, Math.abs(forward));
    return {
      angle: clamp(Math.atan2(side, perspective) / (Math.PI / 3), -1, 1),
      elevation: clamp(Math.atan2(up, perspective) / (Math.PI / 3), -1, 1),
      forward,
      range,
    };
  }

  private buildLockBox(): HudLockBox | null {
    const target = this.targeting.on ? this.targeting.target : null;
    if (!target || !target.active) return null;
    const projected = this.renderer.project(target.pos);
    const rel = this.relativeToShip(target.pos);
    return {
      x: projected.x,
      y: projected.y,
      locked: this.targeting.tracked,
      hostile: !target.drone,
      label: target.drone ? 'TRAINING DRONE' : 'VEYDrim DART',
      range: rel.range,
    };
  }

  private buildDockBox(): HudDockBox | null {
    if (!this.dockState) return null;
    const base = this.currentBasePosition();
    if (!base) return null;
    const projected = this.renderer.project(base);
    return {
      x: projected.x,
      y: projected.y,
      fill: this.dockState.fill,
      phase: this.dockState.phase,
    };
  }

  private drawDamageMarks(ctx: CanvasRenderingContext2D): void {
    if (this.marks.length === 0) return;
    const { width, height } = this.hudSize;
    ctx.save();
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    for (const mark of this.marks) {
      ctx.globalAlpha = Math.min(1, mark.life);
      ctx.fillStyle = mark.hostile ? '#ff8a6a' : '#7dffb0';
      ctx.fillText(mark.text, width / 2 + mark.x * (width / 2), height / 2 - mark.y * (height / 2));
    }
    ctx.restore();
  }

  /**
   * Verification hooks. Never called by gameplay — the smoke test uses them to
   * reproduce the human motions (aim at the base, take the killing hits)
   * deterministically instead of hoping an AI dart cooperates.
   */
  debugDamage(): void {
    if (this.mode !== 'flying') return;
    this.damagePlayer(false);
  }

  /** Aim the nose straight at the friendly base, if one is in this sector. */
  debugSteerToBase(): boolean {
    const base = this.currentBasePosition();
    if (!base || (this.mode !== 'flying' && this.mode !== 'docking')) return false;
    const dir = normalize(v3(), sub(this.scratch, base, this.player.pos));
    this.player.yaw = Math.atan2(dir.x, -dir.z);
    this.player.pitch = Math.asin(clamp(dir.y, -1, 1));
    return true;
  }

  /** Read-only view of internal state, for the debug readout and smoke tests. */
  get debugInfo() {
    return {
      mode: this.mode,
      paused: this.paused,
      view: this.view,
      enemies: this.liveEnemyCount(),
      drones: this.enemies.filter(e => e.active && e.drone).length,
      asteroids: this.sector?.asteroids.length ?? 0,
      bolts: this.pool.countActive(true) + this.pool.countActive(false),
      player: {
        energy: Math.round(this.player.energy),
        hull: Math.round(this.player.hull),
        speed: Number(this.player.speed.toFixed(2)),
        systems: this.player.systems,
        pos: {
          x: Math.round(this.player.pos.x),
          y: Math.round(this.player.pos.y),
          z: Math.round(this.player.pos.z),
        },
      },
      stats: { ...this.stats },
      dock: this.dockState ? this.dockState.phase : null,
      basePos: this.currentBasePosition(),
      galaxy: {
        width: this.galaxy.width,
        height: this.galaxy.height,
        totalEnemies: totalEnemies(this.galaxy),
        bases: aliveBases(this.galaxy).length,
        starDate: this.galaxy.starDate,
        playerCell: { x: this.galaxy.playerX, y: this.galaxy.playerY },
      },
      renderer: this.renderer.stats,
    };
  }
}

function describeCell(cell: GalaxyCell | null): string {
  if (!cell) return 'UNKNOWN';
  if (cell.base && cell.baseAlive) {
    return cell.enemies > 0 || cell.surroundSeconds > 0 ? 'HELION BASE (CONTESTED)' : 'HELION BASE';
  }
  if (cell.base && !cell.baseAlive) return 'DESTROYED BASE';
  if (cell.enemies >= 4) return 'VEYDrim FLEET';
  if (cell.enemies === 3) return 'VEYDrim TASK FORCE';
  if (cell.enemies === 2) return 'VEYDrim PATROL';
  if (cell.kind === 'asteroids') return 'ASTEROID FIELD';
  return 'EMPTY SPACE';
}

function EMPTY_INPUT(): FrameInput {
  return {
    pitch: 0,
    yaw: 0,
    speedDelta: 0,
    setSpeed: null,
    fire: false,
    warpHeld: false,
    mouseDx: 0,
    mouseDy: 0,
    commands: new Set(),
    pointerLocked: false,
    gamepad: false,
  };
}
