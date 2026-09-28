import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {blink, commas, ease, flickerIn, lerp, pad, changeFrames} from '../anim';
import {CutTear} from '../components/CRT';
import {Bed, Sfx, SfxAt} from '../components/Sfx';
import {C, F, glow} from '../theme';

// The MAGI defense screen: concentric data rings spinning around the three
// MAGI cores. Midway through, something starts eating the rings from the
// outside in.

const CX = 960;
const CY = 540;
const INTRUSION_START = 88;
const INTRUSION_END = 215;

type Ring = {
  r: number;
  kind: 'glyph' | 'rail' | 'tick';
  speed: number;
  size: number;
  text: string;
  dash: string;
  level: number;
};

const GLYPHS = ['S', '5', 'Ƨ', 'S', 'S', '2'];

const buildRings = (): Ring[] =>
  Array.from({length: 17}, (_, i) => {
    const r = 150 + i * 56;
    const rnd = (k: string) => random(`ring-${i}-${k}`);
    const kind = (['glyph', 'rail', 'tick'] as const)[i % 3];
    const size = 17 + r * 0.012;
    const advance = size * 0.5 + 2;
    const target = Math.floor((2 * Math.PI * r) / advance);
    let text = '';
    let g = 0;
    while (text.length < target) {
      const len = 2 + Math.floor(random(`g-${i}-${g}`) * 8);
      const ch = GLYPHS[Math.floor(random(`c-${i}-${g}`) * GLYPHS.length)];
      text += ch.repeat(len) + ' '.repeat(1 + Math.floor(random(`sp-${i}-${g}`) * 3));
      g++;
    }
    const dash = Array.from({length: 6}, (_, k) => Math.round(20 + random(`d-${i}-${k}`) * 160)).join(' ');
    return {
      r,
      kind,
      speed: (i % 2 ? 1 : -1) * (0.12 + rnd('s') * 0.32),
      size,
      text: text.slice(0, target),
      dash,
      level: 0.55 + rnd('l') * 0.45,
    };
  });

const circlePath = (r: number) =>
  `M ${CX - r} ${CY} a ${r} ${r} 0 1 1 ${2 * r} 0 a ${r} ${r} 0 1 1 ${-2 * r} 0`;

// Circuit-trace spokes that anchor the ring stack to the frame edges.
const Spoke: React.FC<{angle: number; from: number; to: number}> = ({angle, from, to}) => {
  const bumps = [];
  for (let x = from + 30; x < to; x += 90) bumps.push(x);
  return (
    <g transform={`rotate(${angle} ${CX} ${CY}) translate(${CX} ${CY})`}>
      {[-22, 22].map((o) => (
        <line key={o} x1={from} y1={o} x2={to} y2={o} stroke="#fff" strokeWidth={3} />
      ))}
      {bumps.map((x) => (
        <path key={x} d={`M ${x} -22 v -14 h 36 v 14 M ${x + 44} 22 v 14 h 30 v -14`} stroke="#fff" strokeWidth={3} fill="none" />
      ))}
    </g>
  );
};

const LABELS = ['CELEBRUM', 'CELEBELLUM', 'CALLOSUM', 'OBLONGATE'];
const BLADES = [
  {name: 'MELCHIOR-1', angle: -8},
  {name: 'BALTHASAR-2', angle: -128},
  {name: 'CASPER-3', angle: 112},
];

const Blade: React.FC<{name: string; angle: number; index: number; frame: number; color: string}> = ({
  name,
  angle,
  index,
  frame,
  color,
}) => {
  const k = 0.42;
  const h = 40;
  const x0 = 78;
  const x1 = 330;
  const flip = Math.abs(angle) > 90;
  const rows = [name, ...LABELS];
  return (
    <g transform={`translate(${CX} ${CY}) rotate(${angle})`}>
      {rows.map((label, j) => {
        const start = 14 + index * 7 + j * 4;
        const grow = lerp(frame, [start, start + 7], [0, 1], ease.out);
        const op = flickerIn(frame, start, `blade-${index}-${j}`);
        if (grow <= 0) return null;
        const y = -((rows.length * h) / 2) + j * h;
        const xe = x0 + (x1 - x0) * grow;
        const pts = [
          [x0 + k * y, y],
          [xe + k * y, y],
          [xe + k * (y + h), y + h],
          [x0 + k * (y + h), y + h],
        ]
          .map((p) => p.join(','))
          .join(' ');
        const isName = j === 0;
        const tx = x0 + k * (y + h / 2) + 14;
        const ty = y + h / 2;
        return (
          <g key={j} opacity={op}>
            <polygon points={pts} fill={isName ? color : '#050302'} stroke={color} strokeWidth={3} />
            {grow > 0.7 && (
              <text
                x={tx}
                y={ty}
                transform={flip ? `rotate(180 ${tx + 110} ${ty})` : undefined}
                dominantBaseline="central"
                fontFamily={F.cond}
                fontWeight={700}
                fontSize={isName ? 25 : 27}
                letterSpacing={1}
                fill={isName ? '#000' : color}
              >
                {label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

const CornerBox: React.FC<{
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  title: string;
  sub: string;
  big?: boolean;
  opacity: number;
  color?: string;
}> = ({title, sub, big, opacity, color = C.orange, ...pos}) => (
  <div style={{position: 'absolute', ...pos, opacity, display: 'flex', alignItems: 'stretch', gap: 10}}>
    <div style={{width: 10, background: color, borderRadius: 3, boxShadow: glow(color, 0.5)}} />
    <div
      style={{
        border: `3px solid ${color}`,
        borderRadius: 10,
        padding: '8px 18px 10px',
        background: 'rgba(0,0,0,0.82)',
        boxShadow: `0 0 16px ${color}66`,
        color,
        textShadow: glow(color, 0.35),
        fontFamily: F.cond,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      <div style={{fontWeight: 700, fontSize: big ? 30 : 38, letterSpacing: 0.5}}>{title}</div>
      <div style={{fontWeight: 700, fontSize: big ? 60 : 28, marginTop: big ? 6 : 6, textAlign: big ? 'right' : 'left'}}>
        {sub}
      </div>
    </div>
    <div style={{width: 10, background: color, borderRadius: 3, boxShadow: glow(color, 0.5)}} />
  </div>
);

const radiusAt = (f: number) => lerp(f, [INTRUSION_START, INTRUSION_END], [1150, 120], ease.inOut);
const BREACH_AT = changeFrames(INTRUSION_START, INTRUSION_END, (f) => radiusAt(f) < 340)[0];

const MagiDefenseSound: React.FC = () => (
  <>
    <Bed name="hum" to={240} volume={0.35} />
    <Sfx at={0} name="static" volume={0.35} />
    <Sfx at={0} name="chatter" volume={0.3} />
    <SfxAt frames={[14, 21, 28]} name="blip" volume={0.3} />
    <SfxAt frames={[22, 26, 30, 34]} name="blip-lo" volume={0.25} />
    <SfxAt frames={[45, 130, 190]} name="chatter2" volume={0.2} />
    <Sfx at={INTRUSION_START} name="glitch" volume={0.5} />
    <Bed name="klaxon" from={INTRUSION_START + 4} to={240} volume={0.18} />
    <Bed name="tension" from={INTRUSION_START} to={240} volume={0.3} fade={30} />
    <SfxAt frames={[118, 146, 172]} name="glitch" volume={0.35} />
    <Sfx at={BREACH_AT} name="impact" volume={0.7} />
    <Sfx at={192} name="riser" volume={0.4} />
  </>
);

export const MagiDefense: React.FC = () => {
  const frame = useCurrentFrame();
  const rings = useMemo(buildRings, []);

  const R = radiusAt(frame);
  const zoom = lerp(frame, [0, 240], [1.08, 1.0], ease.out) * lerp(frame, [150, 240], [1, 1.22], ease.in);
  const breached = R < 340;
  const bladeColor = breached ? (blink(frame, 3, 2) ? C.red : C.orange) : C.orange;

  const collapse = lerp(frame, [INTRUSION_START, 236], [0, 0.9994], (t) => t ** 2.4);
  const remaining = Math.floor(223231 * (1 - collapse) - Math.min(frame, INTRUSION_START) * 1.3);
  const raised = 7 + Math.floor(frame / 30);

  const outsidePath = `M -400 -400 H 2320 V 1480 H -400 Z ${circlePath(R)} Z`;

  return (
    <AbsoluteFill style={{backgroundColor: '#010201'}}>
      <AbsoluteFill style={{transform: `scale(${zoom})`}}>
        <svg width={1920} height={1080} viewBox="0 0 1920 1080">
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="0" y2="1080" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#56ff94" />
              <stop offset="0.5" stopColor="#3fe07c" />
              <stop offset="0.78" stopColor="#9fcf4a" />
              <stop offset="1" stopColor="#ff5a24" />
            </linearGradient>
            <filter id="bloom" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {rings.map((ring, i) => (
              <path key={i} id={`ring-${i}`} d={circlePath(ring.r)} />
            ))}
            <mask id="ringMask" maskUnits="userSpaceOnUse" x="-400" y="-400" width="2720" height="1880">
              <rect x="-400" y="-400" width="2720" height="1880" fill="#000" />
              {[0, 180].map((a) => (
                <g key={a} opacity={flickerIn(frame, 20, `spoke-${a}`) * 0.6}>
                  <Spoke angle={a} from={640} to={1100} />
                </g>
              ))}
              {rings.map((ring, i) => {
                const op = flickerIn(frame, i * 1.5, `ring-${i}`) * ring.level;
                if (op === 0) return null;
                const rot = ring.speed * frame;
                const gray = Math.round(op * 255);
                const fill = `rgb(${gray},${gray},${gray})`;
                return (
                  <g key={i} transform={`rotate(${rot} ${CX} ${CY})`}>
                    {ring.kind === 'glyph' && (
                      <text fontFamily={F.cond} fontWeight={600} fontSize={ring.size} fill={fill} letterSpacing={2}>
                        <textPath href={`#ring-${i}`}>{ring.text}</textPath>
                      </text>
                    )}
                    {ring.kind === 'rail' && (
                      <>
                        <circle cx={CX} cy={CY} r={ring.r - 8} fill="none" stroke={fill} strokeWidth={2.5} strokeDasharray={ring.dash} />
                        <circle cx={CX} cy={CY} r={ring.r + 8} fill="none" stroke={fill} strokeWidth={2.5} strokeDasharray={ring.dash} strokeDashoffset={60} />
                      </>
                    )}
                    {ring.kind === 'tick' && (
                      <circle cx={CX} cy={CY} r={ring.r} fill="none" stroke={fill} strokeWidth={16} strokeDasharray="3 21" />
                    )}
                  </g>
                );
              })}
            </mask>
            <clipPath id="inside">
              <path d={circlePath(R)} />
            </clipPath>
            <clipPath id="outside">
              <path d={outsidePath} clipRule="evenodd" />
            </clipPath>
          </defs>

          <g filter="url(#bloom)">
            <rect x="-400" y="-400" width="2720" height="1880" fill="url(#ringGrad)" mask="url(#ringMask)" clipPath="url(#inside)" />
            <rect
              x="-400"
              y="-400"
              width="2720"
              height="1880"
              fill={C.red}
              mask="url(#ringMask)"
              clipPath="url(#outside)"
            />
          </g>

          {/* Intrusion front */}
          {frame >= INTRUSION_START && R > 130 && (
            <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.red} strokeWidth={4} opacity={0.5 + 0.5 * blink(frame, 2, 2)} filter="url(#bloom)" />
          )}

          <g filter="url(#bloom)">
            {BLADES.map((b, i) => (
              <Blade key={b.name} {...b} index={i} frame={frame} color={bladeColor} />
            ))}
            <g opacity={flickerIn(frame, 10, 'core')}>
              <polygon
                points={Array.from({length: 6}, (_, k) => {
                  const a = (Math.PI / 3) * k + Math.PI / 6;
                  return `${CX + Math.cos(a) * 66},${CY + Math.sin(a) * 66}`;
                }).join(' ')}
                fill="#050302"
                stroke={bladeColor}
                strokeWidth={3}
              />
              <text x={CX} y={CY - 8} textAnchor="middle" fontFamily={F.cond} fontWeight={700} fontSize={40} fill={bladeColor}>
                MAGI
              </text>
              <text x={CX} y={CY + 26} textAnchor="middle" fontFamily={F.cond} fontWeight={700} fontSize={30} fill={bladeColor}>
                01
              </text>
            </g>
          </g>
        </svg>
      </AbsoluteFill>

      <CornerBox top={46} left={50} title="DANANG TYPE-B DEFENSE SCREEN" sub="on MAGI-01 ORIGINAL" opacity={flickerIn(frame, 22, 'tl')} />
      <CornerBox
        top={46}
        right={50}
        big
        title="TIME REMAINING TO COLLAPSE"
        sub={`${commas(pad(remaining, 6))} sec.`}
        opacity={flickerIn(frame, 26, 'tr')}
        color={frame > INTRUSION_START && blink(frame, 5, 4) ? C.red : C.orange}
      />
      <CornerBox bottom={46} left={50} title="PROTECT NO.666" sub="on MAGI-01 ORIGINAL" opacity={flickerIn(frame, 30, 'bl')} />
      <CornerBox
        bottom={46}
        right={50}
        big
        title="TIME SINCE SCREEN RAISED"
        sub={`${commas(pad(raised, 6))} sec.`}
        opacity={flickerIn(frame, 34, 'br')}
      />

      {frame >= INTRUSION_START + 4 && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            opacity: blink(frame, 9, 5),
          }}
        >
          <div
            style={{
              background: C.red,
              padding: '8px 28px 10px',
              boxShadow: `0 0 30px ${C.red}`,
              textAlign: 'center',
              lineHeight: 1,
            }}
          >
            <div style={{fontFamily: F.gothic, fontWeight: 900, fontSize: 46, color: '#000'}}>侵入検知</div>
            <div style={{fontFamily: F.cond, fontWeight: 700, fontSize: 28, color: '#000', letterSpacing: 3, marginTop: 4}}>
              INTRUSION DETECTED
            </div>
          </div>
        </div>
      )}
      <MagiDefenseSound />
      <CutTear frames={3} />
    </AbsoluteFill>
  );
};
