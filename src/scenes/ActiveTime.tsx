import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {blink, ease, flickerIn, lerp, pad, changeFrames} from '../anim';
import {CutTear} from '../components/CRT';
import {Bed, Sfx, SfxAt} from '../components/Sfx';
import {SevenSeg} from '../components/SevenSeg';
import {C, F, FPS, glow} from '../theme';

// Internal battery countdown. Starts on external power, the umbilical cable
// is severed, the unit switches to internal power and the five-minute clock
// starts running — then the operator throws it into RACING.

const CABLE_CUT = 50;
const RACE = 122;

const remainingSeconds = (f: number) => {
  if (f < CABLE_CUT) return 300;
  const base = (f - CABLE_CUT) / FPS;
  const burn = f > RACE ? (f - RACE) ** 2 * 0.011 : 0;
  return Math.max(0, 300 - base - burn);
};

const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.floor((sec * 100) % 100);
  return `${m}:${pad(s, 2)}:${pad(cs, 2)}`;
};

const orangeText: React.CSSProperties = {
  color: C.orange,
  textShadow: glow(C.orange, 0.8),
  whiteSpace: 'nowrap',
  lineHeight: 1,
};

const MODES = ['STOP', 'SLOW', 'NORMAL', 'RACING'] as const;

const ModeButton: React.FC<{label: string; active: boolean; hot: boolean}> = ({label, active, hot}) => (
  <div
    style={{
      width: 250,
      height: 104,
      padding: 10,
      background: 'linear-gradient(180deg, #7ef06a, #2fb150)',
      boxShadow: '0 0 30px rgba(70,255,138,0.25)',
    }}
  >
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#050505',
        border: `2px solid ${C.orange}`,
        overflow: 'hidden',
      }}
    >
      {active && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '48%',
            background: hot ? C.red : C.redDeep,
            boxShadow: `0 0 24px ${C.red}`,
          }}
        />
      )}
      <div
        style={{
          ...orangeText,
          position: 'absolute',
          top: 6,
          width: '100%',
          textAlign: 'center',
          fontFamily: F.cond,
          fontWeight: 700,
          fontSize: 46,
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
    </div>
  </div>
);

const ActiveTimeSound: React.FC = () => (
  <>
    <Bed name="hum" to={210} volume={0.35} />
    <Sfx at={0} name="power-on" volume={0.5} />
    <SfxAt frames={[3, 6, 10, 14]} name="blip" volume={0.25} />
    <SfxAt frames={[9, 12]} name="blip-lo" volume={0.25} />
    <Sfx at={18} name="chatter" volume={0.18} />
    <Sfx at={CABLE_CUT} name="impact" volume={0.9} />
    <Sfx at={CABLE_CUT} name="static" volume={0.5} />
    <Bed name="klaxon" from={CABLE_CUT + 4} to={210} volume={0.2} />
    {/* One tick per displayed second, which becomes a rattle once RACING burns the clock down */}
    <SfxAt frames={changeFrames(CABLE_CUT + 1, 210, (f) => Math.floor(remainingSeconds(f)))} name="tick" volume={0.5} />
    <Sfx at={RACE} name="stamp" volume={0.6} />
    <Bed name="tension" from={RACE} to={210} volume={0.35} fade={20} />
  </>
);

export const ActiveTime: React.FC = () => {
  const frame = useCurrentFrame();
  const internal = frame >= CABLE_CUT;
  const racing = frame >= RACE;
  const sec = remainingSeconds(frame);

  // Camera drift + impact shake when the cable blows.
  const shakeAmt = internal ? lerp(frame, [CABLE_CUT, CABLE_CUT + 16], [26, 0], ease.out) : 0;
  const raceShake = racing ? lerp(frame, [RACE, RACE + 10], [14, 0], ease.out) : 0;
  const sh = shakeAmt + raceShake;
  const sx = (random(`sx-${frame}`) - 0.5) * sh;
  const sy = (random(`sy-${frame}`) - 0.5) * sh;
  const rx = lerp(frame, [0, 210], [16, 9], ease.inOut);
  const ry = lerp(frame, [0, 210], [-22, -12], ease.inOut);
  const rz = lerp(frame, [0, 210], [-9, -5], ease.inOut);
  const scale = lerp(frame, [0, 210], [0.84, 0.98], ease.inOut);

  const panelOn = flickerIn(frame, 0, 'panel');
  const digitsColor = racing && blink(frame, 3, 2) === 0 ? C.red : C.amber;

  const modeColor = internal ? C.orange : C.green;
  const modeStripe = internal ? C.red : C.greenDim;

  // Registration ticks along the panel edges
  const ticks = Array.from({length: 22}, (_, i) => i);

  return (
    <AbsoluteFill style={{backgroundColor: '#020302', perspective: 1700, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 90,
          width: 1700,
          height: 800,
          transformStyle: 'preserve-3d',
          transform: `translate(${sx}px, ${sy}px) scale(${scale}) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
          opacity: panelOn,
        }}
      >
        {/* Lime backplane bleeding in from the left */}
        <div
          style={{
            position: 'absolute',
            left: -760,
            top: -260,
            width: 820,
            height: 1500,
            transform: 'translateZ(-160px)',
            background: 'linear-gradient(170deg, #dcf65a 0%, #74e05c 38%, #3aa850 62%, #c8401d 100%)',
            filter: 'blur(1px)',
          }}
        />
        {/* Upper green backplane */}
        <div
          style={{
            position: 'absolute',
            left: 40,
            top: -420,
            width: 1400,
            height: 360,
            transform: 'translateZ(-80px)',
            background: 'linear-gradient(90deg, #56d55c, #1d6b33)',
          }}
        />

        {/* Main display panel */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 40% 60%, #0b0d0c, #030303 70%)',
            border: `3px solid ${C.orange}`,
            boxShadow: `0 0 18px ${C.orange}66, inset 0 0 80px #000`,
          }}
        >
          {ticks.map((i) => (
            <React.Fragment key={i}>
              <div style={{position: 'absolute', top: -14, left: 40 + i * 76, width: 6, height: 6, background: C.green, opacity: 0.8}} />
              <div style={{position: 'absolute', bottom: -14, left: 40 + i * 76, width: 6, height: 6, background: C.green, opacity: 0.8}} />
            </React.Fragment>
          ))}

          {/* Umbilical warning */}
          {internal && (
            <div
              style={{
                position: 'absolute',
                left: 60,
                top: 44,
                padding: '10px 22px',
                border: `3px solid ${C.red}`,
                opacity: blink(frame, 7, 5) ? 1 : 0.25,
                boxShadow: `0 0 20px ${C.red}88`,
              }}
            >
              <div style={{...orangeText, color: C.red, textShadow: glow(C.red, 0.8), fontFamily: F.gothic, fontWeight: 900, fontSize: 40}}>
                アンビリカルケーブル切断
              </div>
              <div style={{...orangeText, color: C.red, textShadow: glow(C.red, 0.8), fontFamily: F.cond, fontWeight: 600, fontSize: 30, marginTop: 6}}>
                UMBILICAL CABLE DISCONNECTED
              </div>
            </div>
          )}

          {/* Label row */}
          <div style={{position: 'absolute', left: 60, top: 300, display: 'flex', alignItems: 'flex-end', gap: 22, opacity: flickerIn(frame, 6, 'label')}}>
            <div style={{border: `3px solid ${C.orange}`, padding: '6px 12px', boxShadow: `0 0 12px ${C.orange}66`}}>
              <div style={{...orangeText, fontFamily: F.gothic, fontWeight: 900, fontSize: 50}}>活動限界まで</div>
            </div>
            <div style={{...orangeText, fontFamily: F.cond, fontWeight: 600, fontSize: 44, letterSpacing: 1, paddingBottom: 6}}>
              ACTIVE TIME REMAINING:
            </div>
          </div>
          <div style={{...orangeText, position: 'absolute', left: 64, top: 400, fontFamily: F.gothic, fontWeight: 900, fontSize: 50, opacity: flickerIn(frame, 9, 'ato')}}>
            あと
          </div>

          {/* The clock */}
          <div style={{position: 'absolute', left: 170, top: 440, opacity: flickerIn(frame, 10, 'digits')}}>
            {internal ? (
              <SevenSeg
                text={fmt(sec)}
                digitWidth={180}
                digitHeight={340}
                thickness={32}
                gap={4}
                spacing={0.3}
                skew={-9}
                color={digitsColor}
                offColor="#170c02"
                glowColor={digitsColor}
              />
            ) : (
              <SevenSeg
                text="-:--:--"
                digitWidth={180}
                digitHeight={340}
                thickness={32}
                gap={4}
                spacing={0.3}
                skew={-9}
                color={blink(frame, 10, 6) ? C.greenSoft : '#0c2a16'}
                offColor="#0a160e"
                glowColor={C.green}
              />
            )}
          </div>

          {/* Power-source box */}
          <div
            style={{
              position: 'absolute',
              right: 50,
              top: 34,
              width: 580,
              height: 222,
              border: `3px solid ${modeColor}`,
              boxShadow: `0 0 16px ${modeColor}66`,
              opacity: flickerIn(frame, 3, 'mode') * (frame >= CABLE_CUT && frame < CABLE_CUT + 6 ? blink(frame, 1, 1) : 1),
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: 150,
                background: `repeating-linear-gradient(-58deg, ${modeStripe} 0 26px, transparent 26px 60px)`,
                opacity: 0.95,
              }}
            />
            <div
              style={{
                ...orangeText,
                color: modeColor,
                textShadow: glow(modeColor, 0.8),
                position: 'absolute',
                left: 28,
                top: 12,
                fontFamily: F.mincho,
                fontWeight: 800,
                fontSize: 136,
                transform: 'scale(1,1.08)',
                transformOrigin: 'left top',
              }}
            >
              {internal ? '内部' : '外部'}
            </div>
            <div
              style={{
                ...orangeText,
                color: modeColor,
                textShadow: glow(modeColor, 0.8),
                position: 'absolute',
                left: 32,
                top: 160,
                fontFamily: F.cond,
                fontWeight: 600,
                fontSize: 52,
                letterSpacing: 2,
              }}
            >
              {internal ? 'INTERNAL' : 'EXTERNAL'}
            </div>
          </div>

          {/* Supply system tag */}
          <div
            style={{
              position: 'absolute',
              right: 50,
              top: 276,
              width: 580,
              padding: '10px 20px',
              border: `3px solid ${C.orange}`,
              boxShadow: `0 0 12px ${C.orange}55`,
              opacity: flickerIn(frame, 12, 'supply'),
            }}
          >
            <div style={{...orangeText, fontFamily: F.gothic, fontWeight: 900, fontSize: 54}}>主電源供給システム</div>
            <div style={{...orangeText, fontFamily: F.cond, fontWeight: 600, fontSize: 34, letterSpacing: 1, marginTop: 4}}>
              MAIN ENERGY SUPPLY SYSTEM
            </div>
          </div>
        </div>

        {/* Drive-mode selector on its own plate, floating forward */}
        <div
          style={{
            position: 'absolute',
            left: 170,
            top: 850,
            display: 'flex',
            gap: 20,
            transform: 'translateZ(60px)',
            opacity: flickerIn(frame, 14, 'buttons'),
          }}
        >
          {MODES.map((m) => (
            <ModeButton
              key={m}
              label={m}
              active={racing ? m === 'RACING' : m === 'NORMAL'}
              hot={racing ? blink(frame, 4, 3) === 1 : false}
            />
          ))}
        </div>
      </div>

      {/* Cable-cut flash */}
      <AbsoluteFill
        style={{
          backgroundColor: C.red,
          mixBlendMode: 'screen',
          opacity: internal ? lerp(frame, [CABLE_CUT, CABLE_CUT + 8], [0.75, 0]) : 0,
        }}
      />
      <ActiveTimeSound />
      <CutTear frames={3} color={C.orange} />
    </AbsoluteFill>
  );
};
