import type { ChooseOneChallenge, MakeChallenge, Stimulus } from '@/engine';
import {
  APART,
  MAP,
  distance,
  islandsOf,
  onTheMap,
  plainly,
  pointOf,
  standing,
  type Point,
} from '../explorer-harbor/maps';
import storybookFile from '../explorer-harbor/storybook.json';
import type { Report, WorldRules } from './types';

/**
 * Explorer Harbor's answers are about what happens and about where things are, so its rules know its stories and
 * work its maps out again from their numbers.
 *
 *   a story to put in order     the three pictures of one story of the storybook, each told with its own line
 *   how a story ends            the ending is the story's own; nothing else offered could end it
 *   what made it happen         the cause is the storybook's; nothing else offered could have done it
 *   what happens next           the same, for how it turns out; and the thing as it was is never offered
 *   a flag on water, or land    one flag stands plainly on what is asked for, the others plainly on the other
 *   the nearest, the farthest   one island is so by a good deal
 */

interface Story {
  panels: string[];
  told: string[];
  neverEnd: string[];
}
interface Change {
  before: string;
  cause: string;
  after: string;
  alsoCauses: string[];
  alsoAfters: string[];
}

const PICTURES: Readonly<Record<string, string>> = storybookFile.pictures;
const STORIES: Readonly<Record<string, Story>> = storybookFile.stories;
const CHANGES: Readonly<Record<string, Change>> = storybookFile.changes;

const pictureId = (stimulus: Stimulus): string | null =>
  stimulus.type === 'picture' ? stimulus.id : null;

const listOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((each): each is string => typeof each === 'string') : [];

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((each, index) => each === b[index]);

function known(ids: readonly string[], report: Report): void {
  for (const id of ids) {
    if (!Object.hasOwn(PICTURES, id)) {
      report('story-picture-unknown', `"${id}" is not a picture in the storybook`);
    }
  }
}

function lintStory(challenge: MakeChallenge, report: Report): void {
  const { task } = challenge;
  if (task.type !== 'order') {
    report('explorer-harbor-task', `Explorer Harbor has no rule for a "${task.type}" task`);
    return;
  }
  known(
    task.cards.map((card) => card.id),
    report,
  );
  for (const card of task.cards) {
    if (pictureId(card.stimulus) !== card.id) {
      report('story-card', `card "${card.id}" is not the picture of that name`);
    }
  }
  const story = Object.values(STORIES).find((each) => sameList(each.panels, task.solution));
  if (!story) {
    report('story-order', 'the order asked for is not that of a story in the storybook');
    return;
  }
  // A picture is named by the line it is told with: what a screen reader says is what the voice says.
  for (const card of task.cards) {
    const line = story.told[story.panels.indexOf(card.id)];
    if (card.label !== line) {
      report('story-told', `card "${card.id}" is not labelled with the line it is told with`);
    }
  }
}

/** Exactly one choice is the picture wanted, and it is the one marked. Returns the pictures that are wrong. */
function oneRight(challenge: ChooseOneChallenge, wanted: string, report: Report): string[] {
  const offered = challenge.choices.map((choice) => pictureId(choice.stimulus));
  if (offered.includes(null)) report('strip-choice', 'a choice is not a picture');
  const pictures = offered.filter((id): id is string => id !== null);
  known(pictures, report);
  if (new Set(pictures).size !== pictures.length) {
    report('strip-choice-twice', 'a picture is offered twice');
  }
  const right = challenge.choices.filter((choice) => pictureId(choice.stimulus) === wanted);
  if (right.length !== 1) {
    report('strip-answer-count', `${String(right.length)} choices are right; exactly one must be`);
  } else if (right[0]?.id !== challenge.answer) {
    report(
      'strip-answer-wrong',
      `"${challenge.answer}" is marked correct but "${right[0]?.id ?? ''}" is`,
    );
  }
  return pictures.filter((id) => id !== wanted);
}

function lintStrip(
  challenge: ChooseOneChallenge,
  of: Extract<Stimulus, { type: 'scene' }>['of'],
  report: Report,
): void {
  const parts = listOf(of.parts);
  const { gap, kind } = of;
  known(parts, report);
  if (parts.length !== 3 || (kind !== 'story' && kind !== 'change')) {
    report('strip-shape', 'a strip is three pictures, of a story or of a change');
    return;
  }
  const [first = '', middle = '', last = ''] = parts;

  if (kind === 'story') {
    const story = Object.values(STORIES).find((each) => sameList(each.panels, parts));
    if (!story) {
      report('story-order', 'the pictures are not those of a story in the storybook, in its order');
      return;
    }
    if (gap !== 2) {
      report(
        'strip-shape',
        'a story is asked about by its ending: the last picture is the one missing',
      );
      return;
    }
    for (const wrong of oneRight(challenge, last, report)) {
      if (story.neverEnd.includes(wrong) || story.panels.includes(wrong)) {
        report('ending-plausible', `"${wrong}" could be taken for how this story ends`);
      }
    }
    return;
  }

  const found = Object.entries(CHANGES).find(
    ([, each]) => each.before === first && each.cause === middle && each.after === last,
  );
  if (!found) {
    report(
      'change-unknown',
      'this is not a change the storybook has: a thing, what did it, and how it was after',
    );
    return;
  }
  const [name, change] = found;
  if (gap !== 1 && gap !== 2) {
    report('strip-shape', 'a change is asked about by what did it, or by how it turned out');
    return;
  }
  // The question that is said aloud is the one about this change, and so is what is said of the answer.
  const line = `eh.${gap === 1 ? 'why' : 'next'}.${name}`;
  if (challenge.prompt.instruction !== line || challenge.feedback.correct !== `${line}.correct`) {
    report('change-line', `the question and its answer are not the lines written for "${name}"`);
  }
  if (gap === 1) {
    for (const wrong of oneRight(challenge, change.cause, report)) {
      if (change.alsoCauses.includes(wrong)) {
        report('cause-plausible', `"${wrong}" could have done this too`);
      }
    }
    return;
  }
  for (const wrong of oneRight(challenge, change.after, report)) {
    // The thing just as it was is never offered: picking the picture that matches is another game.
    if (change.alsoAfters.includes(wrong) || wrong === change.before) {
      report('after-plausible', `"${wrong}" could be taken for how this turns out`);
    }
  }
}

const MARKS = ['palm', 'hut', 'light'];

function lintMap(
  challenge: ChooseOneChallenge,
  of: Extract<Stimulus, { type: 'scene' }>['of'],
  report: Report,
): void {
  const { ask } = of;
  if (ask !== 'water' && ask !== 'land' && ask !== 'near' && ask !== 'far') {
    report('map-ask', 'a map asks for water, for land, for the nearest or for the farthest');
    return;
  }
  const spots: { id: string; at: Point; mark: unknown }[] = [];
  for (const choice of challenge.choices) {
    const { stimulus } = choice;
    const at =
      stimulus.type === 'scene' && stimulus.scene === 'spot'
        ? pointOf([stimulus.of.x, stimulus.of.y])
        : null;
    if (stimulus.type !== 'scene' || at === null) {
      report('map-spot', `choice "${choice.id}" is not a place on the map`);
      return;
    }
    spots.push({ id: choice.id, at, mark: stimulus.of.mark });
  }
  for (const spot of spots) {
    if (!onTheMap(spot.at))
      report('map-edge', `place "${spot.id}" is too near the edge of the map`);
    for (const other of spots) {
      if (other.id < spot.id && distance(other.at, spot.at) < APART) {
        report('map-crowded', `places "${other.id}" and "${spot.id}" are too close to press apart`);
      }
    }
  }

  if (ask === 'water' || ask === 'land') {
    const islands = islandsOf(of.islands);
    const inside = islands.every(
      (island) =>
        island.rx > 0 &&
        island.ry > 0 &&
        island.x - island.rx >= 0 &&
        island.x + island.rx <= MAP.width &&
        island.y - island.ry >= 0 &&
        island.y + island.ry <= MAP.height,
    );
    if (islands.length === 0 || !inside) {
      report('map-island', 'a map of land and water has islands, each wholly on the map');
      return;
    }
    // The same flag everywhere: what stands at a place must not say what the place is.
    if (spots.some((spot) => spot.mark !== 'flag')) {
      report('map-mark', 'every place on a map of land and water is marked with the same flag');
    }
    const stands = spots.map((spot) => standing(islands, spot.at));
    if (stands.includes('unclear')) {
      report('map-unclear', 'a flag is too near a shore to say whether it is on land or on water');
      return;
    }
    const right = spots.filter((_, index) => stands[index] === ask);
    if (right.length !== 1) {
      report(
        'map-answer-count',
        `${String(right.length)} flags are on the ${ask}; exactly one must be`,
      );
    } else if (right[0]?.id !== challenge.answer) {
      report(
        'map-answer-wrong',
        `"${challenge.answer}" is marked correct but "${right[0]?.id ?? ''}" is`,
      );
    }
    return;
  }

  const boat = pointOf(of.boat);
  if (boat === null || !onTheMap(boat)) {
    report('map-boat', 'a question about how far away things are needs a boat, on the map');
    return;
  }
  const marks = spots.map((spot) => spot.mark);
  if (new Set(marks).size !== marks.length || marks.some((mark) => !MARKS.includes(String(mark)))) {
    report('map-mark', 'each island has a landmark of its own, to tell it by');
  }
  const which = plainly(
    ask,
    boat,
    spots.map((spot) => spot.at),
  );
  if (which === null) {
    report('map-unclear', `no island is plainly the ${ask === 'near' ? 'nearest' : 'farthest'}`);
  } else if (spots[which]?.id !== challenge.answer) {
    report(
      'map-answer-wrong',
      `"${challenge.answer}" is marked correct but "${spots[which]?.id ?? ''}" is`,
    );
  }
}

export const explorerHarborRules: WorldRules = (challenge, _lesson, report) => {
  if (challenge.kind === 'make') {
    lintStory(challenge, report);
    return;
  }
  const { stimulus } = challenge.prompt;
  if (stimulus.type === 'scene' && stimulus.scene === 'strip') {
    lintStrip(challenge, stimulus.of, report);
  } else if (stimulus.type === 'scene' && stimulus.scene === 'map') {
    lintMap(challenge, stimulus.of, report);
  } else {
    report('explorer-harbor-question', 'Explorer Harbor has no rule for this kind of question');
  }
};
