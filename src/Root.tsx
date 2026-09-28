import React from 'react';
import {AbsoluteFill, Composition, Sequence} from 'remotion';
import './fonts';
import {CRT} from './components/CRT';
import {ActiveTime} from './scenes/ActiveTime';
import {EndCard} from './scenes/EndCard';
import {MagiDefense} from './scenes/MagiDefense';
import {MagiVote} from './scenes/MagiVote';
import {PatternBlue} from './scenes/PatternBlue';
import {GlobalSync} from './scenes/GlobalSync';
import {Tactical} from './scenes/Tactical';
import {ThoughtCircuit} from './scenes/ThoughtCircuit';
import {MonitorWall} from './scenes/MonitorWall';
import {TitleCard, TitleCardTwo} from './scenes/TitleCard';
import {FPS, HEIGHT, WIDTH} from './theme';

type SceneDef = {id: string; component: React.FC; duration: number};

// Episode 1: recreations of screens from the show.
export const EPISODE_1: SceneDef[] = [
  {id: 'TitleCard', component: TitleCard, duration: 150},
  {id: 'ActiveTime', component: ActiveTime, duration: 210},
  {id: 'MagiDefense', component: MagiDefense, duration: 240},
  {id: 'MagiVote', component: MagiVote, duration: 240},
  {id: 'PatternBlue', component: PatternBlue, duration: 210},
  {id: 'EndCard', component: EndCard, duration: 150},
];

// Episode 2: new screens in the same design language.
export const EPISODE_2: SceneDef[] = [
  {id: 'TitleCardTwo', component: TitleCardTwo, duration: 110},
  {id: 'Tactical', component: Tactical, duration: 300},
  {id: 'ThoughtCircuit', component: ThoughtCircuit, duration: 290},
  {id: 'GlobalSync', component: GlobalSync, duration: 270},
  {id: 'MonitorWall', component: MonitorWall, duration: 186},
];

const total = (scenes: SceneDef[]) => scenes.reduce((n, s) => n + s.duration, 0);

const sequenceOf = (scenes: SceneDef[]) => {
  const Seq: React.FC = () => {
    let from = 0;
    return (
      <CRT>
        {scenes.map(({id, component: Scene, duration}) => {
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
  return Seq;
};

const MagiSequence = sequenceOf(EPISODE_1);
const UnfamiliarScreen = sequenceOf(EPISODE_2);

// Each scene also gets its own composition for previewing in the Studio.
const SOLOS = [...EPISODE_1, ...EPISODE_2].map(({id, component: Scene, duration}) => {
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
    <Composition id="MagiSequence" component={MagiSequence} durationInFrames={total(EPISODE_1)} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition
      id="UnfamiliarScreen"
      component={UnfamiliarScreen}
      durationInFrames={total(EPISODE_2)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    {SOLOS.map(({id, Solo, duration}) => (
      <Composition key={id} id={`Scene-${id}`} component={Solo} durationInFrames={duration} fps={FPS} width={WIDTH} height={HEIGHT} />
    ))}
  </>
);
