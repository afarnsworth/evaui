import {Easing, interpolate, random} from 'remotion';

export const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

export const lerp = (
  frame: number,
  [f0, f1]: [number, number],
  [v0, v1]: [number, number],
  ease: (t: number) => number = (t) => t,
) => interpolate(frame, [f0, f1], [v0, v1], {...clamp, easing: ease});

export const ease = {
  out: Easing.out(Easing.cubic),
  in: Easing.in(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  expoOut: Easing.out(Easing.exp),
};

/**
 * CRT-style power-on: an element pops in, stutters for a few frames, then
 * holds. Returns an opacity.
 */
export const flickerIn = (frame: number, start: number, seed: string | number = 0) => {
  const t = frame - start;
  if (t < 0) return 0;
  if (t === 0) return 1;
  if (t >= 7) return 1;
  return random(`flicker-${seed}-${t}`) > 0.42 ? 1 : 0.12;
};

/** Hard on/off blink, `on` frames lit then `off` frames dark. */
export const blink = (frame: number, on = 8, off = 6, phase = 0) =>
  (frame + phase) % (on + off) < on ? 1 : 0;

const GLYPHS = '0123456789ABCDEF#$%&@*+=<>/\\';

/**
 * Decode-style reveal: characters lock in left to right, the rest cycle
 * through noise glyphs.
 */
export const scramble = (
  text: string,
  frame: number,
  start: number,
  duration: number,
  seed: string | number = 0,
) => {
  const t = frame - start;
  if (t < 0) return '';
  const locked = Math.floor((t / duration) * text.length);
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (i < locked || ch === ' ') out += ch;
    else if (i < locked + 6)
      out += GLYPHS[Math.floor(random(`s-${seed}-${i}-${frame}`) * GLYPHS.length)];
  }
  return out;
};

export const pad = (n: number, width: number) => {
  const s = String(Math.max(0, Math.floor(n)));
  return s.length >= width ? s : '0'.repeat(width - s.length) + s;
};

export const commas = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Frames in [from, to) where `fn` returns a different value than the frame before. */
export const changeFrames = <T,>(from: number, to: number, fn: (f: number) => T) => {
  const out: number[] = [];
  for (let f = from; f < to; f++) if (fn(f) !== fn(f - 1)) out.push(f);
  return out;
};
