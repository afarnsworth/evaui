import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {blink, ease, flickerIn, lerp, scramble} from '../anim';
import {Camera, Vec3, boxEdges, polyPath, project, segmentsPath} from '../components/camera3d';
import {CutTear} from '../components/CRT';
import {Bed, Sfx, SfxAt} from '../components/Sfx';
import {SevenSeg} from '../components/SevenSeg';
import {C, F, glow} from '../theme';

// 迎撃予測 — a wireframe Tokyo-3 inside the Hakone caldera. A target is
// tracked in, the city drops its civilian blocks into the GeoFront, the
// weapon buildings rise, and the target is brought down.

const TRACK_AT = 60;
const ARM_AT = 100;
const FIRE_AT = 172;
const KILL_AT = 246;

const PHASES = [
  {jp: '探知', en: 'DETECT', at: 0},
  {jp: '追尾', en: 'TRACK', at: TRACK_AT},
  {jp: '兵装展開', en: 'ARM', at: ARM_AT},
  {jp: '迎撃', en: 'INTERCEPT', at: FIRE_AT},
];

const P0: Vec3 = [13, 10, 3];
const P1: Vec3 = [9, -3, 3.3];
const P2: Vec3 = [0, 0, 1.8];
const bez = (s: number): Vec3 =>
  [0, 1, 2].map((k) => (1 - s) ** 2 * P0[k] + 2 * (1 - s) * s * P1[k] + s ** 2 * P2[k]) as Vec3;
const S_END = 0.66;
const pathS = (f: number) => lerp(f, [18, KILL_AT], [0, S_END]);

type Building = {x: number; y: number; h0: number; weapon: boolean; grow: number; move: number; fireOrder: number};

const buildCity = (): Building[] => {
  const out: Building[] = [];
  for (let i = -4; i <= 4; i++) {
    for (let j = -4; j <= 4; j++) {
      const id = `${i},${j}`;
      if ((i === 0 && j === 0) || random(`skip-${id}`) < 0.18) continue;
      const d = Math.hypot(i, j);
      out.push({
        x: i * 1.05,
        y: j * 1.05,
        h0: 0.4 + random(`h-${id}`) * 1.5 + Math.max(0, 1 - d / 6) * 1.2,
        weapon: random(`w-${id}`) > 0.84,
        grow: 10 + d * 3 + random(`g-${id}`) * 6,
        move: random(`m-${id}`),
        fireOrder: random(`fo-${id}`),
      });
    }
  }
  const weapons = out.filter((b) => b.weapon).sort((a, b) => a.fireOrder - b.fireOrder);
  weapons.forEach((b, k) => (b.fireOrder = k));
  return out;
};

const circle3d = (r: number, z: number, n = 96, wobble?: (t: number) => number): Vec3[] =>
  Array.from({length: n}, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const rr = r + (wobble ? wobble(t) : 0);
    return [Math.cos(t) * rr, Math.sin(t) * rr, z] as Vec3;
  });

const buildingHeight = (b: Building, f: number) => {
  let h = b.h0 * lerp(f, [b.grow, b.grow + 12], [0, 1], ease.out);
  if (b.weapon) {
    const rise = ARM_AT + 12 + b.move * 20;
    h += lerp(f, [rise, rise + 16], [0, 1.5], ease.inOut);
  } else {
    const sink = ARM_AT + b.move * 26;
    h *= lerp(f, [sink, sink + 14], [1, 0.05], ease.in);
  }
  return h;
};

const octaEdges = (c: Vec3, a: number, rot: number): [Vec3, Vec3][] => {
  const r = (rot * Math.PI) / 180;
  const eq: Vec3[] = [0, 1, 2, 3].map((k) => {
    const t = r + (k * Math.PI) / 2;
    return [c[0] + Math.cos(t) * a, c[1] + Math.sin(t) * a, c[2]];
  });
  const top: Vec3 = [c[0], c[1], c[2] + a * 1.4];
  const bot: Vec3 = [c[0], c[1], c[2] - a * 1.4];
  const e: [Vec3, Vec3][] = [];
  eq.forEach((p, k) => e.push([p, eq[(k + 1) % 4]], [p, top], [p, bot]));
  return e;
};

const orange: React.CSSProperties = {
  color: C.orange,
  textShadow: glow(C.orange, 0.35),
  whiteSpace: 'nowrap',
  lineHeight: 1,
};

const Readout: React.FC<{label: string; jp: string; unit: string; value: string; frame: number; at: number; alert?: boolean}> = ({
  label,
  jp,
  unit,
  value,
  frame,
  at,
  alert,
}) => {
  const color = alert ? C.red : C.amber;
  return (
    <div style={{marginBottom: 26, opacity: flickerIn(frame, at, label)}}>
      <div style={{...orange, fontFamily: F.cond, fontWeight: 600, fontSize: 26, letterSpacing: 2, display: 'flex', gap: 12}}>
        <span style={{fontFamily: F.gothic, fontWeight: 900}}>{jp}</span>
        <span>{label}</span>
        <span style={{marginLeft: 'auto', opacity: 0.7}}>{unit}</span>
      </div>
      <div style={{borderTop: `2px solid ${C.orange}88`, marginTop: 8, paddingTop: 10, display: 'flex', justifyContent: 'flex-end'}}>
        <SevenSeg text={value} digitWidth={40} digitHeight={72} thickness={9} gap={1.5} spacing={0.3} color={color} offColor="#1a0e02" glowColor={color} />
      </div>
    </div>
  );
};

const TacticalSound: React.FC<{fireFrames: number[]}> = ({fireFrames}) => (
  <>
    <Bed name="hum" to={300} volume={0.3} />
    <Sfx at={0} name="static" volume={0.35} />
    <Sfx at={0} name="power-on" volume={0.4} />
    <SfxAt frames={[6, 9, 12, 15]} name="blip-lo" volume={0.2} />
    <SfxAt frames={[10, 13, 16, 19, 22]} name="blip" volume={0.22} />
    <Sfx at={10} name="chatter" volume={0.25} />
    <Sfx at={TRACK_AT} name="ping" volume={0.6} />
    <Sfx at={ARM_AT} name="stamp" volume={0.45} />
    <Sfx at={ARM_AT + 2} name="rumble" volume={0.8} />
    <Sfx at={ARM_AT + 18} name="rumble" volume={0.7} />
    <Bed name="klaxon" from={ARM_AT} to={KILL_AT} volume={0.16} />
    <Bed name="tension" from={ARM_AT} to={KILL_AT + 10} volume={0.3} fade={16} />
    <SfxAt frames={fireFrames} name="zap" volume={0.4} />
    <Sfx at={KILL_AT} name="impact" volume={0.65} />
    <Sfx at={KILL_AT} name="boom" volume={0.45} />
    <Sfx at={KILL_AT + 10} name="stamp" volume={0.5} />
  </>
);

export const Tactical: React.FC = () => {
  const frame = useCurrentFrame();
  const city = useMemo(buildCity, []);
  const weapons = city.filter((b) => b.weapon);

  const alive = frame < KILL_AT;
  const s = pathS(frame);
  const tgt = bez(s);

  // Beams: each weapon building fires once, in order.
  const beams = weapons
    .map((b) => {
      const start = FIRE_AT + b.fireOrder * 6;
      const on = frame >= start && frame < start + 7;
      return {b, start, on};
    })
    .filter((x) => x.on && alive);
  const hits = weapons.filter((b) => frame >= FIRE_AT + b.fireOrder * 6 + 2).length;
  const recentHit = weapons.some((b) => {
    const t = frame - (FIRE_AT + b.fireOrder * 6);
    return t >= 0 && t < 3;
  });

  const shakeAmt = (recentHit ? 6 : 0) + (frame >= KILL_AT ? lerp(frame, [KILL_AT, KILL_AT + 18], [30, 0]) : 0);
  const cam: Camera = {
    yaw: lerp(frame, [0, 300], [22, 78], ease.inOut),
    pitch: lerp(frame, [0, 300], [58, 36], ease.inOut),
    dist: lerp(frame, [0, 300], [27, 20], ease.inOut),
    focal: 1500,
    cx: 840 + (random(`tx-${frame}`) - 0.5) * shakeAmt,
    cy: 650 + (random(`ty-${frame}`) - 0.5) * shakeAmt,
  };

  // --- static-ish geometry ---
  const gridSegs: [Vec3, Vec3][] = [];
  for (let k = -14; k <= 14; k++) {
    gridSegs.push([[k, -14, 0], [k, 14, 0]], [[-14, k, 0], [14, k, 0]]);
  }
  const contours = Array.from({length: 8}, (_, k) =>
    circle3d(8.2 + k * 0.62, k * 0.34, 120, (t) => 0.6 * Math.sin(3 * t + k * 0.3) + 0.35 * Math.sin(5 * t + 1.3) + 0.2 * Math.sin(9 * t + k)),
  );

  const civil: [Vec3, Vec3][] = [];
  const armed: [Vec3, Vec3][] = [];
  city.forEach((b) => {
    const h = buildingHeight(b, frame);
    if (h <= 0.001) return;
    (b.weapon ? armed : civil).push(...boxEdges(b.x, b.y, 0.56, h));
  });

  // GeoFront beneath the grid
  const geo = circle3d(4.4, -2.6, 96);
  const pyramid: [Vec3, Vec3][] = [
    ...([[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]] as [number, number][]).flatMap(([x, y], i, arr) => {
      const [nx, ny] = arr[(i + 1) % 4];
      return [
        [[x, y, -2.6], [nx, ny, -2.6]] as [Vec3, Vec3],
        [[x, y, -2.6], [0, 0, -1.5]] as [Vec3, Vec3],
      ];
    }),
  ];

  // Target visuals
  const trail = Array.from({length: 24}, (_, i) => bez(Math.max(0, s - 0.22) + (Math.min(s, 0.22) * i) / 23));
  const predicted = Array.from({length: 24}, (_, i) => bez(s + ((1 - s) * i) / 23));
  const tp = project(cam, tgt);
  const ground = project(cam, [tgt[0], tgt[1], 0]);

  // Explosion
  const boom = lerp(frame, [KILL_AT, KILL_AT + 26], [0, 3.4], ease.out);
  const boomOp = lerp(frame, [KILL_AT + 8, KILL_AT + 44], [1, 0]);
  const shards = octaEdges(tgt, 0.6, frame * 4).map(([a, b]) => {
    const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const d: Vec3 = [mid[0] - tgt[0], mid[1] - tgt[1], mid[2] - tgt[2]];
    const k = boom * 1.6;
    return [
      [a[0] + d[0] * k, a[1] + d[1] * k, a[2] + d[2] * k - boom * boom * 0.2],
      [b[0] + d[0] * k, b[1] + d[1] * k, b[2] + d[2] * k - boom * boom * 0.2],
    ] as [Vec3, Vec3];
  });

  const reveal = (start: number, dur = 24) => lerp(frame, [start, start + dur], [0, 1], ease.out);
  const phaseIdx = PHASES.reduce((acc, p, i) => (frame >= p.at ? i : acc), 0);

  // Readout values
  const distKm = Math.hypot(tgt[0], tgt[1]);
  const speed = 1.21 + Math.sin(frame * 0.3) * 0.02;
  const eta = ((1 - s) / (S_END / (KILL_AT - 18))) / 30;
  const dead = !alive;
  const v = (str: string) => (dead ? (blink(frame, 6, 6) ? '--.-' : '    ') : str);

  return (
    <AbsoluteFill style={{backgroundColor: '#010302'}}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <filter id="tac-bloom" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path d={segmentsPath(cam, gridSegs)} stroke={C.greenDeep} strokeWidth={1.5} opacity={reveal(0, 10) * 0.9} fill="none" />

        {/* GeoFront, seen through the ground */}
        <g opacity={reveal(20) * 0.75} fill="none" stroke={C.orange} strokeWidth={2}>
          <path d={polyPath(cam, geo, true)} strokeDasharray="10 8" />
          <path d={segmentsPath(cam, pyramid)} />
        </g>

        <g filter="url(#tac-bloom)" fill="none">
          {[3, 6, 9].map((r) => (
            <path key={r} d={polyPath(cam, circle3d(r, 0.01), true)} stroke={C.greenDim} strokeWidth={2} strokeDasharray="4 6" opacity={reveal(6)} />
          ))}
          {contours.map((pts, k) => (
            <path
              key={k}
              d={polyPath(cam, pts, true)}
              stroke={k > 4 ? C.lime : C.greenSoft}
              strokeWidth={2}
              pathLength={1}
              strokeDasharray={`${reveal(4 + k * 3, 30)} 1`}
              opacity={0.45 + k * 0.06}
            />
          ))}
          <path d={segmentsPath(cam, civil)} stroke={C.green} strokeWidth={1.8} opacity={0.85} />
          <path d={segmentsPath(cam, armed)} stroke={frame >= ARM_AT + 12 ? C.orange : C.green} strokeWidth={2.4} />

          {/* Beams */}
          {beams.map(({b, start}) => {
            const top = project(cam, [b.x, b.y, buildingHeight(b, frame)]);
            return (
              <line
                key={start}
                x1={top.x}
                y1={top.y}
                x2={tp.x}
                y2={tp.y}
                stroke={(frame - start) % 2 ? '#fff' : C.orange}
                strokeWidth={(frame - start) % 2 ? 3 : 6}
              />
            );
          })}

          {/* Target */}
          {frame >= 18 && alive && (
            <>
              <path d={polyPath(cam, trail)} stroke={C.orange} strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" />
              {frame >= TRACK_AT && (
                <path d={polyPath(cam, predicted)} stroke={C.red} strokeWidth={2.5} strokeDasharray="14 10" opacity={0.4 + 0.6 * blink(frame, 6, 4)} />
              )}
              <line x1={tp.x} y1={tp.y} x2={ground.x} y2={ground.y} stroke={C.orange} strokeWidth={1.5} strokeDasharray="4 6" />
              <path d={`M${ground.x - 14} ${ground.y}h28M${ground.x} ${ground.y - 9}v18`} stroke={C.orange} strokeWidth={2} />
              <path
                d={segmentsPath(cam, octaEdges(tgt, 0.6, frame * 4))}
                stroke={recentHit ? '#fff' : C.orange}
                strokeWidth={3}
              />
              {frame >= TRACK_AT && (
                <g stroke={C.red} strokeWidth={3} opacity={blink(frame, 4, 2) ? 1 : 0.4}>
                  {[0, 1, 2, 3].map((k) => {
                    const r = 60;
                    const a = (k * Math.PI) / 2 + Math.PI / 4;
                    const x = tp.x + Math.cos(a) * r;
                    const y = tp.y + Math.sin(a) * r;
                    const sx = Math.sign(Math.cos(a));
                    const sy = Math.sign(Math.sin(a));
                    return <path key={k} d={`M${x} ${y - sy * 18}V${y}H${x - sx * 18}`} fill="none" />;
                  })}
                </g>
              )}
            </>
          )}

          {/* Kill */}
          {frame >= KILL_AT && boomOp > 0 && (
            <g opacity={boomOp}>
              <path d={segmentsPath(cam, shards)} stroke={C.orange} strokeWidth={3} />
              <path d={polyPath(cam, circle3d(boom, 0, 48).map(([x, y]) => [x + tgt[0], y + tgt[1], tgt[2]] as Vec3), true)} stroke="#fff" strokeWidth={3} />
              <path
                d={polyPath(cam, circle3d(boom * 0.8, 0, 48).map(([x, y]) => [x + tgt[0], tgt[1], y + tgt[2]] as Vec3), true)}
                stroke={C.orange}
                strokeWidth={3}
              />
              <path
                d={polyPath(cam, circle3d(boom * 0.8, 0, 48).map(([x, y]) => [tgt[0], x + tgt[1], y + tgt[2]] as Vec3), true)}
                stroke={C.red}
                strokeWidth={3}
              />
            </g>
          )}
        </g>

        {/* Target callout */}
        {frame >= 22 && alive && (
          <g opacity={flickerIn(frame, 22, 'callout')}>
            <path d={`M${tp.x + 44} ${tp.y + 44}L${tp.x + 100} ${tp.y + 100}H${tp.x + 340}`} stroke={C.orange} strokeWidth={2} fill="none" />
            <text x={tp.x + 108} y={tp.y + 90} fontFamily={F.gothic} fontWeight={900} fontSize={32} fill={C.orange}>
              目標
            </text>
            <text x={tp.x + 180} y={tp.y + 90} fontFamily={F.cond} fontWeight={700} fontSize={30} letterSpacing={2} fill={C.orange}>
              TGT-07
            </text>
            <text x={tp.x + 108} y={tp.y + 132} fontFamily={F.cond} fontWeight={600} fontSize={24} letterSpacing={2} fill={frame >= TRACK_AT ? C.red : C.orange}>
              {frame >= TRACK_AT ? scramble('LOCKED · PATTERN BLUE', frame, TRACK_AT, 12, 'lock') : 'ACQUIRING'}
            </text>
          </g>
        )}

        {/* Ground labels */}
        <g opacity={reveal(12)} fontFamily={F.cond} fontWeight={600} fontSize={22} letterSpacing={2}>
          {[3, 6, 9].map((r) => {
            const p = project(cam, [r, 0, 0]);
            return (
              <text key={r} x={p.x + 8} y={p.y - 6} fill={C.greenSoft}>
                {r}KM
              </text>
            );
          })}
          {(() => {
            const p = project(cam, [0, 0, -2.6]);
            return (
              <text x={p.x + 60} y={p.y + 40} fill={C.orange} opacity={0.8}>
                GEOFRONT −2.6KM
              </text>
            );
          })()}
        </g>
      </svg>

      {/* Title block */}
      <div style={{position: 'absolute', left: 40, top: 36, padding: 18, background: 'rgba(1,3,2,0.82)', display: 'flex', gap: 22, alignItems: 'center', opacity: flickerIn(frame, 2, 'title')}}>
        <div style={{...orange, background: C.orange, color: '#000', textShadow: 'none', fontFamily: F.gothic, fontWeight: 900, fontSize: 56, padding: '8px 16px'}}>
          迎撃予測
        </div>
        <div>
          <div style={{...orange, fontFamily: F.cond, fontWeight: 700, fontSize: 44, letterSpacing: 3}}>INTERCEPT FORECAST</div>
          <div style={{...orange, fontFamily: F.cond, fontWeight: 600, fontSize: 26, letterSpacing: 3, marginTop: 6, opacity: 0.8}}>
            第3新東京市 · TOKYO-3 · HAKONE CALDERA GRID
          </div>
        </div>
      </div>

      {/* Readouts */}
      <div style={{position: 'absolute', right: 40, top: 40, width: 330, padding: 20, background: 'rgba(1,3,2,0.82)'}}>
        <Readout label="RANGE" jp="距離" unit="KM" value={v(distKm.toFixed(1).padStart(4, ' '))} frame={frame} at={10} alert={dead} />
        <Readout label="ALTITUDE" jp="高度" unit="×100M" value={v((tgt[2] * 10).toFixed(1).padStart(4, ' '))} frame={frame} at={13} alert={dead} />
        <Readout label="VELOCITY" jp="速度" unit="KM/S" value={v(speed.toFixed(2))} frame={frame} at={16} alert={dead} />
        <Readout label="IMPACT ETA" jp="到達" unit="SEC" value={v(eta.toFixed(1).padStart(4, ' '))} frame={frame} at={19} alert={frame >= ARM_AT || dead} />
        <div style={{...orange, fontFamily: F.cond, fontWeight: 700, fontSize: 30, letterSpacing: 2, opacity: flickerIn(frame, FIRE_AT, 'hits')}}>
          {frame >= FIRE_AT ? `命中 HITS  ${String(hits).padStart(2, '0')} / ${String(weapons.length).padStart(2, '0')}` : ''}
        </div>
      </div>

      {/* Phase strip */}
      <div style={{position: 'absolute', left: 60, bottom: 54, display: 'flex', gap: 14}}>
        {PHASES.map((p, i) => {
          const active = i === phaseIdx && alive;
          const done = i < phaseIdx || !alive;
          return (
            <div
              key={p.en}
              style={{
                width: 230,
                height: 86,
                padding: 8,
                background: 'linear-gradient(180deg, #7ef06a, #2fb150)',
                opacity: flickerIn(frame, 6 + i * 3, p.en),
              }}
            >
              <div style={{position: 'relative', height: '100%', background: '#050505', border: `2px solid ${C.orange}`, overflow: 'hidden'}}>
                {active && (
                  <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: '44%', background: blink(frame, 5, 3) ? C.red : C.redDeep}} />
                )}
                <div
                  style={{
                    ...orange,
                    color: done ? C.green : C.orange,
                    textShadow: glow(done ? C.green : C.orange, 0.35),
                    position: 'absolute',
                    top: 8,
                    width: '100%',
                    textAlign: 'center',
                  }}
                >
                  <span style={{fontFamily: F.gothic, fontWeight: 900, fontSize: 28}}>{p.jp}</span>
                  <span style={{fontFamily: F.cond, fontWeight: 700, fontSize: 24, letterSpacing: 2, marginLeft: 10}}>{p.en}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      {frame >= KILL_AT + 10 && (
        <div
          style={{
            position: 'absolute',
            left: 470,
            top: 380,
            padding: '18px 44px 22px',
            background: blink(frame - KILL_AT - 10, 3, 2) || frame > KILL_AT + 22 ? C.orange : '#000',
            border: `5px solid ${C.orange}`,
            boxShadow: `0 0 50px ${C.orange}`,
            textAlign: 'center',
            lineHeight: 1,
            transform: `scale(${lerp(frame, [KILL_AT + 10, KILL_AT + 15], [1.3, 1], ease.out)})`,
          }}
        >
          <div style={{fontFamily: F.mincho, fontWeight: 800, fontSize: 150, color: '#000', transform: 'scale(0.88,1.15)'}}>目標沈黙</div>
          <div style={{fontFamily: F.cond, fontWeight: 700, fontSize: 48, letterSpacing: 6, color: '#000', marginTop: 20}}>TARGET SILENCED</div>
        </div>
      )}

      <AbsoluteFill
        style={{backgroundColor: C.orange, mixBlendMode: 'screen', opacity: frame >= KILL_AT ? lerp(frame, [KILL_AT, KILL_AT + 8], [0.8, 0]) : 0}}
      />
      <TacticalSound fireFrames={weapons.map((b) => FIRE_AT + b.fireOrder * 6)} />
      <CutTear frames={3} />
    </AbsoluteFill>
  );
};
