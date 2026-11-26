// Explorer Harbor's content pack, written from tables.
//
//   put the story in order      three pictures of something that happens, to be put first, next, last
//   how does it end?            the beginning and the middle, and three endings to choose from
//   what made it happen?        a thing before and after, and three things that might have done it
//   what happens next?          a thing and what is about to happen to it, and three ways it might turn out
//   which is on the water?      a map of sea and islands with flags on it; one flag stands on water
//   which is on the land?       the same, the other way about
//   which is nearest?           a boat and three islands; one is plainly the nearest
//   which is farthest?          the same, the other way about
//   the seven big lands         the shape of a continent, and its name; the land to find on a globe
//   which land is it?           the name alone
//   famous places               a famous place, the continent it is in, and that land to find
//
// The stories and the changes are in src/content/explorer-harbor/storybook.json, with what each picture
// shows; the drawings are beside it. The maps are made here, by trying places until a map is found that can be
// read plainly: a flag well inside a shore or well clear of every shore, an island nearer or farther by a good
// deal. The world's rules (src/content/rules/explorerHarbor.ts) work every map out again from its numbers.
//
// The globe is the real one: its lands are src/content/explorer-harbor/atlas.json (made from Natural Earth by
// scripts/atlas/make_atlas.mjs) and its famous places are src/content/explorer-harbor/places.json, each with
// the article its place was checked against. A question about the globe is made by trying sets of lands until
// one is found that a single view shows well: every pin plainly facing, and far enough from the others for a
// small finger on the smallest screen. The world's rules work each one out again.
//
// A story to make up is not in the pack at all: it is no lesson, and nothing in it is right or wrong. What it is
// made of is src/content/explorer-harbor/storymaker.json; the lines it is told with are written from that file
// here, for the voice, beside the lines of the stories that are put in order.
//
// Nothing here scores a story a child makes up. Nothing here is about people, and no border is drawn.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { rng, root } from './lib.mjs';

const storybook = JSON.parse(
  readFileSync(join(root, 'src/content/explorer-harbor/storybook.json'), 'utf8'),
);
const storymaker = JSON.parse(
  readFileSync(join(root, 'src/content/explorer-harbor/storymaker.json'), 'utf8'),
);
const NAMES = storybook.pictures;
const LETTERS = ['a', 'b', 'c', 'd'];

const picture = (id) => ({ type: 'picture', id });
const capital = (text) => text[0].toUpperCase() + text.slice(1);

function lesson({ id, title, summary, minutes = 3, demo, guided, pool, count, reprobes = 1 }) {
  return {
    id,
    version: 1,
    world: 'explorer-harbor',
    title,
    summary,
    skillIds: [...new Set([...demo, ...guided, ...pool].map((challenge) => challenge.skillId))],
    estimatedMinutes: minutes,
    plan: {
      demo: demo.map((challenge) => challenge.id),
      guided: guided.map((challenge) => challenge.id),
      independent: {
        pool: pool.map((challenge) => challenge.id),
        count,
        maxReprobes: Math.min(reprobes, pool.length - count),
      },
    },
    successCriteria: { independentFirstTryCorrect: count - 1 },
    challenges: [...demo, ...guided, ...pool],
  };
}

/** Pictures to choose between, in an order a seed decides, with the one that is right marked. */
function pictureChoices(right, wrong, seed) {
  const offered = rng(seed).shuffle([right, ...wrong]);
  const choices = offered.map((id, index) => ({
    id: LETTERS[index],
    label: capital(NAMES[id]),
    stimulus: picture(id),
  }));
  return { choices, answer: LETTERS[offered.indexOf(right)] };
}

// ---------------------------------------------------------------------------------------------------------------------
// Put the story in order
// ---------------------------------------------------------------------------------------------------------------------

/** What kind of story each is, so that practice ranges over more than one kind. */
const STORY_KINDS = {
  seed: 'something-grows',
  egg: 'something-grows',
  fly: 'something-grows',
  snow: 'made-and-gone',
  balloon: 'made-and-gone',
  tower: 'made-and-gone',
  castle: 'made-and-gone',
  rain: 'weather',
};

function storyLesson() {
  const id = 'eh-story-01';
  const skillId = 'story.sequence.order-three';
  const row = (name) => {
    const story = storybook.stories[name];
    return {
      id: `${id}.${name}`,
      kind: 'make',
      skillId,
      variant: STORY_KINDS[name],
      prompt: { instruction: 'eh.story.instruction' },
      task: {
        type: 'order',
        // A picture's label is the line it is told with, so that a story can be put in order by ear.
        cards: story.panels.map((panel, index) => ({
          id: panel,
          label: story.told[index],
          stimulus: picture(panel),
        })),
        solution: story.panels,
      },
      hints: [
        { type: 'model', caption: 'eh.story.hint.model' },
        { type: 'step', count: 1, caption: 'eh.story.hint.step' },
        { type: 'reveal', caption: 'eh.story.hint.reveal' },
      ],
      feedback: { correct: 'eh.story.correct', incorrect: 'eh.story.incorrect' },
    };
  };
  return lesson({
    id,
    title: 'Put the story in order',
    summary:
      'Three pictures show something happening: a seed that grows, a snowman that melts. They are out of order. Your child puts them first, next and last, and then the story is told back, picture by picture.',
    demo: ['seed'].map(row),
    guided: ['egg', 'tower'].map(row),
    pool: ['snow', 'balloon', 'castle', 'rain', 'fly'].map(row),
    count: 3,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// How does it end?
// ---------------------------------------------------------------------------------------------------------------------

function endingLesson() {
  const id = 'eh-ending-01';
  const skillId = 'story.sequence.choose-ending';
  const row = ([name, ...wrong], index) => {
    const story = storybook.stories[name];
    const { choices, answer } = pictureChoices(story.panels[2], wrong, 4100 + index);
    const distractors = choices.filter((choice) => choice.id !== answer);
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId,
      variant: STORY_KINDS[name],
      prompt: {
        instruction: 'eh.ending.instruction',
        stimulus: {
          type: 'scene',
          scene: 'strip',
          of: { kind: 'story', parts: story.panels, gap: 2 },
        },
      },
      choices,
      answer,
      hints: [
        { type: 'model', caption: 'eh.ending.hint.model' },
        { type: 'eliminate', remove: [distractors.at(-1).id], caption: 'eh.hint.not-this' },
        { type: 'reveal', caption: 'eh.ending.hint.reveal' },
      ],
      misconceptions: Object.fromEntries(
        distractors.map((choice) => [choice.id, 'ending-of-another-story']),
      ),
      feedback: { correct: 'eh.ending.correct', incorrect: 'eh.ending.incorrect' },
    };
  };
  return lesson({
    id,
    title: 'How does it end?',
    summary:
      'The beginning and the middle of a story are shown and told. Three pictures are offered for the ending: the right one, and the endings of two other stories.',
    demo: [['egg', 'fly3', 'seed3']].map(row),
    guided: [
      ['seed', 'egg3', 'tower3'],
      ['castle', 'tower3', 'seed3'],
    ].map((each, index) => row(each, index + 1)),
    pool: [
      ['fly', 'egg3', 'seed3'],
      ['snow', 'tower3', 'balloon3'],
      ['tower', 'castle3', 'snow3'],
      ['balloon', 'egg3', 'tower3'],
      ['rain', 'balloon3', 'fly3'],
    ].map((each, index) => row(each, index + 3)),
    count: 3,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// What made it happen?  ·  What happens next?
// ---------------------------------------------------------------------------------------------------------------------

/** What kind of change each is. */
const CHANGE_KINDS = {
  snow: 'weather',
  rain: 'weather',
  kite: 'weather',
  castle: 'weather',
  balloon: 'something-touches-it',
  tower: 'something-touches-it',
  cheese: 'someone-does-it',
  seed: 'someone-does-it',
};

function whyLesson() {
  const id = 'eh-why-01';
  const skillId = 'story.cause.find-cause';
  const row = ([name, ...wrong], index) => {
    const change = storybook.changes[name];
    const { choices, answer } = pictureChoices(change.cause, wrong, 4200 + index);
    const distractors = choices.filter((choice) => choice.id !== answer);
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId,
      variant: CHANGE_KINDS[name],
      prompt: {
        instruction: `eh.why.${name}`,
        stimulus: {
          type: 'scene',
          scene: 'strip',
          of: { kind: 'change', parts: [change.before, change.cause, change.after], gap: 1 },
        },
      },
      choices,
      answer,
      hints: [
        { type: 'model', caption: 'eh.why.hint.model' },
        { type: 'eliminate', remove: [distractors.at(-1).id], caption: 'eh.hint.not-this' },
        { type: 'reveal', caption: 'eh.why.hint.reveal' },
      ],
      misconceptions: Object.fromEntries(distractors.map((choice) => [choice.id, 'not-the-cause'])),
      feedback: { correct: `eh.why.${name}.correct`, incorrect: 'eh.why.incorrect' },
    };
  };
  return lesson({
    id,
    title: 'What made it happen?',
    summary:
      'A thing is shown before and after something happened to it: a balloon, and then a burst balloon. Your child picks what did it from three things. The other two could not have.',
    demo: [['balloon', 'wateringcan', 'rain']].map(row),
    guided: [
      ['rain', 'sun', 'ball'],
      ['tower', 'sun', 'pin'],
    ].map((each, index) => row(each, index + 1)),
    pool: [
      ['snow', 'pin', 'mouse'],
      ['seed', 'ball', 'wind'],
      ['castle', 'sun', 'mouse'],
      ['cheese', 'wave', 'wateringcan'],
      ['kite', 'rain', 'wave'],
    ].map((each, index) => row(each, index + 3)),
    count: 3,
  });
}

function nextLesson() {
  const id = 'eh-next-01';
  const skillId = 'story.cause.predict';
  const row = ([name, ...wrong], index) => {
    const change = storybook.changes[name];
    const { choices, answer } = pictureChoices(change.after, wrong, 4300 + index);
    const distractors = choices.filter((choice) => choice.id !== answer);
    // A wrong picture of the same thing is how it was earlier on; any other is what became of something else.
    const stem = (pictureId) => pictureId.replace(/[0-9]+$/, '');
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId,
      variant: CHANGE_KINDS[name],
      prompt: {
        instruction: `eh.next.${name}`,
        stimulus: {
          type: 'scene',
          scene: 'strip',
          of: { kind: 'change', parts: [change.before, change.cause, change.after], gap: 2 },
        },
      },
      choices,
      answer,
      hints: [
        { type: 'model', caption: 'eh.next.hint.model' },
        { type: 'eliminate', remove: [distractors.at(-1).id], caption: 'eh.hint.not-this' },
        { type: 'reveal', caption: 'eh.next.hint.reveal' },
      ],
      misconceptions: Object.fromEntries(
        distractors.map((choice) => [
          choice.id,
          stem(choice.stimulus.id) === stem(change.after)
            ? 'how-it-was-before'
            : 'what-became-of-something-else',
        ]),
      ),
      feedback: { correct: `eh.next.${name}.correct`, incorrect: 'eh.next.incorrect' },
    };
  };
  return lesson({
    id,
    title: 'What happens next?',
    summary:
      'A thing is shown with what is about to happen to it: a tower, and a ball rolling at it. Your child picks how it will turn out from three pictures.',
    demo: [['tower', 'tower1', 'castle3']].map(row),
    guided: [
      ['balloon', 'kite2', 'cheese2'],
      ['cheese', 'balloon3', 'castle3'],
    ].map((each, index) => row(each, index + 1)),
    pool: [
      ['snow', 'snow1', 'tower3'],
      ['seed', 'balloon3', 'kite2'],
      ['castle', 'castle1', 'seed2'],
      ['rain', 'kite2', 'tower3'],
      ['kite', 'cheese2', 'tower3'],
    ].map((each, index) => row(each, index + 3)),
    count: 3,
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Maps
// ---------------------------------------------------------------------------------------------------------------------

// The same numbers as src/content/explorer-harbor/maps.ts, which the rules use to check these maps.
const MAP = { width: 100, height: 64 };
const WELL_ASHORE = 0.62;
const WELL_OUT = 1.5;
const PLAINLY_NEARER = 0.62;
const PLAINLY_FARTHER = 1.4;
const APART = 33;
const FROM_EDGE = { x: 9, y: 11 };

const reach = (island, point) =>
  Math.hypot((point.x - island.x) / island.rx, (point.y - island.y) / island.ry);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const onTheMap = (point) =>
  point.x >= FROM_EDGE.x &&
  point.x <= MAP.width - FROM_EDGE.x &&
  point.y >= FROM_EDGE.y &&
  point.y <= MAP.height - FROM_EDGE.y;
const between = (random, low, high) => low + random.int(high - low + 1);

function standing(islands, point) {
  const nearest = Math.min(...islands.map((island) => reach(island, point)));
  if (nearest <= WELL_ASHORE) return 'land';
  return nearest >= WELL_OUT ? 'water' : 'unclear';
}

/** How far a point is from the straight way between two others. */
function fromTheWay(point, a, b) {
  const length = distance(a, b);
  const along = Math.max(
    0,
    Math.min(1, ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / length ** 2),
  );
  return distance(point, { x: a.x + (b.x - a.x) * along, y: a.y + (b.y - a.y) * along });
}

function giveUp(what) {
  throw new Error(`No map could be made for ${what}; loosen what it asks for.`);
}

/**
 * A map of sea and islands with flags on it. One flag stands on what is asked for (water, or land); the others
 * stand on the other. Islands do not touch, flags are far enough apart to press, and no two are above one
 * another, so that "the one on the left" names one flag.
 */
function flagsMap(seed, ask, flags, howManyIslands) {
  const random = rng(seed);
  for (let attempt = 0; attempt < 20000; attempt++) {
    const islands = [];
    for (let tries = 0; islands.length < howManyIslands && tries < 60; tries++) {
      const rx = between(random, 13, 21);
      const ry = between(random, 10, 14);
      const island = {
        x: between(random, rx + 3, MAP.width - rx - 3),
        y: between(random, ry + 3, MAP.height - ry - 3),
        rx,
        ry,
      };
      const clear = islands.every(
        (other) =>
          Math.abs(other.x - island.x) >= other.rx + rx + 7 ||
          Math.abs(other.y - island.y) >= other.ry + ry + 7,
      );
      if (clear) islands.push(island);
    }
    if (islands.length < howManyIslands) continue;

    const ashore = () => {
      const island = random.pick(islands);
      const turn = random.next() * Math.PI * 2;
      const out = random.next() * 0.5;
      return {
        x: Math.round(island.x + Math.cos(turn) * island.rx * out),
        y: Math.round(island.y + Math.sin(turn) * island.ry * out),
      };
    };
    const atSea = () => ({
      x: between(random, FROM_EDGE.x, MAP.width - FROM_EDGE.x),
      y: between(random, FROM_EDGE.y, MAP.height - FROM_EDGE.y),
    });
    const wanted = Array.from({ length: flags }, (_, index) =>
      (index === 0) === (ask === 'land') ? 'land' : 'water',
    );
    const spots = [];
    for (const kind of wanted) {
      for (let tries = 0; tries < 80; tries++) {
        const spot = kind === 'land' ? ashore() : atSea();
        if (
          onTheMap(spot) &&
          standing(islands, spot) === kind &&
          spots.every((other) => distance(other, spot) >= APART && Math.abs(other.x - spot.x) >= 12)
        ) {
          spots.push(spot);
          break;
        }
      }
    }
    if (spots.length < flags) continue;
    // Flags on land stand on different islands where there are islands enough, so that land is not one place.
    return {
      islands: islands.flatMap((island) => [island.x, island.y, island.rx, island.ry]),
      // The first is the answer; they are offered from left to right.
      spots,
    };
  }
  return giveUp(`${ask} (seed ${seed})`);
}

const SIDES = { 2: ['left', 'right'], 3: ['left', 'middle', 'right'] };

function flagsLesson(ask) {
  const id = `eh-${ask}-01`;
  const skillId = `world.map.${ask}`;
  const other = ask === 'water' ? 'land' : 'water';
  const row = ([name, flags, islands, seed], index) => {
    const map = flagsMap(seed, ask, flags, islands);
    const fromLeft = [...map.spots].sort((a, b) => a.x - b.x);
    const choices = fromLeft.map((spot, place) => ({
      id: LETTERS[place],
      label: `The flag on the ${SIDES[flags][place]}`.replace('on the middle', 'in the middle'),
      stimulus: { type: 'scene', scene: 'spot', of: { x: spot.x, y: spot.y, mark: 'flag' } },
    }));
    const answer = LETTERS[fromLeft.indexOf(map.spots[0])];
    const distractors = choices.filter((choice) => choice.id !== answer);
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId,
      variant: `${flags === 2 ? 'two' : 'three'}-flags-${islands === 1 ? 'one-island' : islands === 2 ? 'two-islands' : 'three-islands'}`,
      prompt: {
        instruction: index === 0 ? `eh.${ask}.demo` : `eh.${ask}.instruction`,
        stimulus: { type: 'scene', scene: 'map', of: { ask, islands: map.islands } },
      },
      choices,
      answer,
      hints: [
        { type: 'model', caption: `eh.${ask}.hint.model` },
        ...(distractors.length > 1
          ? [{ type: 'eliminate', remove: [distractors.at(-1).id], caption: 'eh.hint.not-this' }]
          : []),
        { type: 'reveal', caption: 'eh.map.hint.reveal' },
      ],
      misconceptions: Object.fromEntries(distractors.map((choice) => [choice.id, `on-${other}`])),
      feedback: { correct: `eh.${ask}.correct`, incorrect: `eh.${ask}.incorrect` },
    };
  };
  const base = ask === 'water' ? 5100 : 5200;
  // Water is asked about among islands; land, where there is more sea than land.
  const few = ask === 'water' ? 2 : 1;
  const many = ask === 'water' ? 3 : 2;
  const rows = [
    ['demo', 2, few],
    ['guided-two', 2, few],
    ['guided-three', 3, many],
    ['a', 3, few],
    ['b', 3, many],
    ['c', 3, many],
    ['d', 3, few],
    ['e', 3, many],
    ['f', 3, many],
  ].map(([name, flags, islands], index) => row([name, flags, islands, base + index], index));
  return lesson({
    id,
    title: ask === 'water' ? 'Which flag is on the water?' : 'Which flag is on the land?',
    summary:
      ask === 'water'
        ? 'A map shows blue sea and green islands, with two or three flags. Your child taps the flag that stands on the water. Every flag is well clear of a shore, so there is never a doubt about which it is.'
        : 'The same kind of map, asked the other way about: your child taps the flag that stands on land.',
    demo: rows.slice(0, 1),
    guided: rows.slice(1, 3),
    pool: rows.slice(3),
    count: 4,
  });
}

const LANDMARKS = {
  palm: 'the palm tree',
  hut: 'the hut',
  light: 'the lighthouse',
};

/**
 * A boat and three small islands. One island is plainly the nearest to the boat, or plainly the farthest from
 * it. The straight way from the boat to each island passes clear of the others.
 */
function boatMap(seed, ask) {
  const random = rng(seed);
  const anywhere = () => ({
    x: between(random, FROM_EDGE.x, MAP.width - FROM_EDGE.x),
    y: between(random, FROM_EDGE.y, MAP.height - FROM_EDGE.y),
  });
  for (let attempt = 0; attempt < 40000; attempt++) {
    const boat = anywhere();
    const spots = [];
    for (let tries = 0; spots.length < 3 && tries < 60; tries++) {
      const spot = anywhere();
      // Far enough from the boat that sailing there can be seen to be a journey.
      if (distance(spot, boat) >= 22 && spots.every((other) => distance(other, spot) >= APART)) {
        spots.push(spot);
      }
    }
    if (spots.length < 3) continue;
    const ranked = [...spots].sort((a, b) => distance(boat, a) - distance(boat, b));
    const plain =
      ask === 'near'
        ? distance(boat, ranked[0]) <= distance(boat, ranked[1]) * PLAINLY_NEARER
        : distance(boat, ranked[2]) >= distance(boat, ranked[1]) * PLAINLY_FARTHER;
    if (!plain) continue;
    const clearWays = spots.every((spot) =>
      spots.every((other) => other === spot || fromTheWay(other, boat, spot) >= 9),
    );
    if (!clearWays) continue;
    const marks = random.shuffle(Object.keys(LANDMARKS));
    return {
      boat,
      spots: spots.map((spot, index) => ({ ...spot, mark: marks[index] })),
      answer: spots.indexOf(ask === 'near' ? ranked[0] : ranked[2]),
      // The one a child who has it the wrong way about would choose.
      opposite: spots.indexOf(ask === 'near' ? ranked[2] : ranked[0]),
    };
  }
  return giveUp(`${ask} (seed ${seed})`);
}

function boatLesson(ask) {
  const id = `eh-${ask}-01`;
  const skillId = ask === 'near' ? 'world.space.nearest' : 'world.space.farthest';
  const row = ([name, seed], index) => {
    const map = boatMap(seed, ask);
    const choices = map.spots.map((spot, place) => ({
      id: LETTERS[place],
      label: `The island with ${LANDMARKS[spot.mark]}`,
      stimulus: { type: 'scene', scene: 'spot', of: { x: spot.x, y: spot.y, mark: spot.mark } },
    }));
    const answer = LETTERS[map.answer];
    const opposite = LETTERS[map.opposite];
    const middling = choices.find((choice) => choice.id !== answer && choice.id !== opposite);
    return {
      id: `${id}.${name}`,
      kind: 'choose-one',
      skillId,
      // Which way the answer lies from the boat: so that practice is not all "the one on the left".
      variant: map.spots[map.answer].x < map.boat.x ? 'to-the-left' : 'to-the-right',
      prompt: {
        instruction: index === 0 ? `eh.${ask}.demo` : `eh.${ask}.instruction`,
        stimulus: { type: 'scene', scene: 'map', of: { ask, boat: [map.boat.x, map.boat.y] } },
      },
      choices,
      answer,
      hints: [
        { type: 'model', caption: `eh.${ask}.hint.model` },
        { type: 'eliminate', remove: [opposite], caption: 'eh.hint.not-this' },
        { type: 'reveal', caption: 'eh.map.hint.reveal' },
      ],
      misconceptions: {
        [opposite]: ask === 'near' ? 'the-farthest' : 'the-nearest',
        [middling.id]: 'in-between',
      },
      feedback: { correct: `eh.${ask}.correct`, incorrect: `eh.${ask}.incorrect` },
    };
  };
  const base = ask === 'near' ? 5300 : 5400;
  const rows = ['demo', 'guided-a', 'guided-b', 'a', 'b', 'c', 'd', 'e', 'f'].map((name, index) =>
    row([name, base + index], index),
  );
  return lesson({
    id,
    title: ask === 'near' ? 'Which island is nearest?' : 'Which island is farthest?',
    summary:
      ask === 'near'
        ? 'A boat is on the sea with three small islands round it. Your child taps the island that is nearest to the boat, and the boat sails there. One island is always nearer by a good deal.'
        : 'The same boat and three islands, asked the other way about: your child taps the island that is farthest away.',
    demo: rows.slice(0, 1),
    guided: rows.slice(1, 3),
    pool: rows.slice(3),
    count: 4,
  });
}

// ---------------------------------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------------------------------
// The globe: the seven big lands, and fifteen famous places
// ---------------------------------------------------------------------------------------------------------------------

const places = JSON.parse(
  readFileSync(join(root, 'src/content/explorer-harbor/places.json'), 'utf8'),
);
const atlas = JSON.parse(
  readFileSync(join(root, 'src/content/explorer-harbor/atlas.json'), 'utf8'),
);
const CONTINENTS = Object.keys(places.continents);

const RAD = Math.PI / 180;
/** How far a globe may be tipped towards a pole. The same number as in src/content/explorer-harbor/globe.ts. */
const TIP_MOST = 40;
/** How squarely every pin must face: 1 is the middle of the disc, 0 its edge. */
const FACING_LEAST = 0.5;
/**
 * How far apart two pins must be, in globe radii: on the smallest globe there is, 56 pixels, which is what a
 * small finger needs. (At 0.9 the lands that are neighbours could be asked together, and pins were 46 pixels
 * apart there. A land is still told from two others by its shape; which two they are is less various.)
 */
const PINS_APART = 1.1;
/**
 * How squarely the land that is asked for must face, at its middle: most of it has to be there to be known by.
 * (Antarctica is let off: it is only ever the white land at the foot of the globe.)
 */
const WANTED_FACING = 0.6;

/** Where a place is on the disc when `view` is in the middle of it (see globe.ts, which the rules use). */
function onDisc([viewLon, viewLat], [lon, lat]) {
  const across = (lon - viewLon) * RAD;
  const up = lat * RAD;
  const tip = viewLat * RAD;
  const x = Math.cos(up) * Math.sin(across);
  const y = Math.sin(up);
  const z = Math.cos(up) * Math.cos(across);
  return {
    x,
    y: -(y * Math.cos(tip) - z * Math.sin(tip)),
    facing: y * Math.sin(tip) + z * Math.cos(tip),
  };
}

/** The view that looks most squarely at several places at once, to a tenth of a degree. */
function viewOf(pins) {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const [lon, lat] of pins) {
    x += Math.cos(lat * RAD) * Math.sin(lon * RAD);
    y += Math.sin(lat * RAD);
    z += Math.cos(lat * RAD) * Math.cos(lon * RAD);
  }
  const length = Math.hypot(x, y, z);
  const lat = Math.max(-TIP_MOST, Math.min(TIP_MOST, Math.asin(y / length) / RAD));
  return [Number((Math.atan2(x, z) / RAD).toFixed(1)), Number(lat.toFixed(1))];
}

function insideRing([lon, lat], ring) {
  let within = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[j];
    if (ay > lat !== by > lat && lon < ((bx - ax) * (lat - ay)) / (by - ay) + ax) within = !within;
  }
  return within;
}

/**
 * Where a pin may stand for each land: places well inside it, far from each other. A land is asked about with
 * whichever of its pins leaves most room between it and the others on the disc.
 */
const PINS = {
  africa: [
    [20, 5],
    [25, -15],
    [5, 20],
    [35, 0],
  ],
  antarctica: [
    [60, -80],
    [-60, -80],
    [120, -75],
    [0, -78],
    [-120, -80],
  ],
  asia: [
    [95, 45],
    [78, 22],
    [110, 62],
    [48, 25],
    [135, 60],
    [105, 30],
  ],
  europe: [
    [15, 50],
    [15, 62],
    [-3, 40],
    [40, 55],
  ],
  'north-america': [
    [-100, 45],
    [-110, 60],
    [-100, 25],
    [-42, 72],
    [-80, 40],
  ],
  oceania: [
    [135, -25],
    [145, -22],
    [120, -28],
    [144.2, -5.9],
  ],
  'south-america': [
    [-58, -12],
    [-65, -33],
    [-70, 3],
    [-45, -10],
  ],
};
for (const [continent, pins] of Object.entries(PINS)) {
  for (const pin of pins) {
    if (!atlas.continents[continent].some((ring) => insideRing(pin, ring))) {
      throw new Error(`A pin for ${continent} is not on it: ${pin.join(', ')}`);
    }
  }
}

/** How a set of pins sits in the view that looks at them: the least any faces, the least any two are apart. */
function sitting(pins) {
  const view = viewOf(pins);
  const at = pins.map((pin) => onDisc(view, pin));
  let apart = Infinity;
  for (let i = 0; i < at.length; i++) {
    for (let j = 0; j < i; j++) {
      apart = Math.min(apart, Math.hypot(at[i].x - at[j].x, at[i].y - at[j].y));
    }
  }
  return { view, at, facing: Math.min(...at.map((each) => each.facing)), apart };
}

/** Every way of choosing one pin for each of some lands. */
function pinnings(lands) {
  return lands.reduce(
    (sets, land) => sets.flatMap((set) => PINS[land].map((pin) => [...set, pin])),
    [[]],
  );
}

/**
 * The best view of a set of lands, the first of which is the one asked for, if any view shows them well: the
 * pins that leave most room between them. The land asked for is pinned at its middle, and its middle faces.
 */
function bestSitting(lands) {
  const [want] = lands;
  const middle = places.continents[want].at;
  let best = null;
  for (const pins of pinnings(lands)) {
    if (want !== 'antarctica' && (pins[0][0] !== middle[0] || pins[0][1] !== middle[1])) continue;
    const sat = sitting(pins);
    if (sat.facing < FACING_LEAST || sat.apart < PINS_APART) continue;
    if (want !== 'antarctica' && sat.at[0].facing < WANTED_FACING) continue;
    if (best === null || sat.apart > best.apart) best = { ...sat, pins };
  }
  return best;
}

/** The sets of lands each land can be asked about among: three where three can be shown well, else two. */
const COMPANY = Object.fromEntries(
  CONTINENTS.map((want) => {
    const others = CONTINENTS.filter((each) => each !== want);
    const threes = [];
    const twos = [];
    for (let i = 0; i < others.length; i++) {
      const two = bestSitting([want, others[i]]);
      if (two) twos.push({ lands: [want, others[i]], ...two });
      for (let j = i + 1; j < others.length; j++) {
        const three = bestSitting([want, others[i], others[j]]);
        if (three) threes.push({ lands: [want, others[i], others[j]], ...three });
      }
    }
    if (threes.length === 0 && twos.length === 0) throw new Error(`No view shows ${want} well.`);
    return [want, threes.length > 0 ? threes : twos];
  }),
);

/** Where on the disc a pin is, in words: what its button is called, which must not be the land's name. */
function whereOnDisc({ x, y }) {
  const across = x < -0.2 ? 'on the left' : x > 0.2 ? 'on the right' : 'in the middle';
  const up = y < -0.2 ? 'at the top' : y > 0.2 ? 'at the bottom' : '';
  return up === '' ? `The land ${across}` : `The land ${up}, ${across}`;
}

/** A question about one land: the view, the lands to choose between and their pins, and which is right. */
function globeQuestion(want, seed) {
  const company = COMPANY[want];
  const { lands, pins, view, at } = company[seed % company.length];
  const order = rng(seed).shuffle(lands.map((_, index) => index));
  const choices = order.map((index, place) => ({
    id: LETTERS[place],
    label: whereOnDisc(at[index]),
    stimulus: { type: 'scene', scene: 'land', of: { continent: lands[index], at: pins[index] } },
  }));
  if (new Set(choices.map((choice) => choice.label)).size !== choices.length) {
    throw new Error(`Two lands would be called the same on the globe for ${want}, seed ${seed}.`);
  }
  return { view, choices, answer: LETTERS[order.indexOf(0)] };
}

function globeChallenge({
  id,
  ask,
  want,
  seed,
  skillId,
  instruction,
  correct,
  incorrect,
  hint,
  landmark,
}) {
  const { view, choices, answer } = globeQuestion(want, seed);
  const distractors = choices.filter((choice) => choice.id !== answer);
  return {
    id,
    kind: 'choose-one',
    skillId,
    // Practice ranges over the lands: which land is asked for is the kind of question it is.
    variant: want,
    prompt: {
      instruction,
      stimulus: {
        type: 'scene',
        scene: 'globe',
        // A famous place is carried with where it is, so that it can be put there.
        of: {
          ask,
          want,
          view,
          ...(landmark ? { landmark, at: places.landmarks[landmark].at } : {}),
        },
      },
    },
    choices,
    answer,
    hints: [
      { type: 'model', caption: hint },
      ...(distractors.length > 1
        ? [{ type: 'eliminate', remove: [distractors.at(-1).id], caption: 'eh.hint.not-this' }]
        : []),
      { type: 'reveal', caption: 'eh.globe.hint.reveal' },
    ],
    misconceptions: Object.fromEntries(
      distractors.map((choice) => [choice.id, `took-${choice.stimulus.of.continent}`]),
    ),
    feedback: { correct, incorrect },
  };
}

/** The seven, in the order they are met: the plainest shapes first. */
const LANDS_ORDER = [
  'africa',
  'south-america',
  'oceania',
  'north-america',
  'antarctica',
  'europe',
  'asia',
];

function landsLesson(ask) {
  const id = ask === 'shape' ? 'eh-lands-01' : 'eh-lands-02';
  const skillId = ask === 'shape' ? 'world.globe.match-shape' : 'world.globe.find-named';
  const row = (want, index, name) =>
    globeChallenge({
      id: `${id}.${name}`,
      ask,
      want,
      seed: (ask === 'shape' ? 6100 : 6200) + index,
      skillId,
      instruction: `eh.globe.${ask}.${want}`,
      correct: `eh.globe.yes.${want}`,
      incorrect: `eh.globe.no.${ask}`,
      hint: `eh.globe.hint.${ask}`,
    });
  // Shown and tried with help on lands that are asked for again alone, in other company.
  const demo = [row('africa', 20, 'demo')];
  const guided = [row('south-america', 21, 'guided-a'), row('oceania', 22, 'guided-b')];
  const pool = LANDS_ORDER.map((want, index) => row(want, index, want));
  return {
    ...lesson({
      id,
      title: ask === 'shape' ? 'The seven big lands' : 'Which land is it?',
      summary:
        ask === 'shape'
          ? 'A globe of the real world, with no words on it and no borders. Your child is shown the shape of one of the seven continents and told its name, and finds that land on the globe by tapping the pin on it. The globe can be turned with a finger.'
          : 'The same globe, and only the name: "Which land is Africa?" Nothing is shown to match, so this one needs sound. Asked for help, your child is shown the shape.',
      demo,
      guided,
      pool,
      count: 4,
    }),
    ...(ask === 'name' ? { needsSound: true } : {}),
  };
}

/** Three famous places are shown and tried with help; the other twelve are asked alone. */
const PLACES_FIRST = ['pyramids', 'eiffel-tower', 'great-wall'];

function placesLesson() {
  const id = 'eh-places-01';
  const row = (landmark, index) =>
    globeChallenge({
      id: `${id}.${landmark}`,
      ask: 'place',
      want: places.landmarks[landmark].continent,
      seed: 6300 + index,
      skillId: 'world.place.continent-of',
      instruction: `eh.place.ask.${landmark}`,
      correct: `eh.place.yes.${landmark}`,
      incorrect: 'eh.globe.no.shape',
      hint: 'eh.globe.hint.shape',
      landmark,
    });
  const rest = Object.keys(places.landmarks).filter((each) => !PLACES_FIRST.includes(each));
  const rows = [...PLACES_FIRST, ...rest].map(row);
  return lesson({
    id,
    title: 'Famous places',
    summary:
      'Fifteen famous places, drawn: the pyramids, the Great Wall, Mount Fuji. Your child is shown one, with the shape of the continent it is in, and told both. They find that continent on the globe, and the place is put where it is. It is a first meeting with the places, not a test of where they are.',
    minutes: 4,
    demo: rows.slice(0, 1),
    guided: rows.slice(1, 3),
    pool: rows.slice(3),
    count: 4,
  });
}

function globeStrings() {
  const strings = {
    'eh.globe.no.shape': 'Not that one. Look at its shape again.',
    'eh.globe.no.name': 'Not that one. Listen again.',
    'eh.globe.hint.shape': 'Look at the shape. Which land on the globe is the same shape?',
    'eh.globe.hint.name': 'Here is its shape. Which land is the same shape?',
    'eh.globe.hint.reveal': 'It is this one.',
  };
  for (const [key, { name }] of Object.entries(places.continents)) {
    strings[`eh.globe.shape.${key}`] = `This is the shape of ${name}. Find ${name} on the globe.`;
    strings[`eh.globe.name.${key}`] = `Which land is ${name}?`;
    strings[`eh.globe.yes.${key}`] = `Yes. That is ${name}.`;
  }
  for (const [key, place] of Object.entries(places.landmarks)) {
    const land = places.continents[place.continent].name;
    const is = place.many ? 'are' : 'is';
    const said = capital(place.name);
    strings[`eh.place.ask.${key}`] = `${said} ${is} in ${land}. Find ${land}.`;
    strings[`eh.place.yes.${key}`] = `Yes. ${said} ${is} in ${place.country}.`;
  }
  return strings;
}

const skill = (id, title, objective, prerequisites) => ({
  id,
  world: 'explorer-harbor',
  strand: 'language-and-world',
  title,
  objective,
  prerequisites,
});

const SKILLS = [
  skill(
    'story.sequence.order-three',
    'Put a story in order',
    'Puts three pictures of something that happens into the order it happens in: beginning, middle and end.',
    [],
  ),
  skill(
    'story.sequence.choose-ending',
    'Say how a story ends',
    'Shown the beginning and the middle of a short story, picks the picture it ends with from among the endings of other stories.',
    ['story.sequence.order-three'],
  ),
  skill(
    'story.cause.find-cause',
    'Say what made it happen',
    'Shown a thing before and after something happened to it, picks what did it from three things, two of which could not have.',
    ['story.sequence.order-three'],
  ),
  skill(
    'story.cause.predict',
    'Say what happens next',
    'Shown a thing and what is about to happen to it, picks how it will turn out from three pictures.',
    ['story.cause.find-cause'],
  ),
  skill(
    'world.map.water',
    'Find water on a map',
    'On a simple map of sea and islands, picks the one flag of two or three that stands on water.',
    [],
  ),
  skill(
    'world.map.land',
    'Find land on a map',
    'On a simple map of sea and islands, picks the one flag of two or three that stands on land.',
    ['world.map.water'],
  ),
  skill(
    'world.space.nearest',
    'Find the nearest place',
    'On a map with a boat and three islands, picks the island nearest to the boat.',
    [],
  ),
  skill(
    'world.space.farthest',
    'Find the farthest place',
    'On a map with a boat and three islands, picks the island farthest from the boat.',
    ['world.space.nearest'],
  ),
  skill(
    'world.globe.match-shape',
    'Find a continent by its shape',
    'Shown the shape of one of the seven continents and told its name, finds that land on a globe among two or three.',
    ['world.map.land'],
  ),
  skill(
    'world.globe.find-named',
    'Find a continent by its name',
    'Told the name of a continent, with nothing shown to match, finds that land on a globe among two or three. Needs sound.',
    ['world.globe.match-shape'],
  ),
  skill(
    'world.place.continent-of',
    'Find the continent a famous place is in',
    'Shown a famous place and the shape of the continent it is in, and told both, finds that continent on a globe. It is the continent that is found: nothing here shows that a child knows where the place is.',
    ['world.globe.match-shape'],
  ),
];

function changeStrings() {
  const strings = {};
  for (const [name, change] of Object.entries(storybook.changes)) {
    strings[`eh.why.${name}`] = change.why;
    strings[`eh.why.${name}.correct`] = change.because;
    strings[`eh.next.${name}`] = change.next;
    strings[`eh.next.${name}.correct`] = change.then;
  }
  return strings;
}

const STRINGS = {
  'eh.hint.not-this': 'Not this one.',
  'eh.story.instruction': 'What happened first? Put the story in order.',
  'eh.story.correct': 'Yes. Here is the whole story.',
  'eh.story.incorrect': 'Not quite. Which one comes first?',
  'eh.story.hint.model': 'Look for how it starts. Then look for how it ends.',
  'eh.story.hint.step': 'It starts like this.',
  'eh.story.hint.reveal': 'This is how it goes.',
  'eh.ending.instruction': 'How does the story end?',
  'eh.ending.correct': 'Yes. That is how it ends.',
  'eh.ending.incorrect': 'That is from a different story. Look again.',
  'eh.ending.hint.model': 'Look at the story so far. What is it about?',
  'eh.ending.hint.reveal': 'It ends like this.',
  'eh.why.incorrect': 'That did not do it. Think again.',
  'eh.why.hint.model': 'Look at how it was, and how it is now.',
  'eh.why.hint.reveal': 'This is what did it.',
  'eh.next.incorrect': 'That is not what happens. Think again.',
  'eh.next.hint.model': 'Think about what it does.',
  'eh.next.hint.reveal': 'This is what happens.',
  ...changeStrings(),
  'eh.map.hint.reveal': 'It is this one.',
  'eh.water.demo': 'This is a map. Green is land. Blue is water. Which flag is on the water?',
  'eh.water.instruction': 'Which flag is on the water?',
  'eh.water.correct': 'Yes. That flag is on the water.',
  'eh.water.incorrect': 'That flag is on the land. Look for the blue water.',
  'eh.water.hint.model': 'The water is the blue part.',
  'eh.land.demo': 'This is a map. Blue is water. Green is land. Which flag is on the land?',
  'eh.land.instruction': 'Which flag is on the land?',
  'eh.land.correct': 'Yes. That flag is on the land.',
  'eh.land.incorrect': 'That flag is on the water. Look for the green land.',
  'eh.land.hint.model': 'The land is the green part.',
  'eh.near.demo': 'Here is a boat. Which island is nearest? Nearest means the shortest way to go.',
  'eh.near.instruction': 'Which island is nearest to the boat?',
  'eh.near.correct': 'Yes. That one is nearest. It is a short way to go.',
  'eh.near.incorrect': 'Another one is nearer. Look again.',
  'eh.near.hint.model': 'Look at the lines. The shortest line goes to the nearest.',
  'eh.far.demo':
    'Here is a boat. Which island is farthest away? Farthest means the longest way to go.',
  'eh.far.instruction': 'Which island is farthest from the boat?',
  'eh.far.correct': 'Yes. That one is farthest. It is a long way to go.',
  'eh.far.incorrect': 'Another one is farther away. Look again.',
  'eh.far.hint.model': 'Look at the lines. The longest line goes to the farthest.',
  ...globeStrings(),
};

export function buildExplorerHarborPack() {
  return {
    format: 'training-academy.content-pack',
    schemaVersion: 1,
    id: 'explorer-harbor',
    world: 'explorer-harbor',
    contentVersion: 2,
    strings: { en: STRINGS },
    skills: SKILLS,
    lessons: [
      storyLesson(),
      endingLesson(),
      whyLesson(),
      nextLesson(),
      flagsLesson('water'),
      flagsLesson('land'),
      boatLesson('near'),
      boatLesson('far'),
      landsLesson('shape'),
      landsLesson('name'),
      placesLesson(),
    ],
  };
}

/**
 * Every line there is to say in the room for making a story, by key: the questions, and the lines each page of
 * each story is told with. src/content/explorer-harbor/storymaker.ts makes the same lines from the same file
 * for the game, and a test holds the two to one another.
 */
function storymakerLines() {
  const { characters, settings, seeds, asks } = storymaker;
  const lines = {
    'eh.make.who': asks.who,
    'eh.make.where': asks.where,
    'eh.make.trouble': asks.trouble,
    'eh.make.ending': asks.ending,
    'eh.make.told': asks.told,
    'eh.make.whole': asks.whole,
  };
  for (const [who, { name }] of Object.entries(characters)) {
    lines[`eh.make.want.${who}`] = asks.want.replace('{name}', name);
    lines[`eh.make.happy.${who}`] = asks.happy.replace('{name}', name);
    for (const [where, setting] of Object.entries(settings)) {
      lines[`eh.make.went.${who}.${where}`] = `One day, ${name} ${setting.went}.`;
    }
    for (const [seed, { want }] of Object.entries(seeds)) {
      lines[`eh.make.wanted.${who}.${seed}`] = `${name} ${want}.`;
    }
  }
  for (const [seed, { troubles }] of Object.entries(seeds)) {
    for (const [trouble, { but, endings }] of Object.entries(troubles)) {
      lines[`eh.make.but.${seed}.${trouble}`] = but;
      for (const [ending, { so }] of Object.entries(endings)) {
        lines[`eh.make.so.${seed}.${trouble}.${ending}`] = so;
      }
    }
  }
  return lines;
}

/**
 * What the voice needs here beside the pack's lines: the line each picture of a story is told with, and
 * everything that is said in the room for making a story.
 */
export function buildExplorerHarborVoice() {
  const lines = {};
  for (const story of Object.values(storybook.stories)) {
    story.panels.forEach((panel, index) => {
      lines[`eh.panel.${panel}`] = story.told[index];
    });
  }
  Object.assign(lines, storymakerLines());
  return {
    about:
      'What the voice says for Explorer Harbor beside the lines of its pack: the line each picture of a story is told with, and everything said in the room for making a story. Written by scripts/content/explorer-harbor.mjs from the storybook and from storymaker.json; do not edit by hand.',
    groups: { 'explorer-harbor': { lines } },
  };
}
