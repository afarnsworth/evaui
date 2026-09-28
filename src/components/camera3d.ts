// Minimal perspective camera for drawing wireframes straight into SVG.
// World is z-up; the camera orbits the origin at `yaw`, looks down at `pitch`.

export type Vec3 = [number, number, number];

export type Camera = {
  yaw: number; // degrees
  pitch: number; // degrees below horizontal
  dist: number;
  focal: number;
  cx: number;
  cy: number;
};

export type Projected = {x: number; y: number; depth: number};

export const project = (cam: Camera, [x, y, z]: Vec3): Projected => {
  const yaw = (cam.yaw * Math.PI) / 180;
  const p = (cam.pitch * Math.PI) / 180;
  const x1 = x * Math.cos(yaw) - y * Math.sin(yaw);
  const y1 = x * Math.sin(yaw) + y * Math.cos(yaw);
  const up = y1 * Math.sin(p) + z * Math.cos(p);
  const depth = y1 * Math.cos(p) - z * Math.sin(p) + cam.dist;
  return {
    x: cam.cx + (cam.focal * x1) / depth,
    y: cam.cy - (cam.focal * up) / depth,
    depth,
  };
};

const f1 = (n: number) => n.toFixed(1);

/** Build one SVG path string from many 3D line segments. */
export const segmentsPath = (cam: Camera, segs: [Vec3, Vec3][]) =>
  segs
    .map(([a, b]) => {
      const p = project(cam, a);
      const q = project(cam, b);
      return `M${f1(p.x)} ${f1(p.y)}L${f1(q.x)} ${f1(q.y)}`;
    })
    .join('');

/** Build an SVG polyline path from a 3D point list. */
export const polyPath = (cam: Camera, pts: Vec3[], closed = false) =>
  pts
    .map((pt, i) => {
      const p = project(cam, pt);
      return `${i ? 'L' : 'M'}${f1(p.x)} ${f1(p.y)}`;
    })
    .join('') + (closed ? 'Z' : '');

/** The 12 edges of an axis-aligned box standing on z = z0. */
export const boxEdges = (x: number, y: number, w: number, h: number, z0 = 0): [Vec3, Vec3][] => {
  const s = w / 2;
  const c: Vec3[] = [
    [x - s, y - s, z0],
    [x + s, y - s, z0],
    [x + s, y + s, z0],
    [x - s, y + s, z0],
  ];
  const t = c.map(([a, b]) => [a, b, z0 + h] as Vec3);
  const e: [Vec3, Vec3][] = [];
  for (let i = 0; i < 4; i++) {
    e.push([c[i], c[(i + 1) % 4]], [t[i], t[(i + 1) % 4]], [c[i], t[i]]);
  }
  return e;
};
