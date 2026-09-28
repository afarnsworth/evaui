import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {blink, ease, flickerIn, lerp, scramble} from '../anim';
import {CutTear} from '../components/CRT';
import {C, F, glow} from '../theme';

// 思考回路 — a fourth MAGI unit, running Claude, rendered the NERV way:
// next-token candidates as probability bars, a sampling needle that spins
// over the distribution, and a causal attention map that grows a row per
// token.

type Cand = [string, number];

const PROMPT = ['Design', ' a', ' screen', ':'];

const STEPS: {cands: Cand[]; pick: number}[] = [
  {cands: [[' Every', 0.41], [' Each', 0.22], [' The', 0.14], [' One', 0.09], [' All', 0.05]], pick: 0},
  {cands: [[' frame', 0.62], [' pixel', 0.17], [' token', 0.08], [' angel', 0.04], [' cut', 0.03]], pick: 0},
  {cands: [[' is', 0.78], [' was', 0.07], [' needs', 0.05], [' must', 0.04], [' becomes', 0.02]], pick: 0},
  {cands: [[' a', 0.71], [' one', 0.12], [' another', 0.06], [' the', 0.05], [' your', 0.02]], pick: 0},
  {cands: [[' decision', 0.48], [' choice', 0.21], [' vote', 0.12], [' sync', 0.06], [' prayer', 0.03]], pick: 0},
  {cands: [['.', 0.86], ['!', 0.06], ['...', 0.03], [',', 0.02], [' and', 0.01]], pick: 0},
];

const INTRO = 22;
const T = 36;
const END = INTRO + STEPS.length * T;

const orange: React.CSSProperties = {
  color: C.orange,
  textShadow: glow(C.orange, 0.3),
  whiteSpace: 'pre',
  lineHeight: 1,
};

const show = (tok: string) => (tok.startsWith(' ') ? '␣' + tok.slice(1) : tok);

// Where the needle lands inside the winning segment (0..1 of the strip).
const landing = (step: number) => {
  const {cands, pick} = STEPS[step];
  const before = cands.slice(0, pick).reduce((n, c) => n + c[1], 0);
  return before + cands[pick][1] * (0.25 + random(`land-${step}`) * 0.5);
};

const Panel: React.FC<{x: number; y: number; w: number; h: number; jp: string; en: string; frame: number; at: number; children: React.ReactNode}> = ({
  x,
  y,
  w,
  h,
  jp,
  en,
  frame,
  at,
  children,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      border: `3px solid ${C.orange}`,
      boxShadow: `0 0 14px ${C.orange}44`,
      opacity: flickerIn(frame, at, en),
    }}
  >
    <div style={{position: 'absolute', left: 20, top: -22, background: '#020302', padding: '0 12px', display: 'flex', gap: 12, alignItems: 'baseline'}}>
      <span style={{...orange, fontFamily: F.gothic, fontWeight: 900, fontSize: 36}}>{jp}</span>
      <span style={{...orange, fontFamily: F.cond, fontWeight: 600, fontSize: 26, letterSpacing: 3}}>{en}</span>
    </div>
    {children}
  </div>
);

export const ThoughtCircuit: React.FC = () => {
  const frame = useCurrentFrame();
  const step = Math.min(STEPS.length - 1, Math.max(0, Math.floor((frame - INTRO) / T)));
  const t = frame - INTRO - step * T; // local time in this step
  const running = frame >= INTRO && frame < END;
  const done = frame >= END;
  const committed = done ? STEPS.length : Math.max(0, step + (t >= 30 ? 1 : 0));
  const output = STEPS.slice(0, committed).map((s) => s.cands[s.pick][0]);
  const {cands, pick} = STEPS[step];

  // Needle: several spins, decelerating onto the landing point.
  const sweep = lerp(t, [8, 24], [0, 1], ease.expoOut);
  const needle = done ? landing(STEPS.length - 1) : ((3 + landing(step)) * sweep) % 1;
  const decided = running && t >= 24;
  const other = 1 - cands.reduce((n, c) => n + c[1], 0);

  // Attention map: prompt + generated so far (+ the row being computed)
  const tokens = [...PROMPT, ...output];
  const rows = Math.min(tokens.length + (running ? 1 : 0), PROMPT.length + STEPS.length);
  const N = PROMPT.length + STEPS.length;
  const cell = 52;

  return (
    <AbsoluteFill style={{backgroundColor: '#020302'}}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(70,255,138,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(70,255,138,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Header */}
      <div style={{position: 'absolute', left: 60, top: 40, display: 'flex', gap: 22, alignItems: 'center', opacity: flickerIn(frame, 0, 'hdr')}}>
        <div style={{...orange, background: C.orange, color: '#000', textShadow: 'none', fontFamily: F.gothic, fontWeight: 900, fontSize: 56, padding: '8px 16px'}}>
          思考回路
        </div>
        <div>
          <div style={{...orange, fontFamily: F.cond, fontWeight: 700, fontSize: 44, letterSpacing: 3}}>THOUGHT CIRCUIT</div>
          <div style={{...orange, fontFamily: F.cond, fontWeight: 600, fontSize: 26, letterSpacing: 3, marginTop: 6, opacity: 0.8}}>on MAGI-04 CLAUDE</div>
        </div>
      </div>
      <div style={{position: 'absolute', right: 60, top: 48, textAlign: 'right', opacity: flickerIn(frame, 4, 'stats')}}>
        {[`TOKEN ${String(Math.min(committed + (running ? 1 : 0), 6)).padStart(2, '0')} / 06`, 'TEMPERATURE 0.70', 'TOP-P 0.95'].map((l) => (
          <div key={l} style={{...orange, fontFamily: F.cond, fontWeight: 600, fontSize: 28, letterSpacing: 3, marginBottom: 8}}>
            {l}
          </div>
        ))}
      </div>

      {/* Output line */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          top: 190,
          height: 150,
          border: `3px solid ${done ? C.green : C.orange}`,
          background: done && blink(frame - END, 3, 2) && frame < END + 12 ? '#0c3a1e' : 'transparent',
          boxShadow: `0 0 18px ${done ? C.green : C.orange}55`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 36px',
          opacity: flickerIn(frame, 6, 'out'),
        }}
      >
        <span style={{...orange, color: C.greenSoft, textShadow: glow(C.green, 0.3), fontFamily: F.cond, fontWeight: 500, fontSize: 84}}>
          {PROMPT.join('')}
        </span>
        {output.map((tok, i) => {
          const fresh = i === committed - 1 && !done && t >= 30 && t < 34;
          return (
            <span
              key={i}
              style={{
                ...orange,
                fontFamily: F.cond,
                fontWeight: 700,
                fontSize: 84,
                color: fresh ? '#000' : done ? C.white : C.orange,
                background: fresh ? C.orange : 'transparent',
                textShadow: fresh ? 'none' : glow(done ? '#ffffff' : C.orange, 0.3),
              }}
            >
              {tok}
            </span>
          );
        })}
        {!done && <span style={{width: 34, height: 80, marginLeft: 8, background: C.orange, opacity: blink(frame, 8, 8)}} />}
      </div>
      {done && (
        <div style={{position: 'absolute', left: 96, top: 360, display: 'flex', gap: 30, alignItems: 'baseline'}}>
          <span style={{...orange, color: C.green, textShadow: glow(C.green, 0.4), fontFamily: F.gothic, fontWeight: 900, fontSize: 40, opacity: blink(frame, 10, 5)}}>
            出力完了 OUTPUT COMPLETE
          </span>
          <span style={{...orange, color: C.white, textShadow: 'none', fontFamily: F.mincho, fontWeight: 800, fontSize: 48}}>
            {scramble('一コマ一コマが決断だ。', frame, END + 8, 18, 'gloss')}
          </span>
        </div>
      )}

      {/* Candidates */}
      <Panel x={60} y={450} w={1040} h={440} jp="次トークン候補" en="NEXT-TOKEN CANDIDATES" frame={frame} at={10}>
        {running &&
          cands.map(([tok, p], i) => {
            const barIn = lerp(t, [2 + i * 1.5, 12 + i * 1.5], [0, 1], ease.out);
            const jitter = decided ? 0 : (random(`jit-${step}-${i}-${frame}`) - 0.5) * 0.02;
            const win = decided && i === pick;
            const lose = decided && i !== pick;
            const flashOn = win && t < 30 ? blink(t, 2, 2) : 1;
            const rowColor = lose ? '#7a1a12' : C.orange;
            return (
              <div
                key={`${step}-${i}`}
                style={{
                  position: 'absolute',
                  left: 24,
                  right: 24,
                  top: 40 + i * 76,
                  height: 64,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  background: win && flashOn ? C.orange : 'transparent',
                  opacity: flickerIn(t, i, `row-${step}-${i}`),
                }}
              >
                <div
                  style={{
                    ...orange,
                    width: 260,
                    fontFamily: F.cond,
                    fontWeight: 700,
                    fontSize: 48,
                    paddingLeft: 12,
                    color: win && flashOn ? '#000' : rowColor,
                    textShadow: win || lose ? 'none' : orange.textShadow,
                    textDecoration: lose ? 'line-through' : 'none',
                  }}
                >
                  {t < 6 ? scramble(show(tok), t, 0, 6, `c-${step}-${i}`) : show(tok)}
                </div>
                <div style={{flex: 1, height: 30, border: `2px solid ${rowColor}`, position: 'relative'}}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.max(0, (p + jitter) * barIn) * 100}%`,
                      background: win && flashOn ? '#000' : rowColor,
                      boxShadow: lose ? 'none' : `0 0 12px ${C.orange}`,
                    }}
                  />
                </div>
                <div
                  style={{
                    ...orange,
                    width: 120,
                    textAlign: 'right',
                    paddingRight: 12,
                    fontFamily: F.cond,
                    fontWeight: 700,
                    fontSize: 40,
                    color: win && flashOn ? '#000' : rowColor,
                    textShadow: 'none',
                  }}
                >
                  {((p + jitter) * barIn).toFixed(2)}
                </div>
              </div>
            );
          })}
        {done && (
          <div style={{...orange, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.cond, fontWeight: 700, fontSize: 64, letterSpacing: 8, color: C.green, textShadow: glow(C.green, 0.4)}}>
            {'<END OF TURN>'}
          </div>
        )}
      </Panel>

      {/* Sampling strip */}
      <div style={{position: 'absolute', left: 60, top: 920, width: 1040, opacity: flickerIn(frame, 14, 'strip')}}>
        <div style={{...orange, fontFamily: F.cond, fontWeight: 600, fontSize: 24, letterSpacing: 3, marginBottom: 10, display: 'flex', justifyContent: 'space-between'}}>
          <span>抽出 SAMPLING</span>
          <span>SEED {(0x7a3f + step * 977).toString(16).toUpperCase()}</span>
        </div>
        <div style={{position: 'relative', height: 70, display: 'flex', border: `2px solid ${C.orange}`}}>
          {[...cands, ['·', other] as Cand].map(([tok, p], i) => (
            <div
              key={i}
              style={{
                width: `${p * 100}%`,
                background: i === cands.length ? '#1a1a1a' : i % 2 ? '#8a4a0c' : '#c0680f',
                borderRight: '2px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                fontFamily: F.cond,
                fontWeight: 700,
                fontSize: 26,
                color: '#000',
                outline: decided && i === pick ? `4px solid ${C.white}` : 'none',
                outlineOffset: -4,
              }}
            >
              {p > 0.08 ? show(tok) : ''}
            </div>
          ))}
          <div
            style={{
              position: 'absolute',
              top: -16,
              bottom: -16,
              left: `${needle * 100}%`,
              width: 5,
              marginLeft: -2.5,
              background: decided || done ? C.white : C.red,
              boxShadow: `0 0 16px ${decided || done ? '#fff' : C.red}`,
            }}
          />
        </div>
      </div>

      {/* Attention map */}
      <Panel x={1160} y={450} w={700} h={590} jp="注意機構" en="ATTENTION · HEAD 07/32" frame={frame} at={18}>
        <svg width={700} height={590} style={{position: 'absolute', inset: 0}}>
          <g transform="translate(130,40)">
            {Array.from({length: rows}, (_, r) =>
              Array.from({length: r + 1}, (_, c) => {
                // Mostly local attention with a few long-range heads lighting up
                const base = random(`att-${r}-${c}`);
                const local = c === r ? 0.9 : c === r - 1 ? 0.6 : 0;
                const w = Math.min(1, Math.max(local, base ** 3 * 1.4) + (random(`att-f-${r}-${c}-${Math.floor(frame / 3)}`) - 0.5) * 0.1);
                const live = r === rows - 1 && running;
                const color = w > 0.7 ? C.orange : w > 0.35 ? C.greenSoft : C.greenDim;
                return (
                  <rect
                    key={`${r}-${c}`}
                    x={c * cell + 3}
                    y={r * cell + 3}
                    width={cell - 6}
                    height={cell - 6}
                    fill={color}
                    opacity={(0.15 + w * 0.85) * (live ? 0.5 + 0.5 * blink(frame, 2, 2) : 1)}
                  />
                );
              }),
            )}
            {rows > 0 && running && (
              <rect x={-4} y={(rows - 1) * cell - 1} width={rows * cell + 8} height={cell + 2} fill="none" stroke={C.red} strokeWidth={3} />
            )}
            <rect x={0} y={0} width={N * cell} height={N * cell} fill="none" stroke={C.orange} strokeWidth={1} opacity={0.4} />
            {tokens.slice(0, N).map((tok, i) => (
              <text
                key={i}
                x={-12}
                y={i * cell + cell / 2}
                textAnchor="end"
                dominantBaseline="central"
                fontFamily={F.cond}
                fontWeight={600}
                fontSize={22}
                fill={i < PROMPT.length ? C.greenSoft : C.orange}
              >
                {show(tok)}
              </text>
            ))}
          </g>
        </svg>
      </Panel>

      <CutTear frames={3} color={C.orange} />
    </AbsoluteFill>
  );
};
