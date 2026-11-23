import type { WorldModule } from '../modules';
import { GiveBoard } from './GiveBoard';
import { chooseScript } from './script';
import { Picture, describe } from './things';
import { voice } from './voice';

export { describe, layout, thingScale } from './things';

/** Number Garden: amounts first, numerals later. */
const numberGarden: WorldModule = {
  Picture,
  describe,
  countable: (stimulus) => (stimulus.type === 'quantity' ? stimulus.count : 0),
  chooseScript,
  boards: { give: GiveBoard },
  voice,
};
export default numberGarden;
