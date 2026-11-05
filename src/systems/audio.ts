/**
 * Fully synthesized audio (WebAudio): sound effects, ambience and an original
 * generative medieval-style score (plucked lute/harp, flute, drone, frame drum).
 */
import { loadSettings, Settings } from './save';

type MusicMode = 'none' | 'menu' | 'day' | 'night' | 'cave' | 'home' | 'capital' | 'royal';
type AmbMode = 'none' | 'day' | 'night' | 'cave' | 'home';

interface Song {
  root: number;
  scale: number[];
  bpm: number;
  prog: number[][];
  drums: boolean;
  lead: 'flute' | 'bell';
  density: number;
  drone: boolean;
}

const SONGS: Record<Exclude<MusicMode, 'none'>, Song> = {
  menu: { root: 50, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 70, prog: [[0, 6, 5, 6], [0, 3, 5, 4]], drums: false, lead: 'flute', density: 0.7, drone: true },
  day: { root: 55, scale: [0, 2, 4, 5, 7, 9, 11], bpm: 88, prog: [[0, 3, 4, 0], [5, 3, 0, 4], [0, 4, 5, 3]], drums: true, lead: 'flute', density: 0.8, drone: false },
  night: { root: 45, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 58, prog: [[0, 5, 2, 6], [0, 3, 5, 4]], drums: false, lead: 'bell', density: 0.45, drone: true },
  cave: { root: 40, scale: [0, 1, 3, 5, 7, 8, 10], bpm: 48, prog: [[0, 1, 0, 6], [0, 5, 1, 0]], drums: false, lead: 'bell', density: 0.3, drone: true },
  capital: { root: 50, scale: [0, 2, 4, 5, 7, 9, 11], bpm: 100, prog: [[0, 4, 5, 3], [0, 3, 4, 4], [5, 3, 0, 4]], drums: true, lead: 'flute', density: 0.9, drone: false },
  royal: { root: 48, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 58, prog: [[0, 4, 1, 4], [5, 3, 0, 4]], drums: false, lead: 'bell', density: 0.55, drone: true },
  home: { root: 53, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 64, prog: [[0, 4, 5, 3], [0, 1, 4, 0]], drums: false, lead: 'flute', density: 0.5, drone: false },
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class AudioSystem {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private reverb!: ConvolverNode;
  private noise!: AudioBuffer;
  private pluckBuf!: AudioBuffer;
  settings: Settings = loadSettings();

  private musicMode: MusicMode = 'none';
  private song: Song | null = null;
  private nextTime = 0;
  private step = 0;
  private bar = 0;
  private progIdx = 0;
  private motif: number[] = [];
  private droneNodes: { osc: OscillatorNode[]; gain: GainNode } | null = null;
  private timer: number | null = null;

  private ambMode: AmbMode = 'none';
  private rain = 0;
  private windGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private ambTimer = 0;

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx: AudioContext = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.4);
    const revGain = ctx.createGain();
    revGain.gain.value = 0.35;
    this.reverb.connect(revGain).connect(this.master);
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.reverb);
    this.sfxBus.connect(this.master);
    this.ambBus.connect(this.master);
    // noise buffer
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.pluckBuf = this.makePluck(220, 2.2);
    this.applyVolumes();
    this.timer = window.setInterval(() => this.tick(), 60);
  }

  applyVolumes(s?: Settings) {
    if (s) this.settings = s;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.settings.music * 0.55, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx * 0.8, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.settings.ambient * 0.7, t, 0.1);
  }

  private makeImpulse(sec: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  /** Karplus-Strong plucked string, rendered once and pitched with playbackRate. */
  private makePluck(freq: number, sec: number) {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * sec);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const period = Math.floor(sr / freq);
    const ring = new Float32Array(period);
    for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const next = (idx + 1) % period;
      const v = (ring[idx] + ring[next]) * 0.5 * 0.996;
      d[i] = ring[idx];
      ring[idx] = v;
      idx = next;
    }
    return buf;
  }

  // ------------------------------------------------------------ primitives
  private env(g: GainNode, t: number, a: number, peak: number, dur: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, gain: number, delay = 0, bus?: AudioNode) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this.env(g, t, 0.005, gain, dur);
    o.connect(g).connect(bus || this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseBurst(dur: number, type: BiquadFilterType, freq: number, gain: number, delay = 0, q = 1, freqEnd?: number, bus?: AudioNode) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, 0.004, gain, dur);
    src.connect(f).connect(g).connect(bus || this.sfxBus);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  // ------------------------------------------------------------ sfx
  play(name: string, opt: { surface?: string } = {}) {
    if (!this.ctx) return;
    const r = () => 0.9 + Math.random() * 0.2;
    switch (name) {
      case 'step': {
        const s = opt.surface || 'grass';
        if (s === 'stone') this.noiseBurst(0.04, 'highpass', 2200 * r(), 0.12);
        else if (s === 'wood') {
          this.noiseBurst(0.05, 'bandpass', 500 * r(), 0.25, 0, 2);
          this.tone('sine', 140, 90, 0.05, 0.08);
        } else if (s === 'water') this.noiseBurst(0.08, 'bandpass', 1500, 0.08, 0, 2);
        else this.noiseBurst(0.05, 'lowpass', 1300 * r(), 0.14);
        break;
      }
      case 'chop':
        this.tone('sine', 180 * r(), 70, 0.12, 0.5);
        this.noiseBurst(0.08, 'bandpass', 900, 0.4, 0, 1.5);
        break;
      case 'fall':
        this.noiseBurst(0.6, 'lowpass', 900, 0.35, 0, 1, 150);
        this.tone('sine', 90, 40, 0.5, 0.4, 0.25);
        break;
      case 'mine':
        this.tone('triangle', 1700 * r(), 1500, 0.14, 0.18);
        this.tone('square', 900 * r(), 600, 0.04, 0.08);
        this.noiseBurst(0.06, 'highpass', 3000, 0.2);
        break;
      case 'break':
        this.noiseBurst(0.25, 'lowpass', 2500, 0.4, 0, 1, 300);
        this.tone('triangle', 600, 200, 0.2, 0.15);
        break;
      case 'hoe':
        this.noiseBurst(0.12, 'lowpass', 700, 0.4);
        this.tone('sine', 120, 70, 0.08, 0.2);
        break;
      case 'water':
        for (let i = 0; i < 5; i++) this.noiseBurst(0.08, 'bandpass', 2400 + Math.random() * 1500, 0.08, i * 0.05, 3);
        break;
      case 'refill':
        this.noiseBurst(0.5, 'bandpass', 900, 0.15, 0, 2, 2400);
        break;
      case 'pickup':
        this.tone('sine', 700 * r(), 1050, 0.07, 0.16);
        this.tone('sine', 1400, 1400, 0.06, 0.08, 0.05);
        break;
      case 'click':
        this.tone('square', 1100, 1100, 0.025, 0.04);
        break;
      case 'hover':
        this.tone('sine', 1800, 1800, 0.02, 0.02);
        break;
      case 'open':
        this.tone('sine', 520, 520, 0.08, 0.1);
        this.tone('sine', 780, 780, 0.1, 0.1, 0.06);
        break;
      case 'close':
        this.tone('sine', 780, 780, 0.07, 0.08);
        this.tone('sine', 520, 520, 0.09, 0.08, 0.05);
        break;
      case 'craft':
        for (let i = 0; i < 3; i++) {
          this.tone('triangle', 1300, 1100, 0.07, 0.15, i * 0.12);
          this.noiseBurst(0.04, 'highpass', 3000, 0.1, i * 0.12);
        }
        this.tone('sine', 1568, 1568, 0.25, 0.08, 0.38);
        break;
      case 'harvest':
        this.tone('sine', 320, 640, 0.08, 0.22);
        this.noiseBurst(0.08, 'lowpass', 1200, 0.2);
        this.tone('sine', 900, 1300, 0.08, 0.12, 0.08);
        break;
      case 'plant':
        this.noiseBurst(0.08, 'lowpass', 900, 0.2);
        this.tone('sine', 500, 700, 0.06, 0.08, 0.04);
        break;
      case 'swing':
        this.noiseBurst(0.14, 'bandpass', 500, 0.25, 0, 1.2, 2600);
        break;
      case 'hit':
        this.noiseBurst(0.08, 'bandpass', 1200, 0.35, 0, 1);
        this.tone('square', 260, 110, 0.1, 0.12);
        break;
      case 'slime':
        this.tone('sine', 180, 420, 0.15, 0.2);
        break;
      case 'hurt':
        this.tone('sawtooth', 320, 110, 0.22, 0.18);
        this.noiseBurst(0.1, 'lowpass', 1200, 0.2);
        break;
      case 'die':
        this.tone('sine', 400, 90, 0.4, 0.2);
        this.noiseBurst(0.3, 'lowpass', 800, 0.2, 0.05);
        break;
      case 'coin':
        this.tone('sine', 1318, 1318, 0.07, 0.12);
        this.tone('sine', 1760, 1760, 0.18, 0.12, 0.07);
        break;
      case 'splash':
        this.noiseBurst(0.45, 'lowpass', 2500, 0.35, 0, 1, 300);
        break;
      case 'cast':
        this.noiseBurst(0.2, 'bandpass', 600, 0.2, 0, 1, 2400);
        this.tone('sine', 900, 400, 0.08, 0.1, 0.3);
        break;
      case 'bite':
        this.tone('sine', 1250, 1250, 0.06, 0.18);
        this.tone('sine', 1250, 1250, 0.06, 0.18, 0.1);
        break;
      case 'levelup':
        [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.3, 0.14, i * 0.1));
        break;
      case 'quest':
        [392, 523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, i === 4 ? 0.6 : 0.2, 0.14, i * 0.12));
        break;
      case 'eat':
        for (let i = 0; i < 3; i++) this.noiseBurst(0.06, 'bandpass', 1800, 0.25, i * 0.12, 2);
        break;
      case 'door':
        this.tone('sine', 110, 70, 0.2, 0.35);
        this.tone('sawtooth', 240, 180, 0.25, 0.04, 0.05);
        break;
      case 'build':
        for (let i = 0; i < 5; i++) {
          this.tone('sine', 200, 90, 0.08, 0.35, i * 0.15);
          this.noiseBurst(0.05, 'bandpass', 900, 0.2, i * 0.15);
        }
        break;
      case 'error':
        this.tone('square', 160, 140, 0.14, 0.08);
        break;
      case 'sleep':
        [784, 659, 523, 392].forEach((f, i) => this.tone('sine', f, f, 0.5, 0.1, i * 0.25));
        break;
      case 'chest':
        this.tone('sine', 300, 200, 0.12, 0.2);
        this.tone('triangle', 880, 1320, 0.3, 0.1, 0.1);
        break;
      case 'treasure':
        [523, 659, 784, 988, 1046, 1318].forEach((f, i) => this.tone('triangle', f, f, 0.35, 0.12, i * 0.09));
        break;
      case 'ladder':
        for (let i = 0; i < 4; i++) this.tone('sine', 220 - i * 20, 180 - i * 20, 0.08, 0.2, i * 0.12);
        break;
      case 'gift':
        [659, 880, 1046].forEach((f, i) => this.tone('sine', f, f, 0.2, 0.12, i * 0.08));
        break;
      case 'cluck':
        for (let i = 0; i < 3; i++) this.tone('square', 900 + Math.random() * 200, 620, 0.05, 0.05, i * 0.09);
        break;
      case 'moo': {
        this.tone('sawtooth', 150, 118, 0.7, 0.09);
        this.tone('sawtooth', 152, 120, 0.7, 0.05, 0.02);
        break;
      }
      case 'baa':
        for (let i = 0; i < 4; i++) this.tone('triangle', 420 + (i % 2) * 40, 400, 0.08, 0.1, i * 0.07);
        break;
      case 'talk':
        this.tone('triangle', 420 + Math.random() * 160, 420, 0.04, 0.05);
        break;
    }
  }

  // ------------------------------------------------------------ music
  setMusic(mode: MusicMode) {
    if (mode === this.musicMode) return;
    this.musicMode = mode;
    if (!this.ctx) return;
    this.stopDrone();
    this.song = mode === 'none' ? null : SONGS[mode];
    this.step = 0;
    this.bar = 0;
    this.progIdx = 0;
    this.motif = [];
    this.nextTime = this.ctx.currentTime + 0.4;
  }

  private stopDrone() {
    if (!this.droneNodes || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.droneNodes.gain.gain.setTargetAtTime(0.0001, t, 0.6);
    const nodes = this.droneNodes;
    setTimeout(() => nodes.osc.forEach((o) => o.stop()), 3000);
    this.droneNodes = null;
  }

  private startDrone(freq: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 380;
    const osc = [0, 7, -5].map((det, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'sine' : 'sawtooth';
      o.frequency.value = i === 1 ? freq * 1.5 : freq;
      o.detune.value = det;
      o.connect(f);
      o.start();
      return o;
    });
    f.connect(g).connect(this.musicBus);
    g.gain.setTargetAtTime(0.035, ctx.currentTime, 1.5);
    this.droneNodes = { osc, gain: g };
  }

  private pluck(freq: number, t: number, gain: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.pluckBuf;
    src.playbackRate.value = freq / 220;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2600;
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t);
    src.stop(t + 2);
  }

  private flute(freq: number, t: number, dur: number, gain: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = freq * 2;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(freq * 0.006, t + 0.25);
    lfo.connect(lg).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.09);
    g.gain.setValueAtTime(gain, t + Math.max(0.1, dur - 0.12));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    const g2 = ctx.createGain();
    g2.gain.value = 0.12;
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(this.musicBus);
    [o, o2, lfo].forEach((n) => {
      n.start(t);
      n.stop(t + dur + 0.2);
    });
  }

  private bell(freq: number, t: number, gain: number) {
    const ctx = this.ctx!;
    [1, 2.76, 5.4].forEach((m, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * m;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain / (i * 2 + 1), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5 / (i + 1));
      o.connect(g).connect(this.musicBus);
      o.start(t);
      o.stop(t + 2.6);
    });
  }

  private drum(t: number, accent: boolean) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(accent ? 110 : 150, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(accent ? 0.22 : 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.35);
  }

  private note(s: Song, degree: number, octave: number) {
    const n = s.scale.length;
    const oct = Math.floor(degree / n);
    const d = ((degree % n) + n) % n;
    return mtof(s.root + s.scale[d] + 12 * (oct + octave));
  }

  private scheduleStep(s: Song, t: number) {
    const stepsPerBar = 8;
    const prog = s.prog[this.progIdx % s.prog.length];
    const chord = prog[this.bar % prog.length];
    const st = this.step % stepsPerBar;
    if (st === 0 && s.drone && this.bar % 4 === 0 && !this.droneNodes) this.startDrone(this.note(s, 0, -1));
    // harp arpeggio
    const arp = [0, 2, 4, 7, 4, 2, 0, 4];
    if (Math.random() < 0.55 + s.density * 0.45 || st === 0) {
      const deg = chord + arp[st];
      this.pluck(this.note(s, deg, 0), t, st === 0 ? 0.2 : 0.11);
    }
    if (st === 0) this.pluck(this.note(s, chord, -1), t, 0.22);
    // drums
    if (s.drums) {
      if (st === 0 || st === 4) this.drum(t, st === 0);
      else if (st === 6 && Math.random() < 0.4) this.drum(t, false);
    }
    // melody: motif of 16 eighths (2 bars), repeated with variation
    if (this.motif.length === 0) {
      let cur = 7 + Math.floor(Math.random() * 3);
      for (let i = 0; i < 16; i++) {
        if (i % 2 === 1 && Math.random() < 0.6) {
          this.motif.push(-99);
          continue;
        }
        cur += Math.floor(Math.random() * 5) - 2;
        cur = Math.max(4, Math.min(13, cur));
        this.motif.push(Math.random() < s.density ? cur : -99);
      }
    }
    const mIdx = (this.bar % 2) * 8 + st;
    const playMelody = this.bar % 8 >= 2 && this.bar % 8 < 6 ? true : this.bar % 8 >= 6 ? Math.random() < 0.5 : false;
    const m = this.motif[mIdx];
    if (playMelody && m !== -99 && m !== undefined) {
      const spb = 60 / s.bpm / 2;
      let len = 1;
      while (mIdx + len < 16 && this.motif[mIdx + len] === -99 && len < 4) len++;
      const f = this.note(s, m, 0);
      if (s.lead === 'flute') this.flute(f, t, spb * len * 0.95, 0.075);
      else this.bell(f, t, 0.06);
    }
    this.step++;
    if (this.step % stepsPerBar === 0) {
      this.bar++;
      if (this.bar % 8 === 0) {
        this.progIdx++;
        if (Math.random() < 0.6) this.motif = [];
      }
    }
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx) return;
    const s = this.song;
    if (s) {
      const spb = 60 / s.bpm / 2;
      while (this.nextTime < ctx.currentTime + 0.25) {
        this.scheduleStep(s, this.nextTime);
        this.nextTime += spb * (this.step % 2 === 1 ? 1.04 : 0.96); // light swing
      }
    }
    this.ambientTick();
  }

  // ------------------------------------------------------------ ambience
  setAmbient(mode: AmbMode, rain: number) {
    this.ambMode = mode;
    this.rain = rain;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (!this.windGain) {
      this.windGain = this.loopNoise('lowpass', 420, 0.5);
      this.rainGain = this.loopNoise('bandpass', 1400, 0.6);
    }
    const outdoor = mode === 'day' || mode === 'night';
    this.windGain.gain.setTargetAtTime(outdoor ? 0.05 : mode === 'cave' ? 0.035 : 0.0, t, 1);
    this.rainGain!.gain.setTargetAtTime(outdoor ? rain * 0.16 : mode === 'home' ? rain * 0.04 : 0, t, 1);
  }

  private loopNoise(type: BiquadFilterType, freq: number, q: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f).connect(g).connect(this.ambBus);
    src.start();
    return g;
  }

  private chirp(t: number) {
    const ctx = this.ctx!;
    const base = 2200 + Math.random() * 1800;
    const n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      const tt = t + i * (0.08 + Math.random() * 0.05);
      o.frequency.setValueAtTime(base * (1 + Math.random() * 0.2), tt);
      o.frequency.exponentialRampToValueAtTime(base * (0.7 + Math.random() * 0.8), tt + 0.07);
      const g = ctx.createGain();
      this.env(g, tt, 0.01, 0.035, 0.08);
      o.connect(g).connect(this.ambBus);
      o.start(tt);
      o.stop(tt + 0.1);
    }
  }

  private cricket(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = 4300 + Math.random() * 600;
    const g = ctx.createGain();
    g.gain.value = 0;
    for (let i = 0; i < 6; i++) {
      g.gain.setValueAtTime(0.018, t + i * 0.05);
      g.gain.setValueAtTime(0, t + i * 0.05 + 0.025);
    }
    o.connect(g).connect(this.ambBus);
    o.start(t);
    o.stop(t + 0.35);
  }

  private drip(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(1600 + Math.random() * 600, t);
    o.frequency.exponentialRampToValueAtTime(700, t + 0.06);
    const g = ctx.createGain();
    this.env(g, t, 0.003, 0.05, 0.1);
    const d = ctx.createDelay();
    d.delayTime.value = 0.23;
    const fb = ctx.createGain();
    fb.gain.value = 0.35;
    o.connect(g);
    g.connect(this.ambBus);
    g.connect(d);
    d.connect(fb).connect(d);
    d.connect(this.ambBus);
    o.start(t);
    o.stop(t + 0.12);
    setTimeout(() => {
      fb.disconnect();
      d.disconnect();
    }, 2500);
  }

  private ambientTick() {
    const ctx = this.ctx!;
    const now = performance.now();
    if (now < this.ambTimer) return;
    const t = ctx.currentTime + 0.05;
    switch (this.ambMode) {
      case 'day':
        if (this.rain < 0.5) this.chirp(t);
        this.ambTimer = now + 1200 + Math.random() * 4000;
        break;
      case 'night':
        if (this.rain < 0.5) this.cricket(t);
        this.ambTimer = now + 400 + Math.random() * 1600;
        break;
      case 'cave':
        this.drip(t);
        this.ambTimer = now + 1500 + Math.random() * 3500;
        break;
      case 'home':
        this.noiseBurst(0.03, 'bandpass', 2500 + Math.random() * 2000, 0.05, 0, 2, undefined, this.ambBus);
        this.ambTimer = now + 150 + Math.random() * 700;
        break;
      default:
        this.ambTimer = now + 1000;
    }
  }
}

export const audio = new AudioSystem();
