import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {blink, ease, flickerIn, lerp, scramble, changeFrames} from '../anim';
import {CutTear} from '../components/CRT';
import {Bed, Sfx, SfxAt} from '../components/Sfx';
import {C, F, glow} from '../theme';

// The MAGI deliberate. Melchior and Balthasar approve, Casper dissents,
// reconsiders, and the motion carries unanimously.

type Vote = 'pending' | 'approve' | 'deny';

const MELCHIOR_AT = 116;
const BALTHASAR_AT = 134;
const CASPER_DENY_AT = 150;
const CASPER_WAVER = 172;
const CASPER_APPROVE_AT = 188;
const RESULT_AT = 198;

const casperVote = (f: number): Vote => {
  if (f < CASPER_DENY_AT) return 'pending';
  if (f < CASPER_WAVER) return 'deny';
  if (f < CASPER_APPROVE_AT) {
    // Flip-flop that speeds up as it converges
    const t = (f - CASPER_WAVER) / (CASPER_APPROVE_AT - CASPER_WAVER);
    const period = Math.max(2, Math.round(8 * (1 - t)));
    return Math.floor((f - CASPER_WAVER) / period) % 2 ? 'approve' : 'deny';
  }
  return 'approve';
};

const DECIDED_AT: Record<string, number> = {
  MELCHIOR: MELCHIOR_AT,
  BALTHASAR: BALTHASAR_AT,
  CASPER: CASPER_DENY_AT,
};

const VOTE_FILL: Record<Vote, string> = {
  pending: '#040605',
  approve: '#3cf08a',
  deny: C.red,
};

const CENTER = {x: 1210, y: 596};

type BoxSpec = {
  name: string;
  num: string;
  x: number;
  y: number;
  w: number;
  h: number;
  chamfer: 'br' | 'bl' | 'top';
  seed: number;
};

const BOXES: BoxSpec[] = [
  {name: 'BALTHASAR', num: '2', x: 560, y: 250, w: 500, h: 300, chamfer: 'br', seed: 2},
  {name: 'CASPER', num: '3', x: 1360, y: 250, w: 500, h: 300, chamfer: 'bl', seed: 3},
  {name: 'MELCHIOR', num: '1', x: 960, y: 650, w: 500, h: 300, chamfer: 'top', seed: 1},
];

const boxPoints = ({x, y, w, h, chamfer}: BoxSpec) => {
  const s = 120;
  const t = 70;
  const pts =
    chamfer === 'br'
      ? [[x, y], [x + w, y], [x + w, y + h - s], [x + w - s, y + h], [x, y + h]]
      : chamfer === 'bl'
        ? [[x, y], [x + w, y], [x + w, y + h], [x + s, y + h], [x, y + h - s]]
        : [[x + t, y], [x + w - t, y], [x + w, y + t], [x + w, y + h], [x, y + h], [x, y + t]];
  return pts.map((p) => p.join(',')).join(' ');
};

const anchor = ({x, y, w, h, chamfer}: BoxSpec) =>
  chamfer === 'br'
    ? {x: x + w - 60, y: y + h - 60}
    : chamfer === 'bl'
      ? {x: x + 60, y: y + h - 60}
      : {x: x + w / 2, y};

const HEX = '0123456789ABCDEF';
const hexLine = (seed: string, n = 30) =>
  Array.from({length: n}, (_, i) => HEX[Math.floor(random(`${seed}-${i}`) * 16)]).join('');

const MagiBox: React.FC<{spec: BoxSpec; vote: Vote; frame: number; appear: number; decidedAt: number}> = ({
  spec,
  vote,
  frame,
  appear,
  decidedAt,
}) => {
  const {x, y, w, h} = spec;
  const decided = vote !== 'pending';
  const stroke = vote === 'deny' ? C.red : vote === 'approve' ? '#3cf08a' : C.orange;
  const clipId = `clip-${spec.name}`;
  const rows = 12;
  const scroll = frame * 1.5;
  return (
    <g opacity={appear}>
      <defs>
        <clipPath id={clipId}>
          <polygon points={boxPoints(spec)} />
        </clipPath>
      </defs>
      <polygon
        points={boxPoints(spec)}
        fill={frame >= decidedAt && frame < decidedAt + 2 ? '#fff' : VOTE_FILL[vote]}
        stroke={stroke}
        strokeWidth={5}
      />
      {!decided && (
        <g clipPath={`url(#${clipId})`} opacity={0.38}>
          {Array.from({length: rows + 1}, (_, k) => {
            const line = Math.floor(scroll / 26) + k;
            return (
              <text
                key={k}
                x={x + 24}
                y={y + 30 + k * 26 - (scroll % 26)}
                fontFamily={F.cond}
                fontWeight={500}
                fontSize={22}
                letterSpacing={3}
                fill={C.green}
              >
                {hexLine(`${spec.seed}-${line}`)}
              </text>
            );
          })}
        </g>
      )}
      <text
        x={x + w / 2}
        y={y + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={decided ? F.mincho : F.gothic}
        fontWeight={decided ? 800 : 900}
        fontSize={decided ? 150 : 64}
        fill={decided ? '#000' : C.orange}
        opacity={decided ? 1 : 0.35 + 0.65 * blink(frame, 10, 6, spec.seed * 3)}
      >
        {vote === 'approve' ? '承認' : vote === 'deny' ? '否決' : '審議中'}
      </text>
      <text
        x={spec.chamfer === 'bl' ? x + w - 24 : x + 24}
        y={spec.chamfer === 'top' ? y + h - 24 : y + 46}
        textAnchor={spec.chamfer === 'bl' ? 'end' : 'start'}
        fontFamily={F.cond}
        fontWeight={700}
        fontSize={40}
        letterSpacing={2}
        fill={decided ? '#000' : C.orange}
      >
        {spec.name}·{spec.num}
      </text>
    </g>
  );
};

const orange: React.CSSProperties = {
  color: C.orange,
  textShadow: glow(C.orange, 0.3),
  whiteSpace: 'nowrap',
  lineHeight: 1,
};

const LOG_LINES = (f: number) => {
  const lines: {t: string; c: string}[] = [];
  if (f >= MELCHIOR_AT) lines.push({t: 'MELCHIOR-1 ......... 承認', c: C.green});
  if (f >= BALTHASAR_AT) lines.push({t: 'BALTHASAR-2 ........ 承認', c: C.green});
  if (f >= CASPER_DENY_AT) lines.push({t: 'CASPER-3 ........... 否決', c: C.red});
  if (f >= CASPER_WAVER) lines.push({t: '>> 再審議 RE-DELIBERATION', c: C.orange});
  if (f >= CASPER_APPROVE_AT) lines.push({t: 'CASPER-3 ........... 承認', c: C.green});
  return lines;
};

const MagiVoteSound: React.FC = () => (
  <>
    <Bed name="hum" to={240} volume={0.3} />
    <Sfx at={0} name="static" volume={0.35} />
    <Sfx at={0} name="power-on" volume={0.4} />
    <SfxAt frames={[2, 6, 10, 15, 20]} name="blip" volume={0.25} />
    <Sfx at={4} name="chatter" volume={0.3} />
    <SfxAt frames={[34, 90]} name="chatter2" volume={0.2} />
    <Sfx at={62} name="chatter" volume={0.2} />
    <Sfx at={MELCHIOR_AT} name="approve" volume={0.6} />
    <Sfx at={BALTHASAR_AT} name="approve" volume={0.6} />
    <Sfx at={CASPER_DENY_AT} name="deny" volume={0.6} />
    <Bed name="tension" from={CASPER_DENY_AT} to={CASPER_APPROVE_AT + 6} volume={0.3} fade={6} />
    <SfxAt frames={changeFrames(CASPER_WAVER, CASPER_APPROVE_AT, casperVote)} name="blip-lo" volume={0.3} />
    <Sfx at={CASPER_APPROVE_AT} name="approve" volume={0.6} />
    <Sfx at={RESULT_AT} name="stamp" volume={0.8} />
  </>
);

export const MagiVote: React.FC = () => {
  const frame = useCurrentFrame();
  const votes: Record<string, Vote> = {
    MELCHIOR: frame >= MELCHIOR_AT ? 'approve' : 'pending',
    BALTHASAR: frame >= BALTHASAR_AT ? 'approve' : 'pending',
    CASPER: casperVote(frame),
  };
  const barGrow = lerp(frame, [8, 26], [0, 1], ease.out);
  const resultOn = frame >= RESULT_AT;
  const slam = lerp(frame, [RESULT_AT, RESULT_AT + 5], [1.25, 1], ease.out);
  const drift = lerp(frame, [0, 240], [1.0, 1.03]);

  const meta = [
    'CODE : 473',
    'FILE : MAGI_SYS',
    'EXTENSION : 3023',
    'EX_MODE : ON',
    'PRIORITY : AAA',
  ];

  return (
    <AbsoluteFill style={{backgroundColor: '#020302'}}>
      <AbsoluteFill style={{transform: `scale(${drift})`}}>
        {/* faint background grid */}
        <AbsoluteFill
          style={{
            backgroundImage:
              'linear-gradient(rgba(70,255,138,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(70,255,138,0.07) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            backgroundPosition: '-1px -1px',
          }}
        />

        <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
          <defs>
            <filter id="vbloom" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#vbloom)">
            {BOXES.map((b) => {
              const a = anchor(b);
              return (
                <line
                  key={b.name}
                  x1={CENTER.x}
                  y1={CENTER.y}
                  x2={CENTER.x + (a.x - CENTER.x) * barGrow}
                  y2={CENTER.y + (a.y - CENTER.y) * barGrow}
                  stroke={C.orange}
                  strokeWidth={26}
                />
              );
            })}
            {BOXES.map((b, i) => (
              <MagiBox
                key={b.name}
                spec={b}
                vote={votes[b.name]}
                frame={frame}
                appear={flickerIn(frame, 10 + i * 5, b.name)}
                decidedAt={DECIDED_AT[b.name]}
              />
            ))}
            <g opacity={flickerIn(frame, 6, 'core')}>
              <rect x={CENTER.x - 70} y={CENTER.y - 30} width={140} height={60} fill="#000" stroke={C.orange} strokeWidth={4} />
              <text x={CENTER.x} y={CENTER.y + 2} textAnchor="middle" dominantBaseline="central" fontFamily={F.cond} fontWeight={700} fontSize={44} letterSpacing={4} fill={C.orange}>
                MAGI
              </text>
            </g>
          </g>
        </svg>

        {/* Agenda */}
        <div
          style={{
            position: 'absolute',
            left: 560,
            top: 70,
            width: 1300,
            padding: '14px 24px',
            border: `3px solid ${C.orange}`,
            boxShadow: `0 0 14px ${C.orange}55`,
            opacity: flickerIn(frame, 2, 'agenda'),
            display: 'flex',
            alignItems: 'center',
            gap: 28,
          }}
        >
          <div style={{...orange, background: C.orange, color: '#000', textShadow: 'none', fontFamily: F.gothic, fontWeight: 900, fontSize: 48, padding: '6px 14px'}}>
            議題
          </div>
          <div>
            <div style={{...orange, fontFamily: F.gothic, fontWeight: 900, fontSize: 52}}>
              {scramble('動作設計の自律実行', frame, 4, 14, 'agenda-jp') || ' '}
            </div>
            <div style={{...orange, fontFamily: F.cond, fontWeight: 600, fontSize: 32, letterSpacing: 2, marginTop: 8}}>
              {scramble('PROPOSAL: AUTONOMOUS EXECUTION OF MOTION DESIGN', frame, 6, 22, 'agenda-en') || ' '}
            </div>
          </div>
        </div>

        {/* Left column: filing + vote log */}
        <div style={{position: 'absolute', left: 60, top: 70, width: 440}}>
          {(['提訴', '決議'] as const).map((label, i) => (
            <div
              key={label}
              style={{
                display: 'flex',
                gap: 18,
                alignItems: 'center',
                marginBottom: 16,
                opacity: flickerIn(frame, 4 + i * 4, label),
              }}
            >
              <div
                style={{
                  ...orange,
                  fontFamily: F.gothic,
                  fontWeight: 900,
                  fontSize: 46,
                  padding: '8px 16px',
                  border: `3px solid ${C.orange}`,
                  background: i === 1 && resultOn && blink(frame, 5, 3) ? C.orange : 'transparent',
                  color: i === 1 && resultOn && blink(frame, 5, 3) ? '#000' : C.orange,
                }}
              >
                {label}
              </div>
              <div style={{...orange, fontFamily: F.cond, fontWeight: 600, fontSize: 26, letterSpacing: 2}}>
                {i === 0 ? 'SUBMITTED' : resultOn ? 'CARRIED' : 'PENDING'}
              </div>
            </div>
          ))}
          <div style={{marginTop: 18}}>
            {meta.map((m, i) => (
              <div
                key={m}
                style={{...orange, fontFamily: F.cond, fontWeight: 600, fontSize: 34, letterSpacing: 2, marginBottom: 10, opacity: flickerIn(frame, 12 + i * 3, m)}}
              >
                {scramble(m, frame, 12 + i * 3, 10, m)}
              </div>
            ))}
          </div>
          <div style={{marginTop: 26, borderTop: `2px solid ${C.orange}66`, paddingTop: 16}}>
            {LOG_LINES(frame).map((l) => (
              <div
                key={l.t}
                style={{...orange, color: l.c, textShadow: glow(l.c, 0.45), fontFamily: F.cond, fontWeight: 600, fontSize: 28, letterSpacing: 1, marginBottom: 10}}
              >
                {l.t}
              </div>
            ))}
          </div>
        </div>

        {/* Result */}
        {resultOn && (
          <div
            style={{
              position: 'absolute',
              left: 60,
              top: 690,
              width: 820,
              height: 290,
              transform: `scale(${slam})`,
              transformOrigin: 'left center',
              border: `5px solid #3cf08a`,
              background: blink(frame - RESULT_AT, 4, 3) || frame > RESULT_AT + 20 ? '#3cf08a' : '#000',
              boxShadow: `0 0 40px #3cf08a99`,
              display: 'flex',
              alignItems: 'center',
              padding: '0 40px',
              gap: 40,
            }}
          >
            <div style={{fontFamily: F.mincho, fontWeight: 800, fontSize: 200, color: '#000', lineHeight: 1, transform: 'scale(0.9,1.1)'}}>可決</div>
            <div style={{color: '#000', lineHeight: 1}}>
              <div style={{fontFamily: F.gothic, fontWeight: 900, fontSize: 60}}>全会一致</div>
              <div style={{fontFamily: F.cond, fontWeight: 700, fontSize: 40, letterSpacing: 3, marginTop: 14}}>UNANIMOUS</div>
              <div style={{fontFamily: F.cond, fontWeight: 600, fontSize: 30, letterSpacing: 3, marginTop: 8}}>MOTION CARRIED 3-0</div>
            </div>
          </div>
        )}
      </AbsoluteFill>

      {resultOn && (
        <AbsoluteFill style={{backgroundColor: '#3cf08a', mixBlendMode: 'screen', opacity: lerp(frame, [RESULT_AT, RESULT_AT + 6], [0.5, 0])}} />
      )}
      <MagiVoteSound />
      <CutTear frames={3} color={C.orange} />
    </AbsoluteFill>
  );
};
