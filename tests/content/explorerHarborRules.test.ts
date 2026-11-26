import { describe, expect, it } from 'vitest';
import {
  APART,
  distance,
  islandsOf,
  plainly,
  pointOf,
  standing,
  type Point,
} from '@/content/explorer-harbor/maps';
import storybook from '@/content/explorer-harbor/storybook.json';
import { lintPack } from '@/content/lint';
import explorerHarbor from '@/content/packs/explorer-harbor.v2.json';
import { parseContentPack, type ChooseOneChallenge, type ContentPack } from '@/engine';
import voiceLines from '@/voice/lines/explorer-harbor.json';
import { breaking, challengeIn, codes, rulesIn, type Loose } from '../helpers/lint';

function pack(): ContentPack {
  const parsed = parseContentPack(explorerHarbor);
  if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
  return parsed.value;
}
const broken = breaking(pack);

const lessonOf = (id: string) => {
  const found = pack().lessons.find((lesson) => lesson.id === id);
  if (!found) throw new Error(`No lesson called ${id}.`);
  return found;
};

/** The maps of a lesson: what each asks, where its places are, and which is marked right. */
function mapsOf(lessonId: string) {
  return lessonOf(lessonId).challenges.map((challenge) => {
    if (challenge.kind !== 'choose-one' || challenge.prompt.stimulus.type !== 'scene') {
      throw new Error(`${challenge.id} is not a map.`);
    }
    const { of } = challenge.prompt.stimulus;
    const spots = challenge.choices.map((choice) => {
      const at =
        choice.stimulus.type === 'scene'
          ? pointOf([choice.stimulus.of.x, choice.stimulus.of.y])
          : null;
      if (!at) throw new Error(`${challenge.id}: a choice is not a place.`);
      return { id: choice.id, at };
    });
    return { challenge, of, spots };
  });
}

describe('Explorer Harbor, as it is shipped', () => {
  it('passes its own rules', () => {
    expect(lintPack(pack())).toEqual([]);
  });

  it('is eleven activities and 103 challenges', () => {
    // Counts the documents quote, pinned here.
    expect(pack().lessons.map((lesson) => lesson.id)).toEqual([
      'eh-story-01',
      'eh-ending-01',
      'eh-why-01',
      'eh-next-01',
      'eh-water-01',
      'eh-land-01',
      'eh-near-01',
      'eh-far-01',
      'eh-lands-01',
      'eh-lands-02',
      'eh-places-01',
    ]);
    expect(pack().lessons.reduce((total, lesson) => total + lesson.challenges.length, 0)).toBe(103);
  });

  it('uses every story of the storybook once to put in order, and once to end', () => {
    const stories = Object.values(storybook.stories).map((story) => story.panels.join());
    for (const id of ['eh-story-01', 'eh-ending-01']) {
      const used = lessonOf(id).challenges.map((challenge) =>
        challenge.kind === 'make' && challenge.task.type === 'order'
          ? challenge.task.solution.join()
          : challenge.kind === 'choose-one' && challenge.prompt.stimulus.type === 'scene'
            ? (challenge.prompt.stimulus.of.parts as string[]).join()
            : '',
      );
      expect([...used].sort(), id).toEqual([...stories].sort());
    }
    expect(stories).toHaveLength(8);
  });

  it('asks about every change of the storybook both ways: what did it, and what comes of it', () => {
    const changes = Object.values(storybook.changes).map((change) =>
      [change.before, change.cause, change.after].join(),
    );
    for (const id of ['eh-why-01', 'eh-next-01']) {
      const used = lessonOf(id).challenges.map((challenge) =>
        challenge.kind === 'choose-one' && challenge.prompt.stimulus.type === 'scene'
          ? (challenge.prompt.stimulus.of.parts as string[]).join()
          : '',
      );
      expect([...used].sort(), id).toEqual([...changes].sort());
    }
    expect(changes).toHaveLength(8);
  });

  it('names each picture of a story by the line the voice tells it with', () => {
    const lines: Record<string, string> = voiceLines.groups['explorer-harbor'].lines;
    for (const challenge of lessonOf('eh-story-01').challenges) {
      if (challenge.kind !== 'make' || challenge.task.type !== 'order') {
        throw new Error('a story is something to put in order');
      }
      for (const card of challenge.task.cards) {
        expect(card.label, card.id).toBe(lines[`eh.panel.${card.id}`]);
      }
    }
    expect(Object.keys(lines)).toHaveLength(24);
  });

  it.each(['water', 'land'] as const)(
    'puts exactly one flag plainly on the %s, and the others plainly not',
    (ask) => {
      const maps = mapsOf(`eh-${ask}-01`);
      expect(maps).toHaveLength(9);
      for (const { challenge, of, spots } of maps) {
        const islands = islandsOf(of.islands);
        const stands = spots.map((spot) => standing(islands, spot.at));
        expect(stands, challenge.id).not.toContain('unclear');
        const right = spots.filter((_, index) => stands[index] === ask);
        expect(
          right.map((spot) => spot.id),
          challenge.id,
        ).toEqual([challenge.answer]);
      }
    },
  );

  it.each(['near', 'far'] as const)('has one island plainly the %sest from the boat', (ask) => {
    const maps = mapsOf(`eh-${ask}-01`);
    expect(maps).toHaveLength(9);
    for (const { challenge, of, spots } of maps) {
      const boat = pointOf(of.boat);
      if (!boat) throw new Error(`${challenge.id} has no boat.`);
      const which = plainly(
        ask,
        boat,
        spots.map((spot) => spot.at),
      );
      expect(which === null ? null : spots[which]?.id, challenge.id).toBe(challenge.answer);
    }
  });

  it('keeps every place on every map far enough from the others to be pressed apart', () => {
    for (const id of ['eh-water-01', 'eh-land-01', 'eh-near-01', 'eh-far-01']) {
      for (const { challenge, spots } of mapsOf(id)) {
        const gaps = spots.flatMap((a, index) =>
          spots.slice(index + 1).map((b: { at: Point }) => distance(a.at, b.at)),
        );
        expect(Math.min(...gaps), challenge.id).toBeGreaterThanOrEqual(APART);
      }
    }
  });

  it('does not always put the answer in the same place', () => {
    for (const id of ['eh-water-01', 'eh-land-01', 'eh-near-01', 'eh-far-01']) {
      const answers = lessonOf(id).challenges.map(
        (challenge) => (challenge as ChooseOneChallenge).answer,
      );
      expect(new Set(answers).size, id).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('every Explorer Harbor rule fires', () => {
  const at = (pack: Loose, id: string) => challengeIn(pack, id);
  const wrongOf = (challenge: Loose): Loose[] =>
    challenge.choices.filter((choice: Loose) => choice.id !== challenge.answer);

  const BREAK: Record<string, (pack: Loose) => void> = {
    'explorer-harbor-task': (pack) => {
      const challenge = at(pack, 'eh-story-01.seed');
      challenge.task = {
        type: 'echo',
        cards: challenge.task.cards,
        solution: challenge.task.solution,
      };
    },
    'story-card': (pack) => {
      at(pack, 'eh-story-01.seed').task.cards[0].stimulus = { type: 'picture', id: 'seed2' };
    },
    'story-picture-unknown': (pack) => {
      const { task } = at(pack, 'eh-story-01.seed');
      task.cards[0].id = 'unicorn';
      task.cards[0].stimulus.id = 'unicorn';
      task.solution[0] = 'unicorn';
    },
    'story-order': (pack) => {
      at(pack, 'eh-story-01.seed').task.solution.reverse();
    },
    'story-told': (pack) => {
      at(pack, 'eh-story-01.seed').task.cards[1].label = 'A shoot.';
    },
    'explorer-harbor-question': (pack) => {
      at(pack, 'eh-ending-01.egg').prompt.stimulus = { type: 'picture', id: 'egg1' };
    },
    'strip-shape': (pack) => {
      // A story asked about by its middle.
      at(pack, 'eh-ending-01.egg').prompt.stimulus.of.gap = 1;
    },
    'strip-choice': (pack) => {
      at(pack, 'eh-ending-01.egg').choices[0].stimulus = { type: 'letter', letters: 's' };
    },
    'strip-choice-twice': (pack) => {
      const [first, second] = wrongOf(at(pack, 'eh-why-01.balloon'));
      second!.stimulus.id = first!.stimulus.id;
    },
    'strip-answer-count': (pack) => {
      wrongOf(at(pack, 'eh-why-01.balloon'))[0]!.stimulus.id = 'pin';
    },
    'strip-answer-wrong': (pack) => {
      const challenge = at(pack, 'eh-why-01.balloon');
      challenge.answer = wrongOf(challenge)[0]!.id;
    },
    'ending-plausible': (pack) => {
      // A puddle could be taken for what is left of a snowman.
      wrongOf(at(pack, 'eh-ending-01.snow'))[0]!.stimulus.id = 'rain3';
    },
    'change-unknown': (pack) => {
      at(pack, 'eh-why-01.balloon').prompt.stimulus.of.parts[1] = 'sun';
    },
    'cause-plausible': (pack) => {
      // Rain would do for a snowman too.
      wrongOf(at(pack, 'eh-why-01.snow'))[0]!.stimulus.id = 'rain';
    },
    'after-plausible': (pack) => {
      // A watered seed does become a flower, in time.
      wrongOf(at(pack, 'eh-next-01.seed'))[0]!.stimulus.id = 'seed3';
    },
    'change-line': (pack) => {
      at(pack, 'eh-why-01.snow').prompt.instruction = 'eh.why.balloon';
    },
    'map-ask': (pack) => {
      at(pack, 'eh-water-01.demo').prompt.stimulus.of.ask = 'sky';
    },
    'map-spot': (pack) => {
      at(pack, 'eh-water-01.demo').choices[0].stimulus = { type: 'picture', id: 'sun' };
    },
    'map-crowded': (pack) => {
      const [first, second] = at(pack, 'eh-near-01.demo').choices;
      second.stimulus.of.x = Number(first.stimulus.of.x) + 5;
      second.stimulus.of.y = first.stimulus.of.y;
    },
    'map-edge': (pack) => {
      at(pack, 'eh-near-01.demo').choices[0].stimulus.of.x = 2;
    },
    'map-island': (pack) => {
      at(pack, 'eh-water-01.demo').prompt.stimulus.of.islands = [];
    },
    'map-unclear': (pack) => {
      // A flag standing on the shore itself.
      const challenge = at(pack, 'eh-water-01.demo');
      const [x, y, rx] = challenge.prompt.stimulus.of.islands as number[];
      Object.assign(challenge.choices[0].stimulus.of, { x: (x ?? 0) + (rx ?? 0), y });
    },
    'map-answer-count': (pack) => {
      // The flag that stood on water is moved to the middle of an island: now none does.
      const challenge = at(pack, 'eh-water-01.a');
      const [x, y] = challenge.prompt.stimulus.of.islands;
      const right = challenge.choices.find((choice: Loose) => choice.id === challenge.answer);
      Object.assign(right.stimulus.of, { x, y });
    },
    'map-answer-wrong': (pack) => {
      const challenge = at(pack, 'eh-near-01.a');
      challenge.answer = wrongOf(challenge)[0]!.id;
    },
    'map-mark': (pack) => {
      // A palm tree where a flag should be would say "this is land".
      at(pack, 'eh-water-01.demo').choices[0].stimulus.of.mark = 'palm';
    },
    'map-boat': (pack) => {
      delete at(pack, 'eh-near-01.demo').prompt.stimulus.of.boat;
    },
    'globe-ask': (pack) => {
      at(pack, 'eh-lands-01.demo').prompt.stimulus.of.ask = 'colour';
    },
    'globe-want': (pack) => {
      at(pack, 'eh-lands-01.demo').prompt.stimulus.of.want = 'atlantis';
    },
    'globe-view': (pack) => {
      // A globe stood on its head.
      at(pack, 'eh-lands-01.demo').prompt.stimulus.of.view = [0, 75];
    },
    'globe-place': (pack) => {
      at(pack, 'eh-places-01.pyramids').prompt.stimulus.of.landmark = 'atlantis';
    },
    'globe-place-land': (pack) => {
      // The pyramids, asked for in Asia.
      at(pack, 'eh-places-01.pyramids').prompt.stimulus.of.want = 'asia';
    },
    'globe-place-where': (pack) => {
      // The pyramids, put in the middle of the Atlantic.
      at(pack, 'eh-places-01.pyramids').prompt.stimulus.of.at = [-30, 30];
    },
    'globe-line': (pack) => {
      at(pack, 'eh-lands-01.africa').prompt.instruction = 'eh.globe.shape.asia';
    },
    'globe-sound': (pack) => {
      // A name with nothing to match it by, in an activity that does not say it needs sound.
      delete pack.lessons.find((lesson: Loose) => lesson.id === 'eh-lands-02').needsSound;
    },
    'globe-land': (pack) => {
      at(pack, 'eh-lands-01.demo').choices[0].stimulus = { type: 'picture', id: 'sun' };
    },
    'globe-count': (pack) => {
      const challenge = at(pack, 'eh-lands-01.demo');
      const offered = challenge.choices.map((choice: Loose) => choice.stimulus.of.continent);
      const another = ['europe', 'north-america', 'oceania', 'south-america'].find(
        (land) => !offered.includes(land),
      );
      challenge.choices.push({
        id: 'd',
        label: 'One more land',
        stimulus: { type: 'scene', scene: 'land', of: { continent: another, at: [0, 0] } },
      });
    },
    'globe-land-twice': (pack) => {
      const [first, second] = wrongOf(at(pack, 'eh-lands-01.demo'));
      second!.stimulus.of.continent = first!.stimulus.of.continent;
    },
    'globe-pin-off': (pack) => {
      // A pin in the sea.
      wrongOf(at(pack, 'eh-lands-01.demo'))[0]!.stimulus.of.at = [-30, 30];
    },
    'globe-pin-edge': (pack) => {
      // The same pins, and the globe turned a third of the way round from them.
      const { of } = at(pack, 'eh-lands-01.demo').prompt.stimulus;
      of.view = [
        Number(of.view[0]) - 120 < -180 ? Number(of.view[0]) + 120 : Number(of.view[0]) - 120,
        of.view[1],
      ];
    },
    'globe-label': (pack) => {
      // A button that says what the land is gives the answer to anyone who is read it.
      at(pack, 'eh-lands-02.africa').choices[0].label = 'Africa';
    },
    'globe-crowded': (pack) => {
      // Europe pinned in Spain and Africa in the Sahara: a finger covers both.
      const challenge = at(pack, 'eh-lands-01.guided-a');
      for (const choice of challenge.choices) {
        if (choice.stimulus.of.continent === 'europe') choice.stimulus.of.at = [-3, 40];
        if (choice.stimulus.of.continent === 'africa') choice.stimulus.of.at = [5, 20];
      }
    },
    'globe-answer-count': (pack) => {
      // The land asked for is not among the pins at all.
      const challenge = at(pack, 'eh-lands-01.demo');
      const right = challenge.choices.find((choice: Loose) => choice.id === challenge.answer);
      right.stimulus.of.continent = 'europe';
    },
    'globe-answer-wrong': (pack) => {
      const challenge = at(pack, 'eh-lands-01.demo');
      challenge.answer = wrongOf(challenge)[0]!.id;
    },
    'globe-wanted-pin': (pack) => {
      // Africa asked for, and pinned at its southern end.
      const challenge = at(pack, 'eh-lands-01.demo');
      const right = challenge.choices.find((choice: Loose) => choice.id === challenge.answer);
      right.stimulus.of.at = [25, -15];
    },
    'globe-wanted-hidden': (pack) => {
      // Africa asked for, with the globe turned until Africa's middle (20 east, 5 north) is a sixth of the way
      // round the world from the middle of the picture: it faces half as squarely as it would there.
      const { of } = at(pack, 'eh-lands-01.demo').prompt.stimulus;
      of.view = [80, 5];
    },
  };

  it.each(Object.keys(BREAK))('%s', (code) => {
    expect(codes(broken(BREAK[code]!))).toContain(code);
  });

  it('has a case here for every rule Explorer Harbor has', async () => {
    const source = (await import('@/content/rules/explorerHarbor.ts?raw')).default;
    expect(rulesIn(source, [])).toEqual(Object.keys(BREAK).sort());
  });

  it('refuses two islands when neither is nearer by a good deal', () => {
    // Moved so that the nearest and the next nearest are the same way off.
    const issues = broken((pack) => {
      const challenge = at(pack, 'eh-near-01.a');
      const [bx = 0, by = 0] = challenge.prompt.stimulus.of.boat as number[];
      const [first, second, third] = challenge.choices;
      Object.assign(first.stimulus.of, { x: bx - 30, y: by });
      Object.assign(second.stimulus.of, { x: bx + 30, y: by });
      Object.assign(third.stimulus.of, { x: bx, y: by > 32 ? by - 34 : by + 34 });
    });
    expect(codes(issues)).toContain('map-unclear');
  });
});
