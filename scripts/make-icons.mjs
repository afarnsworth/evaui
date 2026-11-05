// Draws the tracker's app icons (a NERV hexagon around a seven-segment "20")
// with a tiny polygon rasterizer and PNG encoder, so no image tooling is needed.
import {mkdirSync, writeFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';

const OUT = 'tracker/icons';
const BG = [3, 5, 4];
const ORANGE = [255, 140, 26];
const AMBER = [255, 169, 31];
const AMBER_OFF = [42, 26, 6];
const GREEN = [70, 255, 138];

// --- geometry (unit square, y down) -------------------------------------------

const hexagon = (cx, cy, r) =>
  Array.from({length: 6}, (_, k) => {
    const a = (Math.PI / 3) * k;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });

// Seven-segment digits, same proportions and slant as the tracker readout.
const SEGS = {'0': 'abcdef', '2': 'abged'};
const W = 100, H = 190, T = 20, G = 3, SP = 0.3, SLANT = Math.tan((8 * Math.PI) / 180);
const hSeg = (x0, x1, y) => [[x0, y], [x0 + T / 2, y - T / 2], [x1 - T / 2, y - T / 2], [x1, y], [x1 - T / 2, y + T / 2], [x0 + T / 2, y + T / 2]];
const vSeg = (x, y0, y1) => [[x, y0], [x + T / 2, y0 + T / 2], [x + T / 2, y1 - T / 2], [x, y1], [x - T / 2, y1 - T / 2], [x - T / 2, y0 + T / 2]];
const M = H / 2;
const POLY = {
  a: hSeg(T / 2 + G, W - T / 2 - G, T / 2),
  b: vSeg(W - T / 2, T / 2 + G, M - G),
  c: vSeg(W - T / 2, M + G, H - T / 2 - G),
  d: hSeg(T / 2 + G, W - T / 2 - G, H - T / 2),
  e: vSeg(T / 2, M + G, H - T / 2 - G),
  f: vSeg(T / 2, T / 2 + G, M - G),
  g: hSeg(T / 2 + G, W - T / 2 - G, M),
};

const digits = (text, cx, cy, width) => {
  const total = text.length * W * (1 + SP) - W * SP + SLANT * H;
  const s = width / total;
  const x0 = cx - width / 2;
  const y0 = cy - (H * s) / 2;
  const on = [];
  const off = [];
  [...text].forEach((ch, i) => {
    const dx = i * W * (1 + SP);
    for (const k of 'abcdefg') {
      const poly = POLY[k].map(([x, y]) => [x0 + (x + dx + SLANT * (H - y)) * s, y0 + y * s]);
      (SEGS[ch].includes(k) ? on : off).push(poly);
    }
  });
  return {on, off};
};

// Skewed gauge cells under the readout, like the tracker's life-support bar.
const cells = (cx, cy, width, height, count) => {
  const gap = width * 0.03;
  const w = (width - gap * (count - 1)) / count;
  const lean = height * 0.36;
  return Array.from({length: count}, (_, i) => {
    const x = cx - width / 2 + i * (w + gap);
    return [[x + lean, cy - height / 2], [x + w + lean, cy - height / 2], [x + w, cy + height / 2], [x, cy + height / 2]];
  });
};

// Everything sits inside the central 80% circle, so one drawing serves as both
// a regular and a maskable icon.
const scene = () => {
  const {on, off} = digits('20', 0.5, 0.46, 0.46);
  return [
    {color: ORANGE, polys: [hexagon(0.5, 0.5, 0.385), hexagon(0.5, 0.5, 0.35)]}, // even-odd → ring
    {color: AMBER_OFF, polys: off},
    {color: AMBER, polys: on},
    {color: GREEN, polys: cells(0.5, 0.69, 0.38, 0.035, 6)},
  ];
};

// --- rasterizer: even-odd scanline fill, 4×4 supersampling -------------------

const SS = 4;
const raster = (size, shapes) => {
  const acc = new Float32Array(size * size * 3);
  const row = new Int16Array(size * SS);
  const scaled = shapes.map((s) => ({color: s.color, polys: s.polys.map((p) => p.map(([x, y]) => [x * size, y * size]))}));
  for (let sy = 0; sy < size * SS; sy++) {
    const y = (sy + 0.5) / SS;
    row.fill(-1);
    scaled.forEach((shape, si) => {
      const xs = [];
      for (const poly of shape.polys) {
        for (let i = 0; i < poly.length; i++) {
          const [ax, ay] = poly[i];
          const [bx, by] = poly[(i + 1) % poly.length];
          if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const from = Math.max(0, Math.ceil(xs[i] * SS - 0.5));
        const to = Math.min(size * SS - 1, Math.floor(xs[i + 1] * SS - 0.5));
        for (let sx = from; sx <= to; sx++) row[sx] = si;
      }
    });
    const py = Math.floor(sy / SS);
    for (let sx = 0; sx < size * SS; sx++) {
      const c = row[sx] < 0 ? BG : scaled[row[sx]].color;
      const o = (py * size + Math.floor(sx / SS)) * 3;
      acc[o] += c[0];
      acc[o + 1] += c[1];
      acc[o + 2] += c[2];
    }
  }
  const px = new Uint8Array(size * size * 3);
  for (let i = 0; i < px.length; i++) px[i] = Math.round(acc[i] / (SS * SS));
  return px;
};

// --- PNG ------------------------------------------------------------------------

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const png = (size, rgb) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor RGB
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    Buffer.from(rgb.buffer, y * size * 3, size * 3).copy(raw, y * (size * 3 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, {level: 9})),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

mkdirSync(OUT, {recursive: true});
for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180], ['favicon-32.png', 32]]) {
  writeFileSync(`${OUT}/${name}`, png(size, raster(size, scene())));
  console.log(`${OUT}/${name}`);
}
