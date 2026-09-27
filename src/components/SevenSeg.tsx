import React from 'react';

// Segment order: a b c d e f g
const DIGITS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgedc',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  '-': 'g',
  ' ': '',
};

const hSeg = (x0: number, x1: number, y: number, t: number) =>
  [
    [x0, y],
    [x0 + t / 2, y - t / 2],
    [x1 - t / 2, y - t / 2],
    [x1, y],
    [x1 - t / 2, y + t / 2],
    [x0 + t / 2, y + t / 2],
  ]
    .map((p) => p.join(','))
    .join(' ');

const vSeg = (x: number, y0: number, y1: number, t: number) =>
  [
    [x, y0],
    [x + t / 2, y0 + t / 2],
    [x + t / 2, y1 - t / 2],
    [x, y1],
    [x - t / 2, y1 - t / 2],
    [x - t / 2, y0 + t / 2],
  ]
    .map((p) => p.join(','))
    .join(' ');

const segments = (w: number, h: number, t: number, g: number) => {
  const m = h / 2;
  return {
    a: hSeg(t / 2 + g, w - t / 2 - g, t / 2, t),
    b: vSeg(w - t / 2, t / 2 + g, m - g, t),
    c: vSeg(w - t / 2, m + g, h - t / 2 - g, t),
    d: hSeg(t / 2 + g, w - t / 2 - g, h - t / 2, t),
    e: vSeg(t / 2, m + g, h - t / 2 - g, t),
    f: vSeg(t / 2, t / 2 + g, m - g, t),
    g: hSeg(t / 2 + g, w - t / 2 - g, m, t),
  };
};

export type SevenSegProps = {
  text: string;
  digitWidth: number;
  digitHeight: number;
  thickness: number;
  color: string;
  offColor?: string;
  gap?: number;
  spacing?: number;
  skew?: number;
  glowColor?: string;
  style?: React.CSSProperties;
};

/**
 * Seven-segment readout, hand-built in SVG so every segment is addressable.
 * Supports digits, '-', ' ', ':', '.' and ','.
 */
export const SevenSeg: React.FC<SevenSegProps> = ({
  text,
  digitWidth: w,
  digitHeight: h,
  thickness: t,
  color,
  offColor = 'transparent',
  gap = 3,
  spacing = 0.35,
  skew = -8,
  glowColor,
  style,
}) => {
  const segs = segments(w, h, t, gap);
  const sepW = t * 2.2;
  let x = 0;
  const lit: React.ReactNode[] = [];
  const unlit: React.ReactNode[] = [];

  [...text].forEach((ch, i) => {
    if (ch === ':' || ch === '.' || ch === ',') {
      const cx = x + sepW / 2;
      const s = t * 0.9;
      const dot = (cy: number, k: string) => (
        <rect key={`${i}${k}`} x={cx - s / 2} y={cy - s / 2} width={s} height={s} fill={color} />
      );
      if (ch === ':') lit.push(dot(h * 0.3, 'u'), dot(h * 0.72, 'l'));
      else lit.push(dot(h - s / 2, 'b'));
      x += sepW + w * spacing * 0.5;
      return;
    }
    const on = DIGITS[ch] ?? '';
    (Object.keys(segs) as (keyof typeof segs)[]).forEach((k) => {
      const poly = (
        <polygon
          key={`${i}${k}`}
          transform={`translate(${x},0)`}
          points={segs[k]}
          fill={on.includes(k) ? color : offColor}
        />
      );
      (on.includes(k) ? lit : unlit).push(poly);
    });
    x += w + w * spacing;
  });

  const totalW = x;
  const skewPad = Math.abs(Math.tan((skew * Math.PI) / 180) * h);
  const skewT = `skewX(${skew}) translate(${skew < 0 ? skewPad : 0},0)`;
  const svgProps = {
    width: totalW + skewPad,
    height: h,
    viewBox: `0 0 ${totalW + skewPad} ${h}`,
  };

  // Unlit segments sit on their own layer so the glow only blooms off the lit ones.
  return (
    <div style={{position: 'relative', width: svgProps.width, height: h, ...style}}>
      <svg {...svgProps} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <g transform={skewT}>{unlit}</g>
      </svg>
      <svg
        {...svgProps}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'visible',
          filter: glowColor
            ? `drop-shadow(0 0 6px ${glowColor}) drop-shadow(0 0 22px ${glowColor}88)`
            : undefined,
        }}
      >
        <g transform={skewT}>{lit}</g>
      </svg>
    </div>
  );
};
