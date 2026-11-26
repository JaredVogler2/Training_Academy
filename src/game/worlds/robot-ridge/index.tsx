import type { PictureProps, WorldModule } from '../modules';
import { Scene } from './art';
import { ProgramBoard } from './ProgramBoard';
import { bridgeLies, degreesFacing, journeyOf } from './run';
import { describe } from './text';
import { voice } from './voice';
import styles from './robotRidge.module.css';

/**
 * A journey as a small, still picture: the ground, the rocks, the river and its bridge, the star, and the robot
 * where it starts. This is what the world's page shows for an activity; the board that the journey is played on
 * draws its own. (A bridge is drawn half open: nobody knows how it stands until a run begins.)
 */
function Picture({ stimulus }: PictureProps) {
  const journey = stimulus.type === 'scene' ? journeyOf(stimulus.of) : null;
  if (!journey) return null;
  return (
    <Scene
      className={styles.mini}
      columns={journey.columns}
      rows={journey.rows}
      goal={journey.goal}
      rocks={journey.rocks}
      water={journey.water}
      bridges={journey.bridges.map((at) => ({ at, lies: bridgeLies(journey, at), state: 'maybe' }))}
      robot={{ at: journey.start, degrees: degreesFacing(journey.facing) }}
      {...(journey.game ? { strip: journey.game } : {})}
    />
  );
}

/** Robot Ridge: planning steps and fixing them. */
const robotRidge: WorldModule = {
  Picture,
  describe,
  boards: { program: ProgramBoard },
  voice,
};
export default robotRidge;
