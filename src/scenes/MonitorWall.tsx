import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {blink, ease, lerp} from '../anim';
import {CutTear} from '../components/CRT';
import {C, F, glow} from '../theme';
import {ActiveTime} from './ActiveTime';
import {GlobalSync} from './GlobalSync';
import {MagiDefense} from './MagiDefense';
import {MagiVote} from './MagiVote';
import {PatternBlue} from './PatternBlue';
import {Tactical} from './Tactical';
import {ThoughtCircuit} from './ThoughtCircuit';
import {cardText} from './TitleCard';

// 主モニター — every screen at once on a 3×3 wall, live. Then the wall cuts,
// tile by tile, into a single title card: 一コマ一コマが決断.

const TILE_W = 576;
const TILE_H = 324;
const GAP = 18;
const LEFT = (1920 - (TILE_W * 3 + GAP * 2)) / 2;
const TOP = (1080 - (TILE_H * 3 + GAP * 2)) / 2;
const SCALE = TILE_W / 1920;

const CARD_AT = 112;
const OFF_AT = 166;
const MESSAGE = ['一', 'コ', 'マ', '一', 'コ', 'マ', 'が', '決', '断'];

const SoundOnly: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: '#000', justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          width: 560,
          height: 900,
          background: '#050000',
          border: `6px solid ${C.red}`,
          boxShadow: `0 0 60px ${C.red}66`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 40,
          color: C.red,
          textShadow: glow(C.red, 0.8),
          fontFamily: F.cond,
          fontWeight: 700,
        }}
      >
        <div style={{fontSize: 300, lineHeight: 1}}>04</div>
        <div style={{fontSize: 110, letterSpacing: 8, lineHeight: 1}}>SOUND</div>
        <div style={{fontSize: 110, letterSpacing: 8, lineHeight: 1}}>ONLY</div>
        <div style={{display: 'flex', gap: 14, alignItems: 'flex-end', height: 120}}>
          {Array.from({length: 9}, (_, i) => (
            <div
              key={i}
              style={{
                width: 34,
                height: 20 + Math.abs(Math.sin(frame * 0.4 + i * 1.3) * Math.sin(frame * 0.13 + i)) * 100,
                background: C.red,
              }}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const NoSignal: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: '#050505'}}>
      <svg width="100%" height="100%" viewBox="0 0 480 270" preserveAspectRatio="none" style={{position: 'absolute', inset: 0, opacity: 0.55}}>
        <filter id="ns-noise">
          <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves={1} seed={(frame * 7) % 101} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="480" height="270" filter="url(#ns-noise)" />
      </svg>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: blink(frame, 12, 6)}}>
        <div
          style={{
            background: '#000',
            border: `6px solid ${C.orange}`,
            padding: '30px 70px',
            textAlign: 'center',
            color: C.orange,
            textShadow: glow(C.orange, 0.6),
            lineHeight: 1,
          }}
        >
          <div style={{fontFamily: F.gothic, fontWeight: 900, fontSize: 130}}>信号なし</div>
          <div style={{fontFamily: F.cond, fontWeight: 700, fontSize: 90, letterSpacing: 10, marginTop: 20}}>NO SIGNAL</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

type Tile = {ch: string; label: string; Scene: React.FC; offset: number};

const TILES: Tile[] = [
  {ch: '01', label: '迎撃予測', Scene: Tactical, offset: 150},
  {ch: '02', label: '思考回路', Scene: ThoughtCircuit, offset: 120},
  {ch: '03', label: '全支部同期', Scene: GlobalSync, offset: 110},
  {ch: '04', label: '防壁', Scene: MagiDefense, offset: 110},
  {ch: '05', label: '音声のみ', Scene: SoundOnly, offset: 0},
  {ch: '06', label: '活動限界', Scene: ActiveTime, offset: 100},
  {ch: '07', label: '審議', Scene: MagiVote, offset: 100},
  {ch: '08', label: '解析', Scene: PatternBlue, offset: 90},
  {ch: '09', label: '外部回線', Scene: NoSignal, offset: 0},
];

export const MonitorWall: React.FC = () => {
  const frame = useCurrentFrame();
  const push = lerp(frame, [0, OFF_AT], [1.0, 1.03], ease.inOut);

  // Whole-wall power-off at the end
  const sy = lerp(frame, [OFF_AT, OFF_AT + 6], [1, 0.004], ease.in);
  const sx = lerp(frame, [OFF_AT + 6, OFF_AT + 11], [1, 0], ease.in);

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <AbsoluteFill style={{transform: `scale(${sx}, ${sy}) scale(${push})`, filter: `brightness(${lerp(frame, [OFF_AT, OFF_AT + 6], [1, 3])})`}}>
        {TILES.map((tile, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const on = 4 + i * 4;
          const cardOn = CARD_AT + i * 3;
          const powered = lerp(frame, [on, on + 5], [0.01, 1], ease.out);
          const flash = (frame >= on && frame < on + 3) || (frame >= cardOn && frame < cardOn + 2);
          const showCard = frame >= cardOn;
          return (
            <div
              key={tile.ch}
              style={{
                position: 'absolute',
                left: LEFT + col * (TILE_W + GAP),
                top: TOP + row * (TILE_H + GAP),
                width: TILE_W,
                height: TILE_H,
                outline: `3px solid ${showCard ? '#444' : C.orange}`,
                outlineOffset: 5,
                background: '#000',
                overflow: 'hidden',
                opacity: frame < on ? 0 : 1,
              }}
            >
              <div style={{position: 'absolute', inset: 0, transform: `scaleY(${powered})`}}>
                {!showCard && (
                  <div style={{width: 1920, height: 1080, transform: `scale(${SCALE})`, transformOrigin: 'left top', position: 'relative'}}>
                    <Sequence from={-tile.offset} layout="absolute-fill">
                      <tile.Scene />
                    </Sequence>
                  </div>
                )}
                {showCard && (
                  <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', background: '#000'}}>
                    <div style={{...cardText, fontSize: 250, transform: 'scale(0.9,1.2)'}}>{MESSAGE[i]}</div>
                  </AbsoluteFill>
                )}
                {flash && <AbsoluteFill style={{background: '#fff', opacity: 0.85}} />}
              </div>
              {!showCard && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    padding: '4px 10px',
                    background: '#000',
                    borderRight: `2px solid ${C.orange}`,
                    borderBottom: `2px solid ${C.orange}`,
                    color: C.orange,
                    fontFamily: F.cond,
                    fontWeight: 700,
                    fontSize: 20,
                    letterSpacing: 2,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  CH-{tile.ch} <span style={{fontFamily: F.gothic, fontWeight: 900, marginLeft: 6}}>{tile.label}</span>
                </div>
              )}
            </div>
          );
        })}
      </AbsoluteFill>
      {frame >= OFF_AT + 11 && frame < OFF_AT + 18 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{width: 14, height: 14, borderRadius: 7, background: '#fff', opacity: lerp(frame, [OFF_AT + 11, OFF_AT + 18], [1, 0]), boxShadow: '0 0 30px #fff, 0 0 80px #9fffc0'}} />
        </AbsoluteFill>
      )}
      <CutTear frames={3} />
    </AbsoluteFill>
  );
};
