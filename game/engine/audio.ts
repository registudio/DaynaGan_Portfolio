/**
 * All game audio is synthesised with WebAudio: chiptune music per biome, SFX and
 * Xiao Hu's meow. Drop a recording at /audio/meow.mp3 to replace the synth meow.
 * Starts muted; nothing is created until the first unmute (browsers need a gesture).
 */

export type MusicSpec = { root: number; scale: number[]; tempo: number; lead: OscillatorType; mood: number };

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  pent: [0, 3, 5, 7, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
};
export const MUSIC: Record<string, MusicSpec> = {
  'orbital-station': { root: 57, scale: SCALES.lydian, tempo: 92, lead: 'triangle', mood: 1 },
  'core-reactor': { root: 50, scale: SCALES.minor, tempo: 118, lead: 'square', mood: 2 },
  'academy-spires': { root: 60, scale: SCALES.major, tempo: 104, lead: 'triangle', mood: 3 },
  'robot-forge': { root: 45, scale: SCALES.dorian, tempo: 128, lead: 'sawtooth', mood: 4 },
  'circuit-caverns': { root: 52, scale: SCALES.pent, tempo: 112, lead: 'square', mood: 5 },
  'trophy-hall': { root: 55, scale: SCALES.major, tempo: 96, lead: 'triangle', mood: 6 },
  'colony-commons': { root: 60, scale: SCALES.pent, tempo: 100, lead: 'triangle', mood: 7 },
  mainframe: { root: 48, scale: SCALES.minor, tempo: 136, lead: 'square', mood: 8 },
  'comms-array': { root: 53, scale: SCALES.lydian, tempo: 88, lead: 'sine', mood: 9 },
  backroom: { root: 47, scale: SCALES.minor, tempo: 70, lead: 'sine', mood: 10 },
};

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class Audio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noise!: AudioBuffer;
  private meowSample: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private spec: MusicSpec | null = null;
  private step = 0;
  private nextTime = 0;
  private pattern: { lead: (number | null)[]; bass: number[] } | null = null;
  muted = true;
  musicVol = 0.5;
  sfxVol = 0.8;

  private ensure() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.apply();
    fetch('/audio/meow.mp3')
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then((b) => ctx.decodeAudioData(b))
      .then((buf) => (this.meowSample = buf))
      .catch(() => {});
    return ctx;
  }

  private apply() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.7, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.musicVol * 0.35, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.sfxVol * 0.6, t, 0.05);
  }

  configure(muted: boolean, music: number, sfx: number) {
    this.muted = muted;
    this.musicVol = music;
    this.sfxVol = sfx;
    if (!muted) {
      const ctx = this.ensure();
      ctx?.resume();
      if (this.spec && !this.timer) this.startLoop();
    }
    this.apply();
  }

  // ── Music ─────────────────────────────────────────────────────────────────

  playMusic(biome: string) {
    this.spec = MUSIC[biome] ?? MUSIC['orbital-station'];
    this.pattern = this.compose(this.spec);
    this.step = 0;
    if (!this.muted && this.ctx) {
      this.stopLoop();
      this.startLoop();
    }
  }

  private compose(spec: MusicSpec) {
    let seed = spec.mood * 9301 + 49297;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const deg = (n: number) => {
      const oct = Math.floor(n / spec.scale.length);
      const i = ((n % spec.scale.length) + spec.scale.length) % spec.scale.length;
      return spec.root + 12 + spec.scale[i] + 12 * oct;
    };
    // 4 bars × 8 steps; motif repeated with variation.
    const motif = Array.from({ length: 8 }, () => (rnd() < 0.28 ? null : Math.floor(rnd() * 7)));
    const lead: (number | null)[] = [];
    for (let bar = 0; bar < 4; bar++)
      for (let s = 0; s < 8; s++) {
        const m = motif[s];
        lead.push(m == null ? null : deg(m + (bar === 2 ? 2 : bar === 3 ? -1 : 0)));
      }
    const prog = [0, 5, 3, 4].map((d) => spec.root - 12 + spec.scale[d % spec.scale.length]);
    const bass = prog.flatMap((r) => [r, r, r + 12, r, r, r + 7, r + 12, r]);
    return { lead, bass };
  }

  private startLoop() {
    if (!this.ctx || !this.spec) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 50);
  }
  private stopLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.spec || !this.pattern) return;
    const stepDur = 60 / this.spec.tempo / 2;
    while (this.nextTime < ctx.currentTime + 0.2) {
      const i = this.step % 32;
      const note = this.pattern.lead[i];
      if (note != null) this.tone(hz(note), this.spec.lead, this.nextTime, stepDur * 0.9, 0.12, this.musicBus);
      this.tone(hz(this.pattern.bass[i]), 'triangle', this.nextTime, stepDur * 0.95, 0.22, this.musicBus);
      if (i % 4 === 0) this.kick(this.nextTime);
      if (i % 2 === 1) this.hat(this.nextTime, 0.05);
      this.step++;
      this.nextTime += stepDur;
    }
  }

  stop() {
    this.stopLoop();
  }

  // ── Primitives ────────────────────────────────────────────────────────────

  private tone(freq: number, type: OscillatorType, at: number, dur: number, vol: number, bus: GainNode, slide?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(bus);
    o.start(at);
    o.stop(at + dur + 0.02);
  }
  private burst(at: number, dur: number, vol: number, filter: number, bus: GainNode, type: BiquadFilterType = 'highpass') {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filter;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(at);
    src.stop(at + dur);
  }
  private kick(at: number) {
    this.tone(120, 'sine', at, 0.16, 0.5, this.musicBus, 40);
  }
  private hat(at: number, vol: number) {
    this.burst(at, 0.04, vol, 7000, this.musicBus);
  }

  // ── SFX ───────────────────────────────────────────────────────────────────

  sfx(name: string) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const b = this.sfxBus;
    switch (name) {
      case 'swing':
        this.burst(t, 0.12, 0.25, 1200, b, 'bandpass');
        break;
      case 'zap':
        this.tone(1400, 'square', t, 0.12, 0.12, b, 300);
        break;
      case 'hit':
        this.tone(220, 'square', t, 0.08, 0.2, b, 90);
        this.burst(t, 0.06, 0.2, 2000, b);
        break;
      case 'hurt':
        this.tone(160, 'sawtooth', t, 0.2, 0.25, b, 60);
        break;
      case 'die':
        this.burst(t, 0.35, 0.3, 400, b, 'lowpass');
        this.tone(300, 'square', t, 0.3, 0.12, b, 40);
        break;
      case 'dash':
        this.burst(t, 0.15, 0.2, 3000, b);
        break;
      case 'pickup':
        [0, 0.06, 0.12].forEach((d, i) => this.tone(hz(76 + i * 4), 'square', t + d, 0.08, 0.1, b));
        break;
      case 'chip':
        this.tone(hz(84), 'triangle', t, 0.1, 0.12, b);
        this.tone(hz(91), 'triangle', t + 0.07, 0.14, 0.12, b);
        break;
      case 'skill':
        [0, 4, 7, 12].forEach((n, i) => this.tone(hz(72 + n), 'square', t + i * 0.07, 0.12, 0.1, b));
        break;
      case 'build':
        [0, 7, 12, 16, 19, 24].forEach((n, i) => this.tone(hz(60 + n), 'triangle', t + i * 0.08, 0.2, 0.14, b));
        break;
      case 'error':
        this.tone(180, 'square', t, 0.12, 0.14, b);
        this.tone(140, 'square', t + 0.13, 0.18, 0.14, b);
        break;
      case 'teleport':
        this.tone(200, 'sine', t, 0.6, 0.2, b, 1600);
        break;
      case 'heal':
        [0, 5, 9].forEach((n, i) => this.tone(hz(69 + n), 'sine', t + i * 0.09, 0.25, 0.14, b));
        break;
      case 'emp':
        this.tone(80, 'sawtooth', t, 0.5, 0.3, b, 30);
        this.burst(t, 0.4, 0.3, 800, b, 'lowpass');
        break;
      case 'relay':
        this.tone(hz(64), 'square', t, 0.3, 0.12, b, hz(76));
        break;
      case 'open':
        this.tone(hz(67), 'triangle', t, 0.08, 0.1, b);
        break;
      case 'close':
        this.tone(hz(60), 'triangle', t, 0.08, 0.1, b);
        break;
      case 'send':
        this.tone(300, 'sine', t, 1.2, 0.2, b, 2400);
        break;
    }
  }

  meow(pitch = 1) {
    if (this.muted || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    if (this.meowSample) {
      const src = ctx.createBufferSource();
      src.buffer = this.meowSample;
      src.playbackRate.value = pitch;
      src.connect(this.sfxBus);
      src.start();
      return;
    }
    // Synth meow: pitch rises then falls; formants glide from "ee" to "ow".
    const dur = 0.62;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const f0 = 520 * pitch;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f0 * 1.45, t + 0.18);
    o.frequency.linearRampToValueAtTime(f0 * 0.82, t + dur);
    const vib = ctx.createOscillator();
    vib.frequency.value = 7;
    const vibGain = ctx.createGain();
    vibGain.gain.value = 9;
    vib.connect(vibGain).connect(o.frequency);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.5, t + 0.06);
    env.gain.setValueAtTime(0.5, t + dur * 0.55);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const out = ctx.createGain();
    out.gain.value = 0.55;
    const formants = [
      [900, 1500, 700],
      [2400, 1100, 900],
    ];
    for (const [a, bq, c] of formants) {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 6;
      f.frequency.setValueAtTime(a, t);
      f.frequency.linearRampToValueAtTime(bq, t + 0.2);
      f.frequency.linearRampToValueAtTime(c, t + dur);
      env.connect(f).connect(out);
    }
    o.connect(env);
    out.connect(this.sfxBus);
    o.start(t);
    vib.start(t);
    o.stop(t + dur + 0.05);
    vib.stop(t + dur + 0.05);
  }

  dispose() {
    this.stopLoop();
    this.ctx?.close();
    this.ctx = null;
  }
}
