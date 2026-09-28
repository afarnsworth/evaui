// Synthesizes every sound effect used in the videos into public/sfx/*.wav.
// No samples: oscillators, seeded noise and one-pole filters only, so the
// output is identical on every run.
import {mkdirSync, writeFileSync} from 'node:fs';

const SR = 48000;
const TAU = Math.PI * 2;
const OUT = 'public/sfx';

// --- primitives -------------------------------------------------------------

const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const n = (sec) => Math.round(sec * SR);
const make = (sec, fn) => {
  const out = new Float32Array(n(sec));
  for (let i = 0; i < out.length; i++) out[i] = fn(i / SR, i);
  return out;
};
const noise = (sec, seed) => {
  const r = rng(seed);
  return make(sec, () => r() * 2 - 1);
};
const decay = (t, tau) => Math.exp(-t / tau);
const rise = (t, a) => Math.min(1, t / a);
const soft = (x, k = 4) => Math.tanh(k * x) / Math.tanh(k);

/** Phase accumulator for swept oscillators. */
const phases = (sec, freqAt) => {
  const ph = new Float64Array(n(sec));
  let p = 0;
  for (let i = 0; i < ph.length; i++) {
    ph[i] = p;
    p += (TAU * freqAt(i / SR)) / SR;
  }
  return ph;
};

const lowpass = (x, fc) => {
  const cut = typeof fc === 'function' ? fc : () => fc;
  const y = new Float32Array(x.length);
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    const a = 1 - Math.exp((-TAU * cut(i / SR)) / SR);
    s += a * (x[i] - s);
    y[i] = s;
  }
  return y;
};
const highpass = (x, fc) => {
  const lp = lowpass(x, fc);
  return x.map((v, i) => v - lp[i]);
};

/** Filter a loop as if it were already looping, so the seam is clean. */
const loopFilter = (x, filter) => {
  const tripled = new Float32Array(x.length * 3);
  tripled.set(x, 0);
  tripled.set(x, x.length);
  tripled.set(x, x.length * 2);
  return filter(tripled).slice(x.length, x.length * 2);
};

const mix = (...layers) => {
  const len = Math.max(...layers.map(([b, , off = 0]) => b.length + n(off)));
  const out = new Float32Array(len);
  for (const [b, g = 1, off = 0] of layers) {
    const o = n(off);
    for (let i = 0; i < b.length; i++) out[i + o] += b[i] * g;
  }
  return out;
};
const shape = (x, fn) => x.map((v, i) => fn(v, i / SR));

const normalize = (x, peak = 0.8) => {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  return m ? x.map((v) => (v / m) * peak) : x;
};
const fadeEdges = (x, ms = 3) => {
  const k = n(ms / 1000);
  for (let i = 0; i < k && i < x.length; i++) x[x.length - 1 - i] *= i / k;
  return x;
};

const writeWav = (name, x, {loop = false} = {}) => {
  const data = normalize(loop ? x : fadeEdges(x));
  const buf = Buffer.alloc(44 + data.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + data.length * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(data.length * 2, 40);
  data.forEach((v, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  writeFileSync(`${OUT}/${name}.wav`, buf);
  console.log(`${name.padEnd(12)} ${(data.length / SR).toFixed(2)}s`);
};

// --- sounds -----------------------------------------------------------------

const SOUNDS = {};

// UI element flickering on
const blip = (f, dur) =>
  lowpass(
    make(dur, (t) => {
      const s = Math.sin(TAU * f * t);
      return (0.7 * s + 0.3 * Math.sign(s)) * rise(t, 0.002) * decay(t, 0.022);
    }),
    9000,
  );
SOUNDS.blip = () => blip(2200, 0.08);
SOUNDS['blip-lo'] = () => blip(1100, 0.1);

// Computer "thinking": a stream of short quantized tones
const chatter = (seed) => {
  const r = rng(seed);
  const notes = [1320, 1760, 1980, 2640, 2960, 3520];
  const seg = 0.03;
  const count = 40;
  const plan = Array.from({length: count}, () => (r() < 0.7 ? notes[Math.floor(r() * notes.length)] : 0));
  return lowpass(
    make(seg * count, (t) => {
      const k = Math.min(count - 1, Math.floor(t / seg));
      const f = plan[k];
      if (!f) return 0;
      const local = t - k * seg;
      const env = rise(local, 0.002) * Math.min(1, (seg - local) / 0.002);
      return soft(Math.sin(TAU * f * t), 3) * env * 0.6;
    }),
    7000,
  );
};
SOUNDS.chatter = () => chatter(11);
SOUNDS.chatter2 = () => chatter(29);

// Mechanical click, used for clock ticks and token commits
SOUNDS.tick = () => {
  const nz = highpass(noise(0.025, 3), 2000);
  return mix([shape(nz, (v, t) => v * decay(t, 0.0015))], [make(0.025, (t) => Math.sin(TAU * 3200 * t) * decay(t, 0.003)), 0.5]);
};

// The alarm: harsh pulsed square, 2 s, loops cleanly
SOUNDS.klaxon = () =>
  lowpass(
    make(2, (t) => {
      const local = t % 0.25;
      if (local > 0.17) return 0;
      const f = 960 - local * 300;
      const env = rise(local, 0.005) * Math.min(1, (0.17 - local) / 0.01);
      return soft(Math.sin(TAU * f * t), 5) * env;
    }),
    5000,
  );

// Short low thump for title-card cuts
SOUNDS.hit = () => {
  const ph = phases(0.5, (t) => 60 + 140 * decay(t, 0.03));
  const body = make(0.5, (t, i) => Math.sin(ph[i]) * decay(t, 0.12));
  const nz = shape(lowpass(noise(0.5, 5), 2000), (v, t) => v * decay(t, 0.03));
  return shape(mix([body], [nz, 0.6]), (v) => soft(v, 1.5));
};

// Heavy impact with a falling sub
SOUNDS.impact = () => {
  const ph = phases(1.6, (t) => 35 + 75 * decay(t, 0.09));
  const body = make(1.6, (t, i) => Math.sin(ph[i]) * decay(t, 0.45));
  const nz = shape(lowpass(noise(1.6, 7), 900), (v, t) => v * decay(t, 0.12));
  const click = shape(noise(0.02, 8), (v, t) => v * decay(t, 0.002));
  return shape(mix([body], [nz, 0.9], [click, 0.5]), (v) => soft(v, 1.8));
};

// Deep boom for the big title cards
SOUNDS.boom = () => {
  const ph = phases(3, (t) => 42 + 30 * decay(t, 0.15));
  const body = make(3, (t, i) => Math.sin(ph[i]) * decay(t, 1.1));
  const nz = shape(lowpass(noise(3, 9), 250), (v, t) => v * decay(t, 0.6));
  return shape(mix([body], [nz, 1.2]), (v) => soft(v, 1.4));
};

// Verdict slam: thump plus an inharmonic bell ring
SOUNDS.stamp = () => {
  const ph = phases(1.4, (t) => 50 + 150 * decay(t, 0.04));
  const thump = make(1.4, (t, i) => Math.sin(ph[i]) * decay(t, 0.25));
  const bell = make(1.4, (t) =>
    [
      [660, 0.5, 0.5],
      [1822, 0.3, 0.3],
      [3564, 0.15, 0.15],
    ].reduce((s, [f, a, tau]) => s + Math.sin(TAU * f * t) * a * decay(t, tau), 0),
  );
  const nz = shape(noise(1.4, 13), (v, t) => v * decay(t, 0.01));
  return shape(mix([thump], [bell, 0.7], [nz, 0.5]), (v) => soft(v, 1.3));
};

// Beam weapon discharge
SOUNDS.zap = () => {
  const ph = phases(0.4, (t) => 2800 * decay(t, 0.07) + 180);
  const tone = make(0.4, (t, i) => soft(Math.sin(ph[i] + 2.5 * Math.sin(TAU * 95 * t)), 2) * rise(t, 0.002) * decay(t, 0.12));
  const nz = shape(highpass(noise(0.4, 17), 3000), (v, t) => v * decay(t, 0.02));
  return mix([tone], [nz, 0.4]);
};

// Sonar ping with two echoes
SOUNDS.ping = () => {
  const dry = make(1.6, (t) => rise(t, 0.002) * Math.sin(TAU * 1560 * t) * decay(t, 0.28) + rise(t, 0.002) * 0.15 * Math.sin(TAU * 3120 * t) * decay(t, 0.12));
  return mix([dry], [dry, 0.4, 0.19], [dry, 0.16, 0.38]);
};

// CRT power on: thump, rising whine, crackle
SOUNDS['power-on'] = () => {
  const r = rng(19);
  const thumpPh = phases(0.4, (t) => 70 + 60 * decay(t, 0.02));
  const thump = make(0.4, (t, i) => Math.sin(thumpPh[i]) * decay(t, 0.08));
  const whinePh = phases(0.4, (t) => 300 + 2400 * (1 - decay(t, 0.05)));
  const whine = make(0.4, (t, i) => Math.sin(whinePh[i]) * rise(t, 0.005) * decay(t, 0.09));
  const crackle = make(0.4, (t) => (r() * 2 - 1) * (r() > 0.9 ? 1 : 0.1) * decay(t, 0.1));
  return mix([thump], [whine, 0.4], [crackle, 0.3]);
};

// CRT power off: falling tone, click, fading high whine
SOUNDS['power-off'] = () => {
  const ph = phases(0.8, (t) => 80 + 1800 * decay(t, 0.1));
  const fall = make(0.8, (t, i) => Math.sin(ph[i]) * decay(t, 0.3));
  const click = shape(noise(0.02, 23), (v, t) => v * decay(t, 0.002));
  const whine = make(0.8, (t) => Math.sin(TAU * 9000 * t) * decay(t, 0.5));
  return mix([fall], [click, 0.6], [whine, 0.05]);
};

// Signal tear on hard cuts
SOUNDS.static = () => {
  const r = rng(31);
  let level = 1;
  const nz = make(0.14, (t, i) => {
    if (i % n(0.006) === 0) level = 0.2 + r() * 0.8;
    return (r() * 2 - 1) * level * Math.min(1, (0.14 - t) / 0.03);
  });
  return highpass(nz, 400);
};

// Control-room mains hum bed, 4 s loop
SOUNDS.hum = () => {
  const tones = make(4, (t) => {
    const am = 1 + 0.1 * Math.sin(TAU * 0.5 * t);
    return am * (0.5 * Math.sin(TAU * 50 * t) + 0.28 * Math.sin(TAU * 100 * t) + 0.14 * Math.sin(TAU * 150 * t) + 0.08 * Math.sin(TAU * 250 * t));
  });
  const brown = loopFilter(noise(4, 37), (x) => lowpass(x, 180));
  return mix([tones], [brown, 1.4]);
};

// Tension bed: beating detuned low saws and a pulsing high tone, 4 s loop
SOUNDS.tension = () => {
  const saw = (f, t) => 2 * ((f * t) % 1) - 1;
  const low = loopFilter(
    make(4, (t) => saw(55, t) + saw(55.5, t)),
    (x) => lowpass(x, 600),
  );
  const high = make(4, (t) => Math.sin(TAU * 880 * t) * (0.5 + 0.5 * Math.sin(TAU * 2 * t)));
  return mix([low, 0.5], [high, 0.08]);
};

// MAGI vote: approval chirp and denial buzz
SOUNDS.approve = () =>
  lowpass(
    make(0.4, (t) => {
      const on1 = t < 0.09;
      const on2 = t > 0.11 && t < 0.3;
      if (!on1 && !on2) return 0;
      const f = on1 ? 880 : 1320;
      const local = on1 ? t : t - 0.11;
      const len = on1 ? 0.09 : 0.19;
      return soft(Math.sin(TAU * f * t), 3) * rise(local, 0.004) * Math.min(1, (len - local) / 0.01);
    }),
    6000,
  );
SOUNDS.deny = () =>
  lowpass(
    make(0.5, (t) => {
      const gate = Math.sin(TAU * 22 * t) > 0 ? 1 : 0.35;
      const env = rise(t, 0.005) * Math.max(0, Math.min(1, (0.45 - t) / 0.05));
      return (soft(Math.sin(TAU * 110 * t)) + soft(Math.sin(TAU * 116.5 * t))) * 0.5 * gate * env;
    }),
    2500,
  );

// Decelerating ratchet for the sampling needle
SOUNDS.ratchet = () => {
  const clicks = [];
  let p = 0;
  for (let i = 0; i < n(0.6); i++) {
    const t = i / SR;
    const before = Math.floor(p);
    p += (70 * decay(t, 0.15) + 4) / SR;
    if (Math.floor(p) > before) clicks.push(t);
  }
  const click = make(0.004, (t) => Math.sin(TAU * 2400 * t) * decay(t, 0.001));
  return mix(...clicks.map((t, i) => [click, 1 - i * 0.02, t]));
};

// Build-up into a hit
SOUNDS.riser = () => {
  const nz = lowpass(noise(1.6, 41), (t) => 200 + 5800 * (t / 1.6) ** 2);
  const ph = phases(1.6, (t) => 200 * Math.pow(7, t / 1.6));
  const tone = make(1.6, (t, i) => Math.sin(ph[i]));
  return shape(mix([nz, 1], [tone, 0.25]), (v, t) => v * (t / 1.6) ** 2);
};

// Low mechanical rumble (buildings moving, the globe tilting)
SOUNDS.rumble = () => {
  const nz = lowpass(lowpass(noise(2.2, 43), 90), 90);
  const sub = make(2.2, (t) => Math.sin(TAU * 38 * t) * 0.3);
  return shape(mix([nz, 3], [sub]), (v, t) => v * Math.sin((Math.PI * t) / 2.2));
};

// Corrupted data: bit-crushed noise and random tones
SOUNDS.glitch = () => {
  const r = rng(47);
  const seg = 0.03;
  const plan = Array.from({length: 12}, () => ({crush: r() < 0.5, f: 200 + r() * 2800}));
  let held = 0;
  return make(seg * 12, (t, i) => {
    const k = Math.min(11, Math.floor(t / seg));
    const p = plan[k];
    if (p.crush) {
      if (i % 12 === 0) held = Math.round((r() * 2 - 1) * 4) / 4;
      return held * 0.7;
    }
    return Math.sign(Math.sin(TAU * p.f * t)) * 0.4;
  });
};

// --- write ------------------------------------------------------------------

// Beds are built as seamless loops, then tiled out past the longest scene.
// (Remotion's <Audio loop> leaves a gap of about a frame at each wrap.)
const BED_SECONDS = 12;
const tile = (x) => {
  const reps = Math.ceil(n(BED_SECONDS) / x.length);
  const out = new Float32Array(x.length * reps);
  for (let k = 0; k < reps; k++) out.set(x, k * x.length);
  return out;
};

mkdirSync(OUT, {recursive: true});
const BEDS = new Set(['hum', 'tension', 'klaxon']);
for (const [name, fn] of Object.entries(SOUNDS)) writeWav(name, BEDS.has(name) ? tile(fn()) : fn(), {loop: BEDS.has(name)});
