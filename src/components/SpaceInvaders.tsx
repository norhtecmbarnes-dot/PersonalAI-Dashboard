'use client';

import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const W = 800;
const H = 560;
const COLS = 10;
const ROWS = 5;
const ALIEN_W = 34;
const ALIEN_H = 26;
const SPACING_X = 46;
const SPACING_Y = 38;
const ALIEN_TOP = 70;
const PLAYER_W = 44;
const PLAYER_Y = H - 56;
const SPR_W = 33; // sprite content width at scale 3 (11px * 3)
const SPR_H = 24; // sprite content height at scale 3 (8px * 3)
const SPR_PAD = 10; // glow padding baked into sprite canvases
const HIGH_SCORE_KEY = 'neon-invaders-highscore';

const ALIEN_COLORS = {
  crab: '#ff00ea',
  octopus: '#00e5ff',
  squid: '#39ff14',
} as const;

// Row scores from top to bottom (classic Space Invaders values)
const ROW_SCORES = [30, 30, 20, 20, 10];

const MYSTERY_VALUES = [100, 150, 200, 250, 300];

const BUNKER_CELL = 4;
const BUNKER_COLS = 20;
const BUNKER_ROWS = 13;
const BUNKER_MASK = [
  '...XXXXXXXXXXXXXX...',
  '..XXXXXXXXXXXXXXXX..',
  '.XXXXXXXXXXXXXXXXXX.',
  'XXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXX',
];

// Two animation frames per alien type (legs in / legs out)
const SPRITES: Record<'crab' | 'octopus' | 'squid', [string[], string[]]> = {
  crab: [
    [
      '..X.....X..',
      '...X...X...',
      '..XXXXXXX..',
      '.XX.XXX.XX.',
      'XXXXXXXXXXX',
      'X.XXXXXXX.X',
      'X.X.....X.X',
      '...XX.XX...',
    ],
    [
      '..X.....X..',
      '...X...X...',
      '..XXXXXXX..',
      '.XX.XXX.XX.',
      'XXXXXXXXXXX',
      'X.XXXXXXX.X',
      'X.X.....X.X',
      'XX..XXX..XX',
    ],
  ],
  octopus: [
    [
      '....XXXX....',
      '.XXXXXXXXXX.',
      'XXXXXXXXXXXX',
      'XXX..XX..XXX',
      'XXXXXXXXXXXX',
      '...XX..XX...',
      '..XX.XX.XX..',
      'XX........XX',
    ],
    [
      '....XXXX....',
      '.XXXXXXXXXX.',
      'XXXXXXXXXXXX',
      'XXX..XX..XXX',
      'XXXXXXXXXXXX',
      '...XX..XX...',
      '..XX.XX.XX..',
      'X..........X',
    ],
  ],
  squid: [
    [
      '.....XX.....',
      '....XXXX....',
      '.XXXXXXXXXX.',
      'XXXXXXXXXXXX',
      'XXX.XXXX.XXX',
      'XXXXXXXXXXXX',
      '...XX..XX...',
      '..XX....XX..',
    ],
    [
      '.....XX.....',
      '....XXXX....',
      '.XXXXXXXXXX.',
      'XXXXXXXXXXXX',
      'XXX.XXXX.XXX',
      'XXXXXXXXXXXX',
      '...XX..XX...',
      '.XX......XX.',
    ],
  ],
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AlienType = 'crab' | 'octopus' | 'squid';
type Status = 'idle' | 'playing' | 'paused' | 'over';

interface Alien {
  x: number;
  y: number;
  row: number;
  type: AlienType;
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  dead?: boolean;
}

interface MysteryShip {
  x: number;
  y: number;
  dir: number;
  value: number;
  anim: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
}

interface Bunker {
  x: number;
  y: number;
  w: number;
  h: number;
  cells: boolean[][];
  dirty: boolean;
  canvas: HTMLCanvasElement;
}

interface Banner {
  text: string;
  color: string;
  until: number;
}

interface Game {
  status: Status;
  score: number;
  highScore: number;
  lives: number;
  level: number;
  aliens: Alien[];
  alienDir: 1 | -1;
  alienAnim: number;
  playerX: number;
  bullets: Bullet[];
  alienBullets: Bullet[];
  mystery: MysteryShip | null;
  nextMysteryAt: number;
  bunkers: Bunker[];
  particles: Particle[];
  keys: Set<string>;
  shootTimer: number;
  invulnUntil: number;
  shake: number;
  alienFireTimer: number;
  levelClearAt: number | null;
  banner: Banner | null;
  stars: Star[];
  lastT: number;
}

interface Hud {
  score: number;
  highScore: number;
  lives: number;
  level: number;
  status: Status;
}

interface Api {
  start: () => void;
  restart: () => void;
  togglePause: () => void;
  toggleMute: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = () => performance.now() / 1000;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

function createGame(): Game {
  const stars: Star[] = [];
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: rand(0.5, 1.8),
      phase: Math.random() * Math.PI * 2,
      speed: rand(0.5, 2),
    });
  }
  return {
    status: 'idle',
    score: 0,
    highScore: 0,
    lives: 3,
    level: 1,
    aliens: [],
    alienDir: 1,
    alienAnim: 0,
    playerX: W / 2 - PLAYER_W / 2,
    bullets: [],
    alienBullets: [],
    mystery: null,
    nextMysteryAt: 0,
    bunkers: [],
    particles: [],
    keys: new Set<string>(),
    shootTimer: 0,
    invulnUntil: 0,
    shake: 0,
    alienFireTimer: 1.5,
    levelClearAt: null,
    banner: null,
    stars,
    lastT: 0,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SpaceInvaders() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game>(createGame());
  const apiRef = useRef<Api | null>(null);
  const mutedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const spriteCacheRef = useRef<
    Record<AlienType, { a: HTMLCanvasElement; b: HTMLCanvasElement }>
  >({} as Record<AlienType, { a: HTMLCanvasElement; b: HTMLCanvasElement }>);
  const mysterySpriteRef = useRef<HTMLCanvasElement | null>(null);

  const [hud, setHud] = useState<Hud>({
    score: 0,
    highScore: 0,
    lives: 3,
    level: 1,
    status: 'idle',
  });
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawCtx = canvas.getContext('2d');
    if (!rawCtx) return;
    const ctx = rawCtx;

    const g = gameRef.current;

    // Load persisted high score
    try {
      const saved = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
      if (saved > 0) g.highScore = saved;
    } catch {
      /* ignore */
    }

    // -----------------------------------------------------------------------
    // Sprite pre-rendering (bakes glow in, keeps per-frame drawing cheap)
    // -----------------------------------------------------------------------

    function buildSprite(rows: string[], color: string, glow: number): HTMLCanvasElement {
      const w = rows[0].length * 3;
      const h = rows.length * 3;
      const c = document.createElement('canvas');
      c.width = w + SPR_PAD * 2;
      c.height = h + SPR_PAD * 2;
      const cctx = c.getContext('2d');
      if (!cctx) return c;
      cctx.shadowColor = color;
      cctx.shadowBlur = glow;
      cctx.fillStyle = color;
      for (let r = 0; r < rows.length; r++) {
        for (let col = 0; col < rows[r].length; col++) {
          if (rows[r][col] === 'X') cctx.fillRect(SPR_PAD + col * 3, SPR_PAD + r * 3, 3, 3);
        }
      }
      // Bright core pass
      cctx.shadowBlur = 0;
      for (let r = 0; r < rows.length; r++) {
        for (let col = 0; col < rows[r].length; col++) {
          if (rows[r][col] === 'X') cctx.fillRect(SPR_PAD + col * 3, SPR_PAD + r * 3, 3, 3);
        }
      }
      return c;
    }

    const types: AlienType[] = ['crab', 'octopus', 'squid'];
    for (const t of types) {
      spriteCacheRef.current[t] = {
        a: buildSprite(SPRITES[t][0], ALIEN_COLORS[t], 10),
        b: buildSprite(SPRITES[t][1], ALIEN_COLORS[t], 10),
      };
    }
    mysterySpriteRef.current = buildSprite(
      ['....XXXX....', '..XXXXXXXX..', '.XXXXXXXXXX.', 'XXXXXXXXXXXX', '.XX.XXXX.XX.', '..XX....XX..'],
      '#ffe600',
      12
    );

    // -----------------------------------------------------------------------
    // Audio
    // -----------------------------------------------------------------------

    function ensureAudio(): AudioContext | null {
      if (typeof window === 'undefined') return null;
      if (!audioRef.current) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        audioRef.current = new AC();
      }
      if (audioRef.current.state === 'suspended') {
        void audioRef.current.resume();
      }
      return audioRef.current;
    }

    function tone(
      freq: number,
      dur: number,
      type: OscillatorType = 'square',
      vol = 0.06,
      slideTo?: number
    ) {
      if (mutedRef.current) return;
      const ac = ensureAudio();
      if (!ac) return;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), ac.currentTime + dur);
      }
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + dur);
    }

    const sfxShoot = () => tone(880, 0.09, 'square', 0.035, 220);
    const sfxInvader = () => tone(200, 0.12, 'square', 0.05, 70);
    const sfxExplosion = () => tone(110, 0.35, 'sawtooth', 0.07, 35);
    const sfxPlayerHit = () => tone(180, 0.5, 'sawtooth', 0.09, 30);
    const sfxMystery = () => {
      tone(600, 0.09, 'square', 0.045);
      setTimeout(() => tone(900, 0.09, 'square', 0.045), 90);
      setTimeout(() => tone(1200, 0.12, 'square', 0.045), 180);
    };
    const sfxLevelUp = () => {
      const notes = [523, 659, 784, 1046];
      notes.forEach((n, i) => setTimeout(() => tone(n, 0.14, 'square', 0.05), i * 110));
    };

    // -----------------------------------------------------------------------
    // Game setup
    // -----------------------------------------------------------------------

    function banner(text: string, color: string, dur: number) {
      g.banner = { text, color, until: now() + dur };
    }

    function initBunkers() {
      const bw = BUNKER_COLS * BUNKER_CELL;
      const bh = BUNKER_ROWS * BUNKER_CELL;
      const margin = (W - 4 * bw) / 5;
      g.bunkers = [];
      for (let i = 0; i < 4; i++) {
        const cells = BUNKER_MASK.map(row => row.split('').map(ch => ch === 'X'));
        const b: Bunker = {
          x: margin + i * (bw + margin),
          y: H - 170,
          w: bw,
          h: bh,
          cells,
          dirty: true,
          canvas: document.createElement('canvas'),
        };
        g.bunkers.push(b);
      }
    }

    function resetWave(level: number) {
      g.level = level;
      const left = (W - (COLS - 1) * SPACING_X - ALIEN_W) / 2;
      g.aliens = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          g.aliens.push({
            x: left + c * SPACING_X,
            y: ALIEN_TOP + r * SPACING_Y,
            row: r,
            type: r < 2 ? 'crab' : r < 4 ? 'octopus' : 'squid',
            alive: true,
          });
        }
      }
      g.alienDir = 1;
      g.bullets = [];
      g.alienBullets = [];
      g.mystery = null;
      g.particles = [];
      g.playerX = W / 2 - PLAYER_W / 2;
      g.invulnUntil = now() + 1.5;
      g.alienFireTimer = 1.5;
      g.nextMysteryAt = now() + rand(12, 20);
      g.shake = 0;
      g.levelClearAt = null;
      initBunkers();
      syncHud();
    }

    function startGame() {
      g.score = 0;
      g.lives = 3;
      g.status = 'playing';
      resetWave(1);
      banner('GET READY', '#00e5ff', 1.6);
      ensureAudio();
      syncHud();
    }

    function restartGame() {
      startGame();
    }

    function togglePause() {
      if (g.status === 'playing') {
        g.status = 'paused';
      } else if (g.status === 'paused') {
        g.status = 'playing';
        g.lastT = now();
      }
      syncHud();
    }

    apiRef.current = { start: startGame, restart: restartGame, togglePause, toggleMute };

    function toggleMute() {
      mutedRef.current = !mutedRef.current;
      setMuted(mutedRef.current);
    }

    // -----------------------------------------------------------------------
    // Bunker helpers
    // -----------------------------------------------------------------------

    function damageBunker(b: Bunker, px: number, py: number) {
      const cx = Math.floor((px - b.x) / BUNKER_CELL);
      const cy = Math.floor((py - b.y) / BUNKER_CELL);
      let changed = false;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (
            nx >= 0 &&
            nx < BUNKER_COLS &&
            ny >= 0 &&
            ny < BUNKER_ROWS &&
            b.cells[ny][nx] &&
            dx * dx + dy * dy <= 4
          ) {
            b.cells[ny][nx] = false;
            changed = true;
          }
        }
      }
      if (changed) b.dirty = true;
    }

    function hitBunker(b: Bunker, bx: number, by: number): boolean {
      if (bx >= b.x && bx <= b.x + b.w && by >= b.y && by <= b.y + b.h) {
        const cx = Math.floor((bx - b.x) / BUNKER_CELL);
        const cy = Math.floor((by - b.y) / BUNKER_CELL);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < BUNKER_COLS && ny >= 0 && ny < BUNKER_ROWS && b.cells[ny][nx]) {
              damageBunker(b, bx, by);
              return true;
            }
          }
        }
      }
      return false;
    }

    function eatBunker(b: Bunker, ax: number, ay: number) {
      const x0 = Math.max(0, Math.floor((ax - b.x) / BUNKER_CELL));
      const x1 = Math.min(BUNKER_COLS - 1, Math.floor((ax + ALIEN_W - b.x) / BUNKER_CELL));
      const y0 = Math.max(0, Math.floor((ay - b.y) / BUNKER_CELL));
      const y1 = Math.min(BUNKER_ROWS - 1, Math.floor((ay + ALIEN_H - b.y) / BUNKER_CELL));
      let changed = false;
      for (let ny = y0; ny <= y1; ny++) {
        for (let nx = x0; nx <= x1; nx++) {
          if (b.cells[ny][nx]) {
            b.cells[ny][nx] = false;
            changed = true;
          }
        }
      }
      if (changed) b.dirty = true;
    }

    function renderBunker(b: Bunker) {
      const c = b.canvas;
      c.width = b.w + 8;
      c.height = b.h + 8;
      const cctx = c.getContext('2d');
      if (!cctx) return;
      cctx.clearRect(0, 0, c.width, c.height);
      cctx.shadowColor = '#39ff14';
      cctx.shadowBlur = 5;
      cctx.fillStyle = '#39ff14';
      for (let r = 0; r < BUNKER_ROWS; r++) {
        for (let col = 0; col < BUNKER_COLS; col++) {
          if (b.cells[r][col]) cctx.fillRect(4 + col * BUNKER_CELL, 4 + r * BUNKER_CELL, BUNKER_CELL, BUNKER_CELL);
        }
      }
      cctx.shadowBlur = 0;
    }

    // -----------------------------------------------------------------------
    // Combat helpers
    // -----------------------------------------------------------------------

    function spawnParticles(x: number, y: number, color: string, count: number) {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = rand(40, 190);
        g.particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 40,
          life: rand(0.3, 0.8),
          maxLife: 0.8,
          color,
          size: rand(1.5, 3.5),
        });
      }
      if (g.particles.length > 260) g.particles.splice(0, g.particles.length - 260);
    }

    function persistHigh() {
      try {
        localStorage.setItem(HIGH_SCORE_KEY, String(g.highScore));
      } catch {
        /* ignore */
      }
    }

    function hitPlayer() {
      g.lives -= 1;
      g.shake = 0.35;
      spawnParticles(g.playerX + PLAYER_W / 2, PLAYER_Y + 12, '#00e5ff', 26);
      sfxPlayerHit();
      g.alienBullets = [];
      if (g.lives <= 0) {
        g.status = 'over';
        persistHigh();
      } else {
        g.playerX = W / 2 - PLAYER_W / 2;
        g.invulnUntil = now() + 1.5;
      }
      syncHud();
    }

    // -----------------------------------------------------------------------
    // Update
    // -----------------------------------------------------------------------

    function update(dt: number) {
      const t = now();

      // Level transition
      if (g.levelClearAt !== null && t >= g.levelClearAt) {
        g.levelClearAt = null;
        resetWave(g.level + 1);
        banner(`LEVEL ${g.level}`, '#39ff14', 1.5);
      }

      // Mystery ship
      if (t >= g.nextMysteryAt && !g.mystery) {
        const dir = Math.random() < 0.5 ? 1 : -1;
        g.mystery = {
          x: dir === 1 ? -60 : W + 60,
          y: 44,
          dir,
          value: MYSTERY_VALUES[Math.floor(Math.random() * MYSTERY_VALUES.length)],
          anim: 0,
        };
        g.nextMysteryAt = t + rand(18, 28);
      }
      if (g.mystery) {
        const m = g.mystery;
        m.x += m.dir * 120 * dt;
        m.anim += dt;
        if ((m.dir === 1 && m.x > W + 60) || (m.dir === -1 && m.x < -60)) g.mystery = null;
      }

      // Player movement
      const left = g.keys.has('ArrowLeft') || g.keys.has('a') ? 1 : 0;
      const right = g.keys.has('ArrowRight') || g.keys.has('d') ? 1 : 0;
      g.playerX = clamp(g.playerX + (right - left) * 340 * dt, 12, W - PLAYER_W - 12);

      // Player shooting (hold to autofire)
      if (g.keys.has(' ') || g.keys.has('ArrowUp')) {
        g.shootTimer -= dt;
        if (g.shootTimer <= 0) {
          g.bullets.push({ x: g.playerX + PLAYER_W / 2 - 2, y: PLAYER_Y - 14, vy: -620 });
          g.shootTimer = 0.28;
          sfxShoot();
        }
      }

      // Alien formation movement
      const totalAliens = g.aliens.length;
      const alive = g.aliens.filter(a => a.alive);

      if (alive.length > 0) {
        const missingRatio = (totalAliens - alive.length) / totalAliens;
        const speed = (26 + g.level * 10 + missingRatio * 90) * dt;
        g.alienAnim += speed;
        let hitEdge = false;
        for (const a of alive) {
          a.x += g.alienDir * speed;
          if (a.x < 8 || a.x + ALIEN_W > W - 8) hitEdge = true;
        }
        if (hitEdge) {
          g.alienDir = g.alienDir === 1 ? -1 : 1;
          for (const a of alive) a.y += 22;
        }

        // Aliens eat bunkers on contact
        for (const a of alive) {
          for (const b of g.bunkers) {
            if (
              a.y + ALIEN_H > b.y &&
              a.y < b.y + b.h &&
              a.x + ALIEN_W > b.x &&
              a.x < b.x + b.w
            ) {
              eatBunker(b, a.x, a.y);
            }
          }
        }

        // Aliens reaching the player line = game over
        for (const a of alive) {
          if (a.y + ALIEN_H >= PLAYER_Y - 6) {
            g.status = 'over';
            g.shake = 0.5;
            sfxExplosion();
            persistHigh();
            syncHud();
            return;
          }
        }

        // Alien fire (bottom-most alien of a random occupied column)
        g.alienFireTimer -= dt;
        if (g.alienFireTimer <= 0) {
          const minX = Math.min(...alive.map(a => a.x));
          const byCol = new Map<number, Alien>();
          for (const a of alive) {
            const col = Math.round((a.x - minX) / SPACING_X);
            const cur = byCol.get(col);
            if (!cur || a.y > cur.y) byCol.set(col, a);
          }
          const shooters = [...byCol.values()];
          const shooter = shooters[Math.floor(Math.random() * shooters.length)];
          g.alienBullets.push({
            x: shooter.x + ALIEN_W / 2 - 2,
            y: shooter.y + ALIEN_H,
            vy: 200 + Math.random() * 120 + g.level * 12,
          });
          g.alienFireTimer = (0.6 + Math.random() * 1.0) * Math.max(alive.length / totalAliens, 0.25);
        }
      }

      // Player bullets
      for (const b of g.bullets) b.y += b.vy * dt;
      g.bullets = g.bullets.filter(b => b.y > -16);

      // Alien bullets
      for (const b of g.alienBullets) b.y += b.vy * dt;
      g.alienBullets = g.alienBullets.filter(b => b.y < H + 16);

      // Player bullets vs aliens
      const kills = new Set<Alien>();
      for (const b of g.bullets) {
        for (const a of alive) {
          if (
            !kills.has(a) &&
            a.x < b.x + 6 &&
            a.x + ALIEN_W > b.x &&
            a.y < b.y + 14 &&
            a.y + ALIEN_H > b.y
          ) {
            kills.add(a);
            spawnParticles(a.x + ALIEN_W / 2, a.y + ALIEN_H / 2, ALIEN_COLORS[a.type], 12);
            g.score += ROW_SCORES[a.row];
            if (g.score > g.highScore) {
              g.highScore = g.score;
              persistHigh();
            }
            sfxInvader();
            b.dead = true;
            break;
          }
        }
      }
      for (const a of kills) a.alive = false;

      // Player bullets vs mystery ship
      if (g.mystery) {
        for (const b of g.bullets) {
          if (
            !b.dead &&
            g.mystery.x < b.x &&
            g.mystery.x + 56 > b.x &&
            g.mystery.y < b.y &&
            g.mystery.y + 22 > b.y
          ) {
            g.score += g.mystery.value;
            if (g.score > g.highScore) {
              g.highScore = g.score;
              persistHigh();
            }
            spawnParticles(g.mystery.x + 28, g.mystery.y + 12, '#ffe600', 18);
            banner(`+${g.mystery.value}`, '#ffe600', 1);
            sfxMystery();
            g.mystery = null;
            b.dead = true;
            break;
          }
        }
      }
      g.bullets = g.bullets.filter(b => !b.dead);

      // Bullets vs bunkers
      for (const b of g.bullets) {
        for (const bunk of g.bunkers) {
          if (hitBunker(bunk, b.x, b.y)) {
            b.dead = true;
            break;
          }
        }
      }
      g.bullets = g.bullets.filter(b => !b.dead);
      for (const b of g.alienBullets) {
        for (const bunk of g.bunkers) {
          if (hitBunker(bunk, b.x, b.y)) {
            b.dead = true;
            break;
          }
        }
      }
      g.alienBullets = g.alienBullets.filter(b => !b.dead);

      // Opposing bullets cancel each other out
      const canceled = new Set<Bullet>();
      for (const pb of g.bullets) {
        for (const ab of g.alienBullets) {
          if (Math.abs(pb.x - ab.x) < 8 && Math.abs(pb.y - ab.y) < 14) {
            canceled.add(pb);
            canceled.add(ab);
            spawnParticles(pb.x, pb.y, '#ff2d95', 4);
            break;
          }
        }
      }
      g.bullets = g.bullets.filter(b => !canceled.has(b));
      g.alienBullets = g.alienBullets.filter(b => !canceled.has(b));

      // Alien bullets vs player
      if (t >= g.invulnUntil) {
        for (const b of g.alienBullets) {
          if (b.x > g.playerX - 4 && b.x < g.playerX + PLAYER_W + 4 && b.y + 12 > PLAYER_Y && b.y < PLAYER_Y + 26) {
            hitPlayer();
            b.dead = true;
            break;
          }
        }
      }
      g.alienBullets = g.alienBullets.filter(b => !b.dead);

      // Wave cleared
      if (g.aliens.every(a => !a.alive) && g.levelClearAt === null) {
        g.levelClearAt = t + 2;
        banner('LEVEL CLEAR!', '#39ff14', 2);
        sfxLevelUp();
      }

      // Particles
      for (const p of g.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 60 * dt;
        p.life -= dt;
      }
      g.particles = g.particles.filter(p => p.life > 0);

      // Screen shake decay
      if (g.shake > 0) g.shake -= dt;

      syncHud();
    }

    // -----------------------------------------------------------------------
    // Draw
    // -----------------------------------------------------------------------

    function draw() {
      const t = now();

      // Background
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#050014');
      bg.addColorStop(1, '#0b0530');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(90, 40, 220, 0.10)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Twinkling stars
      for (const s of g.stars) {
        const a = 0.25 + 0.75 * Math.abs(Math.sin(t * s.speed + s.phase));
        ctx.globalAlpha = a;
        ctx.fillStyle = '#cfd8ff';
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
      ctx.globalAlpha = 1;

      ctx.save();
      if (g.shake > 0) {
        ctx.translate(rand(-g.shake * 14, g.shake * 14), rand(-g.shake * 14, g.shake * 14));
      }

      // Danger line at player row
      ctx.save();
      ctx.shadowColor = '#ff2d95';
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(255, 45, 149, 0.35)';
      ctx.fillRect(0, PLAYER_Y + 26, W, 2);
      ctx.restore();

      // Bunkers
      for (const b of g.bunkers) {
        if (b.dirty) {
          renderBunker(b);
          b.dirty = false;
        }
        ctx.drawImage(b.canvas, b.x - 4, b.y - 4);
      }

      // Mystery ship
      if (g.mystery && mysterySpriteRef.current) {
        const m = g.mystery;
        ctx.drawImage(mysterySpriteRef.current, m.x, m.y);
        if (Math.floor(m.anim * 6) % 2 === 0) {
          ctx.save();
          ctx.shadowColor = '#ff2d95';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#ff2d95';
          ctx.fillRect(m.x + 14, m.y + 17, 4, 4);
          ctx.fillRect(m.x + 36, m.y + 17, 4, 4);
          ctx.restore();
        }
      }

      // Aliens
      const frame = Math.floor(t * 2.5) % 2;
      for (const a of g.aliens) {
        if (!a.alive) continue;
        const spr = frame === 0 ? spriteCacheRef.current[a.type].a : spriteCacheRef.current[a.type].b;
        ctx.drawImage(spr, a.x + (ALIEN_W - SPR_W) / 2 - SPR_PAD, a.y + (ALIEN_H - SPR_H) / 2 - SPR_PAD);
      }

      // Player bullets
      ctx.save();
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#eaffff';
      for (const b of g.bullets) ctx.fillRect(b.x, b.y, 4, 12);
      ctx.restore();

      // Alien bullets
      ctx.save();
      ctx.shadowColor = '#ff2d95';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffb3d9';
      for (const b of g.alienBullets) {
        ctx.fillRect(b.x, b.y, 4, 12);
        ctx.fillStyle = 'rgba(255, 45, 149, 0.35)';
        ctx.fillRect(b.x - 1, b.y + 10, 6, 10);
        ctx.fillStyle = '#ffb3d9';
      }
      ctx.restore();

      // Player ship
      if (g.status !== 'idle' && g.status !== 'over') {
        const blink = t < g.invulnUntil && Math.floor(t * 10) % 2 === 0;
        if (!blink) {
          const cx = g.playerX + PLAYER_W / 2;
          ctx.save();
          ctx.shadowColor = '#00e5ff';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#00e5ff';
          ctx.beginPath();
          ctx.moveTo(cx, PLAYER_Y);
          ctx.lineTo(cx - 16, PLAYER_Y + 12);
          ctx.lineTo(cx - 10, PLAYER_Y + 14);
          ctx.lineTo(cx - 10, PLAYER_Y + 24);
          ctx.lineTo(cx + 10, PLAYER_Y + 24);
          ctx.lineTo(cx + 10, PLAYER_Y + 14);
          ctx.lineTo(cx + 16, PLAYER_Y + 12);
          ctx.closePath();
          ctx.fill();
          // Cockpit
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx - 3, PLAYER_Y + 4, 6, 8);
          // Thruster
          const flame = 4 + Math.random() * 7;
          ctx.shadowColor = '#ff9f1c';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#ff9f1c';
          ctx.beginPath();
          ctx.moveTo(cx - 6, PLAYER_Y + 24);
          ctx.lineTo(cx + 6, PLAYER_Y + 24);
          ctx.lineTo(cx, PLAYER_Y + 24 + flame);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      // Particles
      for (const p of g.particles) {
        const a = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      ctx.restore();

      // Banner
      if (g.banner && t < g.banner.until) {
        const a = 0.55 + 0.45 * Math.abs(Math.sin(t * 6));
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = 'bold 40px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = g.banner.color;
        ctx.shadowBlur = 24;
        ctx.fillStyle = g.banner.color;
        ctx.fillText(g.banner.text, W / 2, H / 2 - 60);
        ctx.restore();
      }
    }

    // -----------------------------------------------------------------------
    // HUD sync
    // -----------------------------------------------------------------------

    let lastHud: Hud | null = null;
    function syncHud() {
      const next: Hud = {
        score: g.score,
        highScore: g.highScore,
        lives: g.lives,
        level: g.level,
        status: g.status,
      };
      if (
        lastHud &&
        lastHud.score === next.score &&
        lastHud.highScore === next.highScore &&
        lastHud.lives === next.lives &&
        lastHud.level === next.level &&
        lastHud.status === next.status
      ) {
        return;
      }
      lastHud = next;
      setHud(next);
    }

    // -----------------------------------------------------------------------
    // Input
    // -----------------------------------------------------------------------

    function onKeyDown(e: KeyboardEvent) {
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
      }
      g.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      if (e.key === 'Enter') {
        if (g.status === 'idle' || g.status === 'over') startGame();
        else if (g.status === 'paused') togglePause();
      }
      if (e.key.toLowerCase() === 'p') togglePause();
      if (e.key.toLowerCase() === 'm') toggleMute();
    }

    function onKeyUp(e: KeyboardEvent) {
      g.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    }

    function onVisibilityChange() {
      if (document.hidden) {
        g.keys.clear();
        if (g.status === 'playing') togglePause();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // -----------------------------------------------------------------------
    // Main loop
    // -----------------------------------------------------------------------

    let raf = 0;
    const loop = (ms: number) => {
      const t = ms / 1000;
      const dt = Math.min(t - g.lastT, 0.05);
      g.lastT = t;
      if (g.status === 'playing') update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };
    g.lastT = now();
    raf = requestAnimationFrame(loop);

    syncHud();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const neonText = (color: string, blur = 12) => ({
    color,
    textShadow: `0 0 ${blur}px ${color}, 0 0 ${blur * 2}px ${color}`,
  });

  const btn =
    'px-4 py-2 rounded-md border font-mono text-sm tracking-wider transition-all ' +
    'border-cyan-400/60 text-cyan-300 hover:bg-cyan-400/10 hover:shadow-[0_0_14px_rgba(0,229,255,0.45)] ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none';

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      {/* Title */}
      <div className="text-center">
        <h1
          className="font-mono text-4xl md:text-5xl font-bold tracking-[0.2em]"
          style={neonText('#00e5ff', 16)}
        >
          NEON INVADERS
        </h1>
        <p className="font-mono text-xs text-slate-400 mt-2 tracking-widest">
          DEFEND THE GRID · SCORE BIG · SURVIVE THE WAVES
        </p>
      </div>

      {/* HUD */}
      <div className="w-full max-w-[800px] flex items-center justify-between font-mono text-sm px-2">
        <div className="flex flex-col items-start gap-1">
          <span className="text-slate-500 text-[10px] tracking-widest">SCORE</span>
          <span className="text-2xl font-bold" style={neonText('#ff00ea')}>
            {String(hud.score).padStart(6, '0')}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-slate-500 text-[10px] tracking-widest">HI-SCORE</span>
          <span className="text-2xl font-bold" style={neonText('#ffe600')}>
            {String(hud.highScore).padStart(6, '0')}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-slate-500 text-[10px] tracking-widest">
            LEVEL {hud.level}
          </span>
          <span className="flex items-center gap-1.5">
            {Array.from({ length: Math.max(hud.lives, 0) }).map((_, i) => (
              <svg key={i} width="16" height="16" viewBox="0 0 20 20" fill="#00e5ff">
                <polygon points="10,2 4,12 7,12 7,18 13,18 13,12 16,12" />
              </svg>
            ))}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full max-w-[800px] aspect-[10/7] rounded-lg overflow-hidden border border-purple-500/40 shadow-[0_0_40px_rgba(120,60,255,0.35),inset_0_0_60px_rgba(30,10,80,0.6)]">
        <canvas ref={canvasRef} width={W} height={H} className="absolute inset-0 w-full h-full" />

        {/* Idle overlay */}
        {hud.status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/70 backdrop-blur-[2px]">
            <div
              className="font-mono text-5xl md:text-6xl font-bold tracking-[0.15em] animate-pulse"
              style={neonText('#ff00ea', 18)}
            >
              READY?
            </div>
            <div className="font-mono text-xs text-slate-400 tracking-widest text-center leading-relaxed">
              SHOOT THE INVADERS · DON&apos;T LET THEM REACH YOU
              <br />
              WATCH OUT FOR THE MYSTERY SHIP
            </div>
            <button
              onClick={() => apiRef.current?.start()}
              className="px-8 py-3 rounded-md border-2 border-cyan-400/80 font-mono font-bold tracking-[0.3em] text-cyan-300 hover:bg-cyan-400/10 hover:shadow-[0_0_24px_rgba(0,229,255,0.6)] transition-all animate-pulse"
            >
              START GAME
            </button>
            <div className="font-mono text-[10px] text-slate-500 tracking-widest">
              OR PRESS ENTER
            </div>
          </div>
        )}

        {/* Paused overlay */}
        {hud.status === 'paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/60 backdrop-blur-[2px]">
            <div
              className="font-mono text-4xl font-bold tracking-[0.3em]"
              style={neonText('#ffe600', 14)}
            >
              PAUSED
            </div>
            <button
              onClick={() => apiRef.current?.togglePause()}
              className="px-6 py-2 rounded-md border border-cyan-400/60 font-mono text-sm tracking-widest text-cyan-300 hover:bg-cyan-400/10"
            >
              RESUME
            </button>
          </div>
        )}

        {/* Game over overlay */}
        {hud.status === 'over' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/75 backdrop-blur-[2px]">
            <div
              className="font-mono text-5xl md:text-6xl font-bold tracking-[0.15em]"
              style={neonText('#ff2d95', 18)}
            >
              GAME OVER
            </div>
            <div className="font-mono text-sm text-slate-300 tracking-widest">
              FINAL SCORE{' '}
              <span className="font-bold" style={neonText('#ff00ea')}>
                {String(hud.score).padStart(6, '0')}
              </span>
            </div>
            {hud.score >= hud.highScore && hud.score > 0 && (
              <div
                className="font-mono text-xs tracking-[0.3em] animate-pulse"
                style={neonText('#ffe600')}
              >
                ★ NEW HIGH SCORE ★
              </div>
            )}
            <button
              onClick={() => apiRef.current?.restart()}
              className="px-8 py-3 rounded-md border-2 border-cyan-400/80 font-mono font-bold tracking-[0.3em] text-cyan-300 hover:bg-cyan-400/10 hover:shadow-[0_0_24px_rgba(0,229,255,0.6)] transition-all"
            >
              PLAY AGAIN
            </button>
            <div className="font-mono text-[10px] text-slate-500 tracking-widest">
              OR PRESS ENTER
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => apiRef.current?.togglePause()}
          disabled={hud.status !== 'playing' && hud.status !== 'paused'}
          className={btn}
        >
          {hud.status === 'paused' ? '▶ RESUME' : '❚❚ PAUSE'}
        </button>
        <button
          onClick={() => apiRef.current?.restart()}
          disabled={hud.status === 'idle'}
          className={btn}
        >
          ↻ RESTART
        </button>
        <button onClick={() => apiRef.current?.toggleMute()} className={btn}>
          {muted ? '🔇 SOUND OFF' : '🔊 SOUND ON'}
        </button>
      </div>

      {/* Key hints */}
      <div className="font-mono text-[10px] text-slate-500 tracking-widest text-center leading-relaxed pb-4">
        ← → / A D MOVE &nbsp;·&nbsp; SPACE SHOOT &nbsp;·&nbsp; P PAUSE &nbsp;·&nbsp; M MUTE
        &nbsp;·&nbsp; ENTER START
        <br />
        <span className="text-slate-600">
          CRAB 30 · OCTOPUS 20 · SQUID 10 · MYSTERY SHIP 100–300
        </span>
      </div>
    </div>
  );
}

export default SpaceInvaders;
