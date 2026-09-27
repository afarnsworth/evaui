import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {lerp} from '../anim';
import {CutTear} from '../components/CRT';
import {C, F} from '../theme';

// Matisse-style title cards: white heavy mincho on black, squeezed
// horizontally and stretched vertically, cut together at a stutter.

const cardText: React.CSSProperties = {
  fontFamily: F.mincho,
  fontWeight: 800,
  color: C.white,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  textShadow: '0 0 2px rgba(255,255,255,0.6), 0 0 18px rgba(255,255,255,0.15)',
};

const Flash: React.FC<{text: string; size: number; stretch?: number; color?: string; bg?: string}> = ({
  text,
  size,
  stretch = 1.35,
  color = C.white,
  bg = '#000',
}) => (
  <AbsoluteFill style={{backgroundColor: bg, justifyContent: 'center', alignItems: 'center'}}>
    <div
      style={{
        ...cardText,
        color,
        fontSize: size,
        transform: `scale(0.86, ${stretch})`,
      }}
    >
      {text}
    </div>
  </AbsoluteFill>
);

// [start, end) frame windows for the stutter-cut words
const FLASHES: {from: number; to: number; node: React.ReactNode}[] = [
  {from: 6, to: 14, node: <Flash text="思考" size={560} />},
  {from: 16, to: 23, node: <Flash text="起動" size={560} />},
  {from: 25, to: 30, node: <Flash text="演算" size={560} color="#000" bg={C.white} />},
  {from: 31, to: 36, node: <Flash text="MAGI" size={420} stretch={1.6} />},
  {from: 38, to: 44, node: <Flash text="第壱話" size={380} />},
];

export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = FLASHES.find((f) => frame >= f.from && frame < f.to);

  if (frame < 46) {
    return (
      <AbsoluteFill style={{backgroundColor: '#000'}}>
        {flash?.node}
        <CutTear frames={2} color="#fff" />
      </AbsoluteFill>
    );
  }

  // Final composed card, assembled in three hard cuts.
  const showVertical = frame >= 54;
  const showEnglish = frame >= 63;
  const zoom = lerp(frame, [46, 150], [1, 1.045]);
  const whiteout = lerp(frame, [144, 149], [0, 1]);

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <AbsoluteFill style={{transform: `scale(${zoom})`, transformOrigin: '40% 45%'}}>
        <div style={{...cardText, position: 'absolute', left: 250, top: 150, fontSize: 96, transform: 'scale(0.9,1.2)', transformOrigin: 'left top'}}>
          第壱話
        </div>
        <div
          style={{
            ...cardText,
            position: 'absolute',
            left: 236,
            top: 300,
            fontSize: 330,
            transform: 'scale(0.84,1.3)',
            transformOrigin: 'left top',
          }}
        >
          思考、
        </div>
        {showVertical && (
          <div
            style={{
              ...cardText,
              position: 'absolute',
              left: 1090,
              top: 400,
              fontSize: 250,
              writingMode: 'vertical-rl',
              transform: 'scale(0.95,1.08)',
              transformOrigin: 'left top',
            }}
          >
            起動
          </div>
        )}
        {showEnglish && (
          <>
            <div
              style={{
                ...cardText,
                position: 'absolute',
                left: 250,
                top: 800,
                fontSize: 64,
                letterSpacing: 2,
                transform: 'scale(0.9,1.15)',
                transformOrigin: 'left top',
              }}
            >
              EPISODE:1
            </div>
            <div
              style={{
                ...cardText,
                position: 'absolute',
                left: 250,
                top: 885,
                fontSize: 54,
                letterSpacing: 1,
                transform: 'scale(0.9,1.15)',
                transformOrigin: 'left top',
              }}
            >
              The Thinking Machine
            </div>
          </>
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{backgroundColor: C.white, opacity: whiteout}} />
      {frame < 48 && <CutTear frames={48} color="#fff" />}
    </AbsoluteFill>
  );
};
