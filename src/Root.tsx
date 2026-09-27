import React from 'react';
import {AbsoluteFill, Composition, Sequence} from 'remotion';
import './fonts';
import {CRT} from './components/CRT';
import {ActiveTime} from './scenes/ActiveTime';
import {MagiDefense} from './scenes/MagiDefense';
import {MagiVote} from './scenes/MagiVote';
import {PatternBlue} from './scenes/PatternBlue';
import {EndCard} from './scenes/EndCard';
import {TitleCard} from './scenes/TitleCard';
import {FPS, HEIGHT, WIDTH} from './theme';

const SCENES = [
  {id: 'TitleCard', component: TitleCard, duration: 150},
  {id: 'ActiveTime', component: ActiveTime, duration: 210},
  {id: 'MagiDefense', component: MagiDefense, duration: 240},
  {id: 'MagiVote', component: MagiVote, duration: 240},
  {id: 'PatternBlue', component: PatternBlue, duration: 210},
  {id: 'EndCard', component: EndCard, duration: 150},
] as const;

const TOTAL = SCENES.reduce((n, s) => n + s.duration, 0);

const MagiSequence: React.FC = () => {
  let from = 0;
  return (
    <CRT>
      {SCENES.map(({id, component: Scene, duration}) => {
        const seq = (
          <Sequence key={id} from={from} durationInFrames={duration} name={id}>
            <Scene />
          </Sequence>
        );
        from += duration;
        return seq;
      })}
    </CRT>
  );
};

// Each scene also gets its own composition for previewing in the Studio.
const SOLOS = SCENES.map(({id, component: Scene, duration}) => {
  const Solo: React.FC = () => (
    <CRT>
      <AbsoluteFill>
        <Scene />
      </AbsoluteFill>
    </CRT>
  );
  return {id, Solo, duration};
});

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="MagiSequence"
      component={MagiSequence}
      durationInFrames={TOTAL}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    {SOLOS.map(({id, Solo, duration}) => (
      <Composition
        key={id}
        id={`Scene-${id}`}
        component={Solo}
        durationInFrames={duration}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    ))}
  </>
);
