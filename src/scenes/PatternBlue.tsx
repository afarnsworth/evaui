import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {blink, ease, flickerIn, lerp} from '../anim';
import {CutTear} from '../components/CRT';
import {C, F, glow} from '../theme';

// Three unknown waveforms are analysed until they collapse onto a single
// signature — pattern blue. The EMERGENCY honeycomb floods the screen.

const MATCH_START = 62;
const MATCH_END = 96;
const RESULT_AT = 102;

const HEX_R = 66;
const ORIGIN = {x: 1480, y: 560};

type Hex = {x: number; y: number; d: number; jitter: number; phase: number; label: string};

const buildHexes = (): Hex[] => {
  const hexes: Hex[] = [];
  const w = HEX_R * 1.5;
  const h = HEX_R * Math.sqrt(3);
  for (let col = -1; col < 1920 / w + 1; col++) {
    for (let row = -1; row < 1080 / h + 1; row++) {
      const x = col * w;
      const y = row * h + (col % 2 ? h / 2 : 0);
      const id = `${col}-${row}`;
      hexes.push({
        x,
        y,
        d: Math.hypot(x - ORIGIN.x, y - ORIGIN.y),
        jitter: random(`hj-${id}`) * 90,
        phase: Math.floor(random(`hp-${id}`) * 12),
        label: random(`hl-${id}`) > 0.8 ? '警告' : 'EMERGENCY',
      });
    }
  }
  return hexes;
};

const hexPoints = (cx: number, cy: number, r: number) =>
  Array.from({length: 6}, (_, k) => {
    const a = (Math.PI / 3) * k;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');

// Each channel has its own noisy signature; `m` blends it toward the shared
// target waveform.
const waveY = (ch: number, x: number, frame: number, m: number) => {
  const t = frame * 0.08;
  const own =
    Math.sin(x * (0.011 + ch * 0.004) + t * (1.3 + ch * 0.5) + ch) * 0.55 +
    Math.sin(x * (0.043 + ch * 0.01) - t * 2.1) * 0.25 +
    (random(`n-${ch}-${Math.floor(x / 6)}-${Math.floor(frame / 2)}`) - 0.5) * 0.35;
  const target =
    Math.sin(x * 0.018 - t * 1.6) * 0.6 * Math.sin(x * 0.0045 + 0.5) +
    Math.sin(x * 0.061 - t * 3.2) * 0.22;
  return own * (1 - m) + target * m;
};

const WaveGraph: React.FC<{ch: number; frame: number; m: number; top: number; appear: number}> = ({
  ch,
  frame,
  m,
  top,
  appear,
}) => {
  const W = 880;
  const H = 190;
  const matched = m >= 1;
  const color = matched ? C.orange : m > 0 ? (blink(frame, 2, 2) ? C.orange : C.green) : C.green;
  const pts = Array.from({length: 177}, (_, i) => {
    const x = i * 5;
    return `${x},${(H / 2 - waveY(ch, x, frame, m) * (H * 0.42)).toFixed(1)}`;
  }).join(' ');
  return (
    <div style={{position: 'absolute', left: 40, top, opacity: appear}}>
      <div
        style={{
          fontFamily: F.cond,
          fontWeight: 600,
          fontSize: 26,
          letterSpacing: 2,
          color,
          textShadow: glow(color, 0.4),
          marginBottom: 6,
          display: 'flex',
          justifyContent: 'space-between',
          width: W,
          whiteSpace: 'nowrap',
        }}
      >
        <span>WAVE PATTERN : {'ABC'[ch]}</span>
        <span>{matched ? 'MATCH 99.89%' : `CORR ${(m * 99.89).toFixed(2)}%`}</span>
      </div>
      <svg width={W} height={H} style={{display: 'block', border: `2px solid ${C.greenDim}`, background: '#010a05'}}>
        {Array.from({length: 11}, (_, i) => (
          <line key={`v${i}`} x1={i * 88} y1={0} x2={i * 88} y2={H} stroke={C.greenDeep} strokeWidth={1.5} />
        ))}
        {Array.from({length: 5}, (_, i) => (
          <line key={`h${i}`} x1={0} y1={(i * H) / 4} x2={W} y2={(i * H) / 4} stroke={C.greenDeep} strokeWidth={1.5} />
        ))}
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth={3}
          style={{filter: `drop-shadow(0 0 5px ${color})`}}
        />
      </svg>
    </div>
  );
};

const Hazard: React.FC<{top?: number; bottom?: number; frame: number; dir: number; ticker: string}> = ({
  frame,
  dir,
  ticker,
  ...pos
}) => (
  <div style={{position: 'absolute', left: 0, right: 0, height: 64, ...pos, overflow: 'hidden'}}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `repeating-linear-gradient(-45deg, ${C.red} 0 28px, #000 28px 56px)`,
        backgroundPosition: `${dir * frame * 4}px 0`,
        boxShadow: `0 0 30px ${C.red}`,
      }}
    />
    <div
      style={{
        position: 'absolute',
        top: 8,
        bottom: 8,
        left: 0,
        right: 0,
        background: '#000',
        overflow: 'hidden',
        borderTop: `2px solid ${C.red}`,
        borderBottom: `2px solid ${C.red}`,
        margin: '0 180px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: -((frame * 6 * dir) % 1200) - (dir < 0 ? 1200 : 0),
          whiteSpace: 'nowrap',
          fontFamily: F.gothic,
          fontWeight: 900,
          fontSize: 34,
          lineHeight: 1.1,
          color: C.red,
          textShadow: glow(C.red, 0.5),
        }}
      >
        {ticker.repeat(6)}
      </div>
    </div>
  </div>
);

export const PatternBlue: React.FC = () => {
  const frame = useCurrentFrame();
  const hexes = useMemo(buildHexes, []);
  const m = lerp(frame, [MATCH_START, MATCH_END], [0, 1], ease.inOut);
  const front = lerp(frame, [8, 150], [0, 2100], ease.in);
  const resultOn = frame >= RESULT_AT;
  const slam = lerp(frame, [RESULT_AT, RESULT_AT + 5], [1.35, 1], ease.out);
  const resultFill = frame - RESULT_AT < 14 ? blink(frame - RESULT_AT, 2, 2) : 1;
  const whiteout = lerp(frame, [200, 209], [0, 1], ease.in);
  const shake = resultOn ? lerp(frame, [RESULT_AT, RESULT_AT + 12], [18, 0]) : 0;

  return (
    <AbsoluteFill style={{backgroundColor: '#050000'}}>
      <AbsoluteFill
        style={{
          transform: `translate(${(random(`px-${frame}`) - 0.5) * shake}px, ${(random(`py-${frame}`) - 0.5) * shake}px)`,
        }}
      >
        {/* EMERGENCY honeycomb */}
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <defs>
            <filter id="hbloom" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#hbloom)">
            {hexes.map((hx, i) => {
              const reached = front > hx.d + hx.jitter;
              if (!reached) {
                return (
                  <polygon key={i} points={hexPoints(hx.x, hx.y, HEX_R - 5)} fill="none" stroke="#2a0406" strokeWidth={2} />
                );
              }
              const lit = (frame + hx.phase) % 12 < (resultOn ? 9 : 7);
              return (
                <g key={i}>
                  <polygon
                    points={hexPoints(hx.x, hx.y, HEX_R - 5)}
                    fill={lit ? '#5a0508' : '#1a0203'}
                    stroke={C.red}
                    strokeWidth={4}
                  />
                  {lit && (
                    <text
                      x={hx.x}
                      y={hx.y + 1}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily={hx.label === 'EMERGENCY' ? F.cond : F.gothic}
                      fontWeight={hx.label === 'EMERGENCY' ? 700 : 900}
                      fontSize={hx.label === 'EMERGENCY' ? 22 : 34}
                      letterSpacing={hx.label === 'EMERGENCY' ? 1 : 0}
                      fill={C.red}
                    >
                      {hx.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Analysis panel */}
        <div
          style={{
            position: 'absolute',
            left: 60,
            top: 120,
            width: 960,
            height: 840,
            background: 'rgba(0,4,2,0.94)',
            border: `3px solid ${C.green}`,
            boxShadow: `0 0 20px ${C.green}55`,
            opacity: flickerIn(frame, 0, 'panel'),
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 40,
              top: 26,
              display: 'flex',
              alignItems: 'baseline',
              gap: 24,
              whiteSpace: 'nowrap',
              lineHeight: 1,
              color: resultOn ? C.orange : C.green,
              textShadow: glow(resultOn ? C.orange : C.green, 0.4),
              opacity: resultOn ? 1 : 0.3 + 0.7 * blink(frame, 9, 5),
            }}
          >
            <span style={{fontFamily: F.gothic, fontWeight: 900, fontSize: 52}}>{resultOn ? '解析結果' : '解析中'}</span>
            <span style={{fontFamily: F.cond, fontWeight: 600, fontSize: 36, letterSpacing: 3}}>
              {resultOn ? 'ANALYSIS COMPLETE' : 'ANALYZING WAVEFORM'}
            </span>
          </div>
          {[0, 1, 2].map((ch) => (
            <WaveGraph key={ch} ch={ch} frame={frame} m={m} top={112 + ch * 240} appear={flickerIn(frame, 4 + ch * 4, `wave-${ch}`)} />
          ))}
        </div>

        {/* Verdict */}
        {resultOn && (
          <div
            style={{
              position: 'absolute',
              left: 1080,
              top: 300,
              width: 780,
              height: 480,
              transform: `scale(${slam})`,
              background: resultFill ? C.orange : '#000',
              border: `6px solid ${C.orange}`,
              boxShadow: `0 0 60px ${C.orange}, 0 0 140px ${C.red}88`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: resultFill ? '#000' : C.orange,
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{fontFamily: F.cond, fontWeight: 700, fontSize: 38, letterSpacing: 6}}>ANALYSIS RESULT</div>
            <div
              style={{
                fontFamily: F.mincho,
                fontWeight: 800,
                fontSize: 170,
                marginTop: 26,
                transform: 'scale(0.86,1.2)',
              }}
            >
              パターン青
            </div>
            <div style={{fontFamily: F.cond, fontWeight: 700, fontSize: 96, letterSpacing: 4, marginTop: 44}}>
              BLOOD TYPE : BLUE
            </div>
          </div>
        )}

        <Hazard top={0} frame={frame} dir={1} ticker="警告　WARNING　緊急事態　EMERGENCY　" />
        <Hazard bottom={0} frame={frame} dir={-1} ticker="総員第一種戦闘配置　ALL PERSONNEL TO LEVEL-ONE BATTLE STATIONS　" />
      </AbsoluteFill>

      {resultOn && (
        <AbsoluteFill style={{backgroundColor: C.orange, mixBlendMode: 'screen', opacity: lerp(frame, [RESULT_AT, RESULT_AT + 8], [0.6, 0])}} />
      )}
      <AbsoluteFill style={{backgroundColor: '#fff', opacity: whiteout}} />
      <CutTear frames={3} color={C.red} />
    </AbsoluteFill>
  );
};
