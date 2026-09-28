import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ease, lerp} from '../anim';
import {CutTear} from '../components/CRT';
import {Bed, Sfx} from '../components/Sfx';
import {C, F} from '../theme';

// Staff card, then 終劇, then the tube switches off.

const card: React.CSSProperties = {
  position: 'absolute',
  fontFamily: F.mincho,
  fontWeight: 800,
  color: C.white,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  transformOrigin: 'left top',
  textShadow: '0 0 2px rgba(255,255,255,0.6), 0 0 18px rgba(255,255,255,0.15)',
};

const FIN_AT = 78;
const OFF_AT = 128;

const EndCardSound: React.FC = () => (
  <>
    <Bed name="hum" to={OFF_AT} volume={0.2} />
    <Sfx at={0} name="static" volume={0.4} />
    <Sfx at={0} name="hit" volume={0.6} />
    <Sfx at={7} name="hit" volume={0.6} />
    <Sfx at={15} name="blip-lo" volume={0.3} />
    <Sfx at={FIN_AT} name="boom" volume={0.9} />
    <Sfx at={OFF_AT} name="power-off" volume={0.7} />
  </>
);

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();

  // CRT power-off: collapse to a line, then to a point.
  const sy = lerp(frame, [OFF_AT, OFF_AT + 7], [1, 0.004], ease.in);
  const sx = lerp(frame, [OFF_AT + 7, OFF_AT + 14], [1, 0], ease.in);
  const bright = lerp(frame, [OFF_AT, OFF_AT + 7], [1, 4]);
  const dot = frame >= OFF_AT + 14 ? lerp(frame, [OFF_AT + 14, OFF_AT + 20], [1, 0]) : 0;

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <AbsoluteFill
        style={{
          transform: `scale(${sx}, ${sy})`,
          filter: `brightness(${bright})`,
          backgroundColor: frame >= OFF_AT ? '#111' : '#000',
        }}
      >
        {frame < FIN_AT - 4 && (
          <AbsoluteFill style={{transform: `scale(${lerp(frame, [0, FIN_AT], [1, 1.04])})`, transformOrigin: '30% 50%'}}>
            <div style={{...card, left: 250, top: 190, fontSize: 104, transform: 'scale(0.9,1.2)'}}>動作設計</div>
            {frame >= 7 && (
              <div style={{...card, left: 232, top: 360, fontSize: 340, transform: 'scale(0.8,1.3)', letterSpacing: -6}}>
                CLAUDE
              </div>
            )}
            {frame >= 15 && (
              <div style={{...card, left: 252, top: 850, fontSize: 60, transform: 'scale(0.9,1.15)', letterSpacing: 2}}>
                MOTION DESIGN
              </div>
            )}
          </AbsoluteFill>
        )}

        {frame >= FIN_AT && (
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
            <div
              style={{
                ...card,
                position: 'relative',
                fontSize: 400,
                transform: `scale(0.86,1.3) scale(${lerp(frame, [FIN_AT, OFF_AT], [1, 1.03])})`,
                transformOrigin: 'center',
                letterSpacing: 40,
                marginRight: -40,
              }}
            >
              終劇
            </div>
          </AbsoluteFill>
        )}
      </AbsoluteFill>

      {dot > 0 && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: '#fff',
              opacity: dot,
              boxShadow: '0 0 30px #fff, 0 0 80px #9fffc0',
            }}
          />
        </AbsoluteFill>
      )}
      <EndCardSound />
      <CutTear frames={3} color="#fff" />
    </AbsoluteFill>
  );
};
