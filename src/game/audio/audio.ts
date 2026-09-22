/**
 * All sound is synthesized at runtime with the Web Audio API — no audio files
 * in the repo, nothing to license, nothing to download, and the engine hum can
 * track speed continuously instead of cross-fading samples.
 *
 * Browsers refuse to start audio without a user gesture, so `unlock()` must be
 * called from a real click or key press. Until then everything is a no-op.
 */

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private humGain: GainNode | null = null;
  private humOsc: OscillatorNode[] = [];
  private humFilter: BiquadFilterNode | null = null;
  private enabled = true;
  private started = false;
  private lastPhoton = 0;

  /** Call from inside a user-gesture handler. Safe to call repeatedly. */
  unlock(): void {
    if (this.started) {
      void this.ctx?.resume();
      return;
    }
    if (typeof window === 'undefined') return;

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    try {
      this.ctx = new Ctor();
    } catch {
      return;
    }

    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.5 : 0;
    this.master.connect(ctx.destination);

    // One second of white noise, reused by every percussive sound.
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;

    this.startHum();
    this.started = true;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(enabled ? 0.5 : 0, this.ctx.currentTime, 0.05);
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Cockpit hum: two detuned saws behind a lowpass, pitch and gain follow speed. */
  private startHum(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;

    this.humFilter = ctx.createBiquadFilter();
    this.humFilter.type = 'lowpass';
    this.humFilter.frequency.value = 340;
    this.humFilter.Q.value = 3;

    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0.0;

    for (const detune of [0, 7, -5]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 46 + detune;
      osc.detune.value = detune * 3;
      osc.connect(this.humFilter);
      osc.start();
      this.humOsc.push(osc);
    }

    this.humFilter.connect(this.humGain);
    this.humGain.connect(this.master);
  }

  setSpeed(speed: number, shields: boolean): void {
    if (!this.ctx || !this.humGain || !this.humFilter) return;
    const t = this.ctx.currentTime;
    const target = 0.05 + (speed / 9) * 0.16 + (shields ? 0.02 : 0);
    this.humGain.gain.setTargetAtTime(target, t, 0.12);
    this.humFilter.frequency.setTargetAtTime(320 + speed * 62, t, 0.15);
    for (let i = 0; i < this.humOsc.length; i++) {
      const base = 44 + i * 5;
      this.humOsc[i].frequency.setTargetAtTime(base + speed * 5.5, t, 0.2);
    }
  }

  /** Punchy photon: a low thump plus a short noise crack, never a pew-pew spam. */
  photon(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    // Rate-limit so holding fire does not turn into a buzzsaw.
    const now = ctx.currentTime;
    if (now - this.lastPhoton < 0.07) return;
    this.lastPhoton = now;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.11);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.16);

    this.noiseBurst(0.22, 0.05, 2400, 'highpass');
  }

  /** Shield hit and hull hit must never sound alike. */
  shieldHit(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.2);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.26);

    // Glassy band-limited noise over the top sells "deflected".
    this.noiseBurst(0.22, 0.14, 1800, 'bandpass', 6);
  }

  hullHit(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.3);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.34, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  explosion(large: boolean): void {
    const now = this.ctx?.currentTime ?? 0;
    if (!this.ctx || !this.master) return;

    const duration = large ? 0.7 : 0.3;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(large ? 1400 : 2400, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(large ? 0.5 : 0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
    source.stop(now + duration);
  }

  /** Compressed radio bark — the squelch is the point. */
  radio(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    this.noiseBurst(0.1, 0.07, 1500, 'bandpass', 8);

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(420, now + 0.02);
    osc.frequency.setValueAtTime(300, now + 0.12);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /** Warp: rising tone, then a slam on arrival. */
  warpRise(duration: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(4200, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.15);
  }

  warpSlam(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.35);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.47);
    this.noiseBurst(0.4, 0.2, 900, 'lowpass');
  }

  /** Alert sting on hostile arrival. */
  alert(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = i === 0 ? 660 : 495;
      const gain = ctx.createGain();
      const start = now + i * 0.16;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(start);
      osc.stop(start + 0.17);
    }
  }

  private noiseBurst(
    gainPeak: number,
    duration: number,
    frequency: number,
    type: BiquadFilterType,
    q = 1,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noiseBuffer) return;
    const now = ctx.currentTime;

    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainPeak, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  dispose(): void {
    try {
      for (const osc of this.humOsc) osc.stop();
    } catch {
      /* already stopped */
    }
    this.humOsc = [];
    try {
      void this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.master = null;
    this.started = false;
  }
}
