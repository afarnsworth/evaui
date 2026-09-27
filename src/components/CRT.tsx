import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';

/**
 * Broadcast-monitor finish applied over everything: scanlines, a rolling
 * hum bar, vignette, per-frame grain and a faint brightness flutter.
 */
export const CRT: React.FC<{children: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  const flutter = 0.03 + random(`flutter-${frame}`) * 0.05;
  const roll = ((frame * 7) % 1400) - 200;

  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      <AbsoluteFill style={{filter: 'saturate(1.12) contrast(1.06)'}}>{children}</AbsoluteFill>

      {/* grain */}
      <AbsoluteFill style={{opacity: 0.09, mixBlendMode: 'screen'}}>
        <svg width="100%" height="100%" viewBox="0 0 480 270" preserveAspectRatio="none">
          <filter id="grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves={2}
              seed={frame % 97}
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="480" height="270" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>

      {/* hum bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: roll,
          height: 220,
          background:
            'linear-gradient(180deg, transparent, rgba(255,255,255,0.035) 50%, transparent)',
        }}
      />

      {/* scanlines */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.32) 0px, rgba(0,0,0,0.32) 1px, transparent 2px, transparent 4px)',
        }}
      />

      {/* vignette + tube curvature falloff */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 85%, rgba(0,0,0,0.9) 100%)',
        }}
      />

      <AbsoluteFill style={{backgroundColor: '#000', opacity: flutter}} />
    </AbsoluteFill>
  );
};

/**
 * Signal tear for hard cuts: a few frames of displaced horizontal bands.
 * Place at the head of each scene.
 */
export const CutTear: React.FC<{frames?: number; color?: string}> = ({
  frames = 3,
  color = '#46ff8a',
}) => {
  const frame = useCurrentFrame();
  if (frame >= frames) return null;
  const bands = Array.from({length: 7}, (_, i) => {
    const r = (k: string) => random(`tear-${frame}-${i}-${k}`);
    return {
      top: r('y') * 1080,
      height: 4 + r('h') * 60,
      left: (r('x') - 0.5) * 300,
      opacity: 0.15 + r('o') * 0.5,
      white: r('c') > 0.6,
    };
  });
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {bands.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: b.top,
            height: b.height,
            left: b.left,
            width: 1920,
            opacity: b.opacity,
            background: b.white ? '#fff' : color,
            mixBlendMode: 'screen',
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
