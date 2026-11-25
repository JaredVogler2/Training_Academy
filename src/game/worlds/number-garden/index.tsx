import { amountShown, type Stimulus } from '@/engine';
import type { PictureProps, WorldModule } from '../modules';
import { GiveBoard } from './GiveBoard';
import { NumberPictureView, describeNumberPicture } from './numbers';
import { chooseScript } from './script';
import { Picture as Things, describe as describeThings } from './things';
import { voice } from './voice';

export { layout, thingScale } from './things';
export { dotPlaces, storyPlaces } from './numbers';

/** A group of things or a sign, as it always was; anything else is one of the pictures that bring numerals in. */
function Picture(props: PictureProps) {
  const { type } = props.stimulus;
  return type === 'quantity' || type === 'sign' ? (
    <Things {...props} />
  ) : (
    <NumberPictureView {...props} />
  );
}

export function describe(stimulus: Stimulus, place?: 'prompt' | 'choice' | 'card'): string {
  if (stimulus.type === 'quantity' || stimulus.type === 'sign') {
    return describeThings(stimulus, place);
  }
  return describeNumberPicture(stimulus) ?? '';
}

/** Number Garden: amounts first, numerals later. */
const numberGarden: WorldModule = {
  Picture,
  describe,
  countable: (stimulus) => amountShown(stimulus) ?? 0,
  chooseScript,
  boards: { give: GiveBoard },
  voice,
};
export default numberGarden;
