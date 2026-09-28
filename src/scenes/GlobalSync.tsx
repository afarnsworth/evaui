import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {blink, ease, flickerIn, lerp} from '../anim';
import {CutTear} from '../components/CRT';
import {Bed, Sfx, SfxAt} from '../components/Sfx';
import {SevenSeg} from '../components/SevenSeg';
import {C, F, glow} from '../theme';

// 全支部同期 — MAGI syncs with every NERV branch over great-circle links on a
// spinning wireframe globe. Five answer. Antarctica does not.

const CX = 960;
const CY = 590;
const R = 330;

type V3 = [number, number, number];

const toVec = (lat: number, lon: number): V3 => {
  const a = (lat * Math.PI) / 180;
  const b = (lon * Math.PI) / 180;
  return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)];
};

type View = {lon: number; tilt: number};

const toView = ([x, y, z]: V3, v: View): V3 => {
  const a = (-v.lon * Math.PI) / 180;
  const x1 = x * Math.cos(a) + z * Math.sin(a);
  const z1 = -x * Math.sin(a) + z * Math.cos(a);
  const t = (v.tilt * Math.PI) / 180;
  return [x1, y * Math.cos(t) - z1 * Math.sin(t), y * Math.sin(t) + z1 * Math.cos(t)];
};

// A point is hidden when it is behind the globe's disc.
const visible = ([x, y, z]: V3) => z > 0 || x * x + y * y > 1;
const sx = (p: V3) => CX + R * p[0];
const sy = (p: V3) => CY - R * p[1];

/** Split a 3D curve into its visible and hidden runs as two path strings. */
const splitPath = (pts: V3[], v: View) => {
  let front = '';
  let back = '';
  let prev: boolean | null = null;
  pts.forEach((pt) => {
    const p = toView(pt, v);
    const vis = visible(p);
    const cmd = prev === vis ? 'L' : 'M';
    const seg = `${cmd}${sx(p).toFixed(1)} ${sy(p).toFixed(1)}`;
    if (vis) front += seg;
    else back += seg;
    prev = vis;
  });
  return {front, back};
};

const slerp = (a: V3, b: V3, t: number, lift: number): V3 => {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const th = Math.acos(Math.min(1, Math.max(-1, dot)));
  const s = Math.sin(th) || 1;
  const ka = Math.sin((1 - t) * th) / s;
  const kb = Math.sin(t * th) / s;
  const h = 1 + lift * Math.sin(Math.PI * t) * (0.35 + th / Math.PI);
  return [(a[0] * ka + b[0] * kb) * h, (a[1] * ka + b[1] * kb) * h, (a[2] * ka + b[2] * kb) * h];
};

const HOME = {lat: 35.2, lon: 139.0};

type Site = {jp: string; en: string; lat: number; lon: number; at: number; fails?: boolean; rtt: number};

const SITES: Site[] = [
  {jp: '北京', en: 'BEIJING', lat: 39.9, lon: 116.4, at: 50, rtt: 18},
  {jp: 'モスクワ', en: 'MOSCOW', lat: 55.8, lon: 37.6, at: 78, rtt: 64},
  {jp: 'ベルリン', en: 'BERLIN', lat: 52.5, lon: 13.4, at: 104, rtt: 91},
  {jp: 'マサチューセッツ', en: 'MASSACHUSETTS', lat: 42.4, lon: -71.4, at: 130, rtt: 142},
  {jp: 'ネバダ', en: 'NEVADA', lat: 38.8, lon: -116.4, at: 156, rtt: 118},
  {jp: '南極', en: 'ANTARCTICA', lat: -89, lon: 0, at: 196, fails: true, rtt: 0},
];

const DRAW = 18;
const FAIL_STALL = 222;
const FAIL_BREAK = 234;

type Status = 'standby' | 'sending' | 'synced' | 'failed';
const statusOf = (s: Site, f: number): Status => {
  if (f < s.at) return 'standby';
  if (s.fails) return f < FAIL_BREAK ? 'sending' : 'failed';
  return f < s.at + DRAW ? 'sending' : 'synced';
};

const STATUS_LABEL: Record<Status, [string, string, string]> = {
  standby: ['待機', 'STANDBY', '#8a5a1c'],
  sending: ['送信中', 'SENDING', C.orange],
  synced: ['同期', 'SYNCED', C.green],
  failed: ['応答なし', 'NO RESPONSE', C.red],
};

const orange: React.CSSProperties = {
  color: C.orange,
  textShadow: glow(C.orange, 0.3),
  whiteSpace: 'nowrap',
  lineHeight: 1,
};

const GlobalSyncSound: React.FC = () => {
  const ok = SITES.filter((s) => !s.fails);
  return (
    <>
      <Bed name="hum" to={270} volume={0.3} />
      <Sfx at={0} name="static" volume={0.35} />
      <Sfx at={0} name="power-on" volume={0.4} />
      <SfxAt frames={[10, 13, 16, 19, 22, 25]} name="blip-lo" volume={0.2} />
      <SfxAt frames={SITES.map((_, i) => 28 + i * 4)} name="blip" volume={0.22} />
      <SfxAt frames={[40, 120]} name="chatter2" volume={0.15} />
      <SfxAt frames={SITES.map((s) => s.at)} name="blip" volume={0.35} />
      <SfxAt frames={ok.map((s) => s.at + DRAW)} name="ping" volume={0.5} />
      <Sfx at={178} name="rumble" volume={0.8} />
      <Bed name="tension" from={196} to={270} volume={0.3} fade={20} />
      <SfxAt frames={[FAIL_STALL, FAIL_STALL + 6]} name="glitch" volume={0.35} />
      <Sfx at={FAIL_BREAK} name="deny" volume={0.4} />
      <Sfx at={FAIL_BREAK} name="stamp" volume={0.5} />
      <Bed name="klaxon" from={FAIL_BREAK} to={270} volume={0.18} />
    </>
  );
};

export const GlobalSync: React.FC = () => {
  const frame = useCurrentFrame();
  const view: View = {
    lon: 150 - 1.35 * frame,
    tilt: lerp(frame, [178, 214], [24, -42], ease.inOut),
  };

  const home = toVec(HOME.lat, HOME.lon);
  const homeV = toView(home, view);

  // Graticule
  const lats = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75];
  const lons = Array.from({length: 18}, (_, i) => i * 20);
  const latPaths = lats.map((lat) =>
    splitPath(
      Array.from({length: 97}, (_, i) => toVec(lat, (i / 96) * 360)),
      view,
    ),
  );
  const lonPaths = lons.map((lon) =>
    splitPath(
      Array.from({length: 61}, (_, i) => toVec(-90 + (i / 60) * 180, lon)),
      view,
    ),
  );

  const synced = SITES.filter((s) => statusOf(s, frame) === 'synced').length;
  const ratio = (synced / SITES.length) * 100;
  const failed = frame >= FAIL_BREAK;

  return (
    <AbsoluteFill style={{backgroundColor: '#010302'}}>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <filter id="gs-bloom" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="gs-disc">
            <stop offset="0.7" stopColor="#021208" />
            <stop offset="1" stopColor="#063a1c" />
          </radialGradient>
        </defs>

        {/* Orbit furniture */}
        <g opacity={flickerIn(frame, 0, 'orbit')} fill="none">
          <circle cx={CX} cy={CY} r={R + 34} stroke={C.greenDim} strokeWidth={2} strokeDasharray="60 14 8 14" strokeDashoffset={-frame * 3} />
          <circle cx={CX} cy={CY} r={R + 70} stroke={C.greenDim} strokeWidth={14} strokeDasharray="2 16" strokeDashoffset={frame * 1.5} opacity={0.6} />
          <circle cx={CX} cy={CY} r={R + 110} stroke={C.orange} strokeWidth={2} strokeDasharray="4 10" opacity={0.35} />
          {[0, 90, 180, 270].map((a) => (
            <g key={a} transform={`rotate(${a} ${CX} ${CY})`}>
              <line x1={CX + R + 90} y1={CY} x2={CX + R + 150} y2={CY} stroke={C.orange} strokeWidth={3} />
            </g>
          ))}
        </g>

        <circle cx={CX} cy={CY} r={R} fill="url(#gs-disc)" opacity={flickerIn(frame, 0, 'disc')} />

        <g fill="none">
          {latPaths.map((p, i) => (
            <path key={`lb${i}`} d={p.back} stroke={C.greenDeep} strokeWidth={1.5} opacity={flickerIn(frame, 2 + i * 1.5, `lat${i}`)} />
          ))}
          {lonPaths.map((p, i) => (
            <path key={`ob${i}`} d={p.back} stroke={C.greenDeep} strokeWidth={1.5} opacity={flickerIn(frame, 8 + i, `lon${i}`)} />
          ))}
        </g>
        <g fill="none" filter="url(#gs-bloom)">
          {latPaths.map((p, i) => (
            <path
              key={`lf${i}`}
              d={p.front}
              stroke={lats[i] === 0 ? C.lime : C.greenSoft}
              strokeWidth={lats[i] === 0 ? 2.5 : 1.8}
              opacity={flickerIn(frame, 2 + i * 1.5, `lat${i}`) * 0.8}
            />
          ))}
          {lonPaths.map((p, i) => (
            <path key={`of${i}`} d={p.front} stroke={C.greenSoft} strokeWidth={1.8} opacity={flickerIn(frame, 8 + i, `lon${i}`) * 0.7} />
          ))}
          <circle cx={CX} cy={CY} r={R} stroke={C.green} strokeWidth={3} />

          {/* Links */}
          {SITES.map((s) => {
            if (frame < s.at) return null;
            const target = toVec(s.lat, s.lon);
            const reach = s.fails
              ? frame < FAIL_STALL
                ? lerp(frame, [s.at, FAIL_STALL], [0, 0.62], ease.out)
                : 0.62 + (frame < FAIL_BREAK ? Math.sin(frame * 2.3) * 0.03 : 0)
              : lerp(frame, [s.at, s.at + DRAW], [0, 1], ease.inOut);
            const n = 60;
            const pts = Array.from({length: n + 1}, (_, i) => slerp(home, target, (i / n) * reach, 0.28));
            const {front, back} = splitPath(pts, view);
            const st = statusOf(s, frame);
            const color = s.fails ? C.red : st === 'synced' ? C.green : C.orange;
            const brokenFlicker = s.fails && frame >= FAIL_STALL ? blink(frame, 2, 3) : 1;
            if (s.fails && failed && frame > FAIL_BREAK + 10) return null;
            const head = toView(pts[pts.length - 1], view);
            const packetT = st === 'synced' ? ((frame - s.at) % 30) / 30 : -1;
            const packet = packetT >= 0 ? toView(slerp(home, target, packetT, 0.28), view) : null;
            return (
              <g key={s.en} opacity={brokenFlicker}>
                <path d={back} stroke={color} strokeWidth={2} opacity={0.3} strokeDasharray="4 6" />
                <path d={front} stroke={color} strokeWidth={s.fails ? 3 : 3.5} strokeDasharray={s.fails ? '14 8' : undefined} />
                {st === 'sending' && visible(head) && <circle cx={sx(head)} cy={sy(head)} r={9} fill="#fff" />}
                {packet && visible(packet) && <circle cx={sx(packet)} cy={sy(packet)} r={5} fill="#fff" />}
              </g>
            );
          })}

          {/* Sites */}
          {SITES.map((s, i) => {
            const p = toView(toVec(s.lat, s.lon), view);
            if (!visible(p) || frame < 28 + i * 4) return null;
            const st = statusOf(s, frame);
            const color = STATUS_LABEL[st][2];
            const syncedAt = s.at + DRAW;
            const ripple = !s.fails && frame >= syncedAt ? lerp(frame, [syncedAt, syncedAt + 20], [0, 70]) : 0;
            return (
              <g key={s.en} opacity={flickerIn(frame, 28 + i * 4, `site${i}`)}>
                <rect x={sx(p) - 8} y={sy(p) - 8} width={16} height={16} fill="none" stroke={color} strokeWidth={3} transform={`rotate(45 ${sx(p)} ${sy(p)})`} />
                {ripple > 0 && ripple < 70 && <circle cx={sx(p)} cy={sy(p)} r={ripple} stroke={C.green} strokeWidth={3} opacity={1 - ripple / 70} />}
                <text x={sx(p) + 16} y={sy(p) - 12} fontFamily={F.cond} fontWeight={700} fontSize={22} letterSpacing={2} fill={color} stroke="none">
                  {s.en}
                </text>
              </g>
            );
          })}

          {/* Home */}
          {visible(homeV) && (
            <g>
              <circle cx={sx(homeV)} cy={sy(homeV)} r={10} fill={C.orange} />
              <circle cx={sx(homeV)} cy={sy(homeV)} r={16 + (frame % 20)} stroke={C.orange} strokeWidth={2} opacity={1 - (frame % 20) / 20} />
              <text x={sx(homeV) + 20} y={sy(homeV) + 30} fontFamily={F.cond} fontWeight={700} fontSize={26} letterSpacing={2} fill={C.orange} stroke="none">
                TOKYO-3
              </text>
            </g>
          )}
        </g>
      </svg>

      {/* Header */}
      <div style={{position: 'absolute', left: 60, top: 44, display: 'flex', gap: 22, alignItems: 'center', opacity: flickerIn(frame, 0, 'hdr')}}>
        <div style={{...orange, background: C.orange, color: '#000', textShadow: 'none', fontFamily: F.gothic, fontWeight: 900, fontSize: 56, padding: '8px 16px'}}>
          全支部同期
        </div>
        <div>
          <div style={{...orange, fontFamily: F.cond, fontWeight: 700, fontSize: 44, letterSpacing: 3}}>GLOBAL SYNC</div>
          <div style={{...orange, fontFamily: F.cond, fontWeight: 600, fontSize: 26, letterSpacing: 3, marginTop: 6, opacity: 0.8}}>MAGI NETWORK · ORIGIN TOKYO-3</div>
        </div>
      </div>

      {/* Branch list */}
      <div style={{position: 'absolute', left: 60, top: 200, width: 450}}>
        {SITES.map((s, i) => {
          const st = statusOf(s, frame);
          const [jp, en, color] = STATUS_LABEL[st];
          const active = st === 'sending' || (st === 'failed' && blink(frame, 5, 4));
          return (
            <div
              key={s.en}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 96,
                borderTop: `2px solid ${C.orange}55`,
                opacity: flickerIn(frame, 10 + i * 3, `row${i}`),
                background: active ? `${color}22` : 'transparent',
              }}
            >
              <div style={{flex: 1}}>
                <div style={{...orange, fontFamily: F.gothic, fontWeight: 900, fontSize: 32}}>{s.jp}</div>
                <div style={{...orange, fontFamily: F.cond, fontWeight: 600, fontSize: 22, letterSpacing: 2, marginTop: 6, opacity: 0.75}}>
                  {s.en} {st === 'synced' ? `· RTT ${String(s.rtt).padStart(3, '0')}MS` : ''}
                </div>
              </div>
              <div
                style={{
                  ...orange,
                  color: st === 'failed' && blink(frame, 5, 4) ? '#000' : color,
                  background: st === 'failed' && blink(frame, 5, 4) ? C.red : 'transparent',
                  textShadow: glow(color, 0.3),
                  border: `2px solid ${color}`,
                  padding: '8px 12px',
                  textAlign: 'right',
                  opacity: st === 'sending' ? 0.4 + 0.6 * blink(frame, 3, 3) : 1,
                }}
              >
                <div style={{fontFamily: F.gothic, fontWeight: 900, fontSize: 24}}>{jp}</div>
                <div style={{fontFamily: F.cond, fontWeight: 700, fontSize: 18, letterSpacing: 2, marginTop: 4}}>{en}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ratio */}
      <div style={{position: 'absolute', right: 60, top: 200, width: 400, opacity: flickerIn(frame, 16, 'ratio')}}>
        <div style={{...orange, display: 'flex', gap: 14, alignItems: 'baseline'}}>
          <span style={{fontFamily: F.gothic, fontWeight: 900, fontSize: 40}}>同期率</span>
          <span style={{fontFamily: F.cond, fontWeight: 600, fontSize: 28, letterSpacing: 3}}>SYNC RATIO</span>
        </div>
        <div style={{borderTop: `2px solid ${C.orange}88`, marginTop: 12, paddingTop: 16, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 10}}>
          <SevenSeg
            text={ratio.toFixed(1).padStart(5, ' ')}
            digitWidth={62}
            digitHeight={120}
            thickness={13}
            gap={2}
            spacing={0.3}
            color={failed ? C.red : C.amber}
            offColor="#1a0e02"
            glowColor={failed ? C.red : C.amber}
          />
          <span style={{...orange, fontFamily: F.cond, fontWeight: 700, fontSize: 56}}>%</span>
        </div>
        <div style={{marginTop: 30}}>
          {Array.from({length: 7}, (_, k) => {
            const line = Math.floor(frame / 4) + k;
            const hex = ((line * 2654435761) >>> 0).toString(16).toUpperCase().padStart(8, '0');
            return (
              <div key={k} style={{...orange, color: C.greenSoft, textShadow: 'none', fontFamily: F.cond, fontWeight: 500, fontSize: 24, letterSpacing: 3, marginBottom: 8, opacity: 0.3 + k * 0.1}}>
                PKT {String(line).padStart(5, '0')} · {hex} · {k % 3 === 0 ? 'ACK' : 'TX'}
              </div>
            );
          })}
        </div>
      </div>

      {/* Failure stamp */}
      {failed && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 60,
            transform: `translateX(-50%) scale(${lerp(frame, [FAIL_BREAK, FAIL_BREAK + 5], [1.3, 1], ease.out)})`,
            background: blink(frame - FAIL_BREAK, 3, 2) || frame > FAIL_BREAK + 16 ? C.red : '#000',
            border: `4px solid ${C.red}`,
            boxShadow: `0 0 40px ${C.red}`,
            padding: '12px 36px',
            textAlign: 'center',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{fontFamily: F.gothic, fontWeight: 900, fontSize: 52, color: '#000'}}>南極 応答なし</div>
          <div style={{fontFamily: F.cond, fontWeight: 700, fontSize: 30, letterSpacing: 5, color: '#000', marginTop: 8}}>ANTARCTICA · GROUND ZERO · NO RESPONSE</div>
        </div>
      )}
      <GlobalSyncSound />
      <CutTear frames={3} />
    </AbsoluteFill>
  );
};
