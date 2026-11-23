import type { PictureProps, WorldModule } from '../modules';
import { DesignBoard } from './DesignBoard';
import { GuessBoard, setupOf } from './GuessBoard';
import { SceneView } from './scenes';
import { voice } from './voice';
import { describe } from './words';

/**
 * Inventor Island: guess, build, test, change.
 *
 * Two boards of its own. Where a question is about a set-up — a bridge, a ramp, a beam, a boat, a thing over a
 * tub — the guess board asks what will happen and then tests it. Where there is a design to mend, the workbench
 * lets its parts be changed and tested. Both draw from the same pictures, and both are told what happens by the
 * same models (src/engine/models.ts).
 */

/** A set-up as it stands, or — where the picture says how it turned out — as it came to rest. */
function Picture({ stimulus }: PictureProps) {
  if (stimulus.type !== 'scene') return null;
  const shown = stimulus.of.shown;
  return (
    <SceneView
      scene={stimulus.scene}
      setup={setupOf(stimulus.of)}
      phase={typeof shown === 'string' ? 'after' : 'before'}
      outcome={typeof shown === 'string' ? shown : undefined}
    />
  );
}

const inventorIsland: WorldModule = {
  Picture,
  describe,
  boards: {
    design: DesignBoard,
    'scene:bridge': GuessBoard,
    'scene:ramp': GuessBoard,
    'scene:balance': GuessBoard,
    'scene:boat': GuessBoard,
    'scene:tub': GuessBoard,
  },
  voice,
};
export default inventorIsland;
