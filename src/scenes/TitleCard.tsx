import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {lerp} from '../anim';
import {CutTear} from '../components/CRT';
import {C, F} from '../theme';

// Matisse-style title cards: white heavy mincho on black, squeezed
// horizontally and stretched vertically, cut together at a stutter.

export const cardText: React.CSSProperties = {
  fontFamily: F.mincho,
  fontWeight: 800,
  color: C.white,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  textShadow: '0 0 2px rgba(255,255,255,0.6), 0 0 18px rgba(255,255,255,0.15)',
};

export const Flash: React.FC<{text: string; size: number; stretch?: number; color?: string; bg?: string}> = ({
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

type CardSpec = {
  // [start, end) frame windows for the stutter-cut words
  flashes: {from: number; to: number; node: React.ReactNode}[];
  cardAt: number;
  duration: number;
  episode: string;
  across: string;
  acrossSize: number;
  down: string;
  downLeft: number;
  english: [string, string];
};

const makeTitleCard = (spec: CardSpec) => {
  const Card: React.FC = () => {
    const frame = useCurrentFrame();
    const flash = spec.flashes.find((f) => frame >= f.from && frame < f.to);

    if (frame < spec.cardAt) {
      return (
        <AbsoluteFill style={{backgroundColor: '#000'}}>
          {flash?.node}
          <CutTear frames={2} color="#fff" />
        </AbsoluteFill>
      );
    }

    // Final composed card, assembled in three hard cuts.
    const t = frame - spec.cardAt;
    const zoom = lerp(frame, [spec.cardAt, spec.duration], [1, 1.045]);
    const whiteout = lerp(frame, [spec.duration - 6, spec.duration - 1], [0, 1]);

    return (
      <AbsoluteFill style={{backgroundColor: '#000'}}>
        <AbsoluteFill style={{transform: `scale(${zoom})`, transformOrigin: '40% 45%'}}>
          <div style={{...cardText, position: 'absolute', left: 250, top: 150, fontSize: 96, transform: 'scale(0.9,1.2)', transformOrigin: 'left top'}}>
            {spec.episode}
          </div>
          <div
            style={{
              ...cardText,
              position: 'absolute',
              left: 236,
              top: 300,
              fontSize: spec.acrossSize,
              transform: 'scale(0.84,1.3)',
              transformOrigin: 'left top',
            }}
          >
            {spec.across}
          </div>
          {t >= 8 && (
            <div
              style={{
                ...cardText,
                position: 'absolute',
                left: spec.downLeft,
                top: 400,
                fontSize: 250,
                writingMode: 'vertical-rl',
                transform: 'scale(0.95,1.08)',
                transformOrigin: 'left top',
              }}
            >
              {spec.down}
            </div>
          )}
          {t >= 17 &&
            spec.english.map((line, i) => (
              <div
                key={line}
                style={{
                  ...cardText,
                  position: 'absolute',
                  left: 250,
                  top: i === 0 ? 800 : 885,
                  fontSize: i === 0 ? 64 : 54,
                  letterSpacing: i === 0 ? 2 : 1,
                  transform: 'scale(0.9,1.15)',
                  transformOrigin: 'left top',
                }}
              >
                {line}
              </div>
            ))}
        </AbsoluteFill>
        <AbsoluteFill style={{backgroundColor: C.white, opacity: whiteout}} />
        {t < 2 && <CutTear frames={spec.cardAt + 2} color="#fff" />}
      </AbsoluteFill>
    );
  };
  return Card;
};

export const TitleCard = makeTitleCard({
  flashes: [
    {from: 6, to: 14, node: <Flash text="思考" size={560} />},
    {from: 16, to: 23, node: <Flash text="起動" size={560} />},
    {from: 25, to: 30, node: <Flash text="演算" size={560} color="#000" bg={C.white} />},
    {from: 31, to: 36, node: <Flash text="MAGI" size={420} stretch={1.6} />},
    {from: 38, to: 44, node: <Flash text="第壱話" size={380} />},
  ],
  cardAt: 46,
  duration: 150,
  episode: '第壱話',
  across: '思考、',
  acrossSize: 330,
  down: '起動',
  downLeft: 1090,
  english: ['EPISODE:1', 'The Thinking Machine'],
});

// Episode 2 riffs on the show's second episode title, 見知らぬ、天井.
export const TitleCardTwo = makeTitleCard({
  flashes: [
    {from: 4, to: 11, node: <Flash text="画面" size={560} />},
    {from: 13, to: 18, node: <Flash text="未知" size={560} color="#000" bg={C.white} />},
    {from: 20, to: 26, node: <Flash text="第弐話" size={380} />},
  ],
  cardAt: 28,
  duration: 110,
  episode: '第弐話',
  across: '見知らぬ、',
  acrossSize: 270,
  down: '画面',
  downLeft: 1400,
  english: ['EPISODE:2', 'An Unfamiliar Screen'],
});
