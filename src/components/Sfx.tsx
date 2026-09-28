import React, {createContext, useContext} from 'react';
import {Html5Audio, Sequence, interpolate, staticFile} from 'remotion';

// Sound effects are synthesized by scripts/make-sfx.mjs into public/sfx.
export type SfxName =
  | 'blip'
  | 'blip-lo'
  | 'chatter'
  | 'chatter2'
  | 'tick'
  | 'klaxon'
  | 'hit'
  | 'impact'
  | 'boom'
  | 'stamp'
  | 'zap'
  | 'ping'
  | 'power-on'
  | 'power-off'
  | 'static'
  | 'hum'
  | 'tension'
  | 'approve'
  | 'deny'
  | 'ratchet'
  | 'riser'
  | 'rumble'
  | 'glitch';

/** Master gain for everything below it; the monitor wall mutes its tiles. */
export const SfxGain = createContext(1);

/** One-shot effect starting at a scene-local frame. */
export const Sfx: React.FC<{at: number; name: SfxName; volume?: number}> = ({at, name, volume = 0.6}) => {
  const gain = useContext(SfxGain);
  if (gain === 0) return null;
  return (
    <Sequence from={Math.round(at)} layout="none" name={`sfx:${name}`}>
      <Html5Audio src={staticFile(`sfx/${name}.wav`)} volume={volume * gain} />
    </Sequence>
  );
};

/**
 * Background bed between two scene-local frames, with short fades. Bed files
 * are pre-tiled to 12 s by the synth script, so no <Audio loop> is needed.
 */
export const Bed: React.FC<{name: SfxName; from?: number; to: number; volume?: number; fade?: number}> = ({
  name,
  from = 0,
  to,
  volume = 0.3,
  fade = 8,
}) => {
  const gain = useContext(SfxGain);
  if (gain === 0) return null;
  const len = to - from;
  return (
    <Sequence from={from} durationInFrames={len} layout="none" name={`bed:${name}`}>
      <Html5Audio
        src={staticFile(`sfx/${name}.wav`)}
        volume={(f) =>
          volume * gain * interpolate(f, [0, fade, len - fade, len], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
        }
      />
    </Sequence>
  );
};

/** Many one-shots of the same effect. */
export const SfxAt: React.FC<{frames: number[]; name: SfxName; volume?: number}> = ({frames, name, volume}) => (
  <>
    {frames.map((f, i) => (
      <Sfx key={`${f}-${i}`} at={f} name={name} volume={volume} />
    ))}
  </>
);
