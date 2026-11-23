import { describe, expect, it } from 'vitest';
import memoryForest from '@/content/packs/memory-forest.v1.json';
import { lintPack } from '@/content/lint';
import { parseContentPack, type ContentPack } from '@/engine';
import { breaking, challengeIn, codes, rulesIn, type Loose } from '../helpers/lint';

function pack(): ContentPack {
  const parsed = parseContentPack(memoryForest);
  if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
  return parsed.value;
}
const broken = breaking(pack);

describe('Memory Forest, as it is shipped', () => {
  it('passes its own rules', () => {
    expect(lintPack(pack())).toEqual([]);
  });

  it('covers everything that is to be remembered: nothing is asked about while it is still on show', () => {
    for (const lesson of pack().lessons) {
      for (const challenge of lesson.challenges) {
        if (challenge.kind !== 'choose-one' || challenge.prompt.stimulus.type !== 'scene') continue;
        expect(challenge.prompt.glance, challenge.id).toBe(true);
        expect(challenge.prompt.ask, challenge.id).toBeDefined();
      }
    }
  });

  it('keeps the kinds of remembering apart: each has a skill of its own', () => {
    const skills = pack().skills.map((skill) => skill.id);
    expect(skills).toEqual([
      'memory.recognition.find-pairs',
      'memory.recognition.what-was-there',
      'memory.recognition.after-a-while',
      'memory.serial.repeat-order',
      'memory.strategy.grouping',
      'memory.strategy.linking',
      'memory.strategy.places',
    ]);
    // A lesson practises one of them, and the one question about the start is counted on its own.
    for (const lesson of pack().lessons) {
      const own = new Set(lesson.challenges.map((challenge) => challenge.skillId));
      expect(own.size, lesson.id).toBe(lesson.id === 'mf-hidden-01' ? 2 : 1);
    }
  });

  it('asks about the very start only at the very end, about something the first step showed', () => {
    const lesson = pack().lessons.find((each) => each.id === 'mf-hidden-01')!;
    expect(lesson.plan.closing).toEqual(['mf-hidden-01.earlier']);
    const first = lesson.challenges.find((each) => each.id === lesson.plan.demo[0])!;
    const last = lesson.challenges.find((each) => each.id === 'mf-hidden-01.earlier')!;
    if (first.kind !== 'choose-one' || last.kind !== 'choose-one') throw new Error('kinds');
    const { stimulus } = first.prompt;
    const shown = stimulus.type === 'scene' ? stimulus.of.ids : [];
    const answer = last.choices.find((choice) => choice.id === last.answer)!;
    if (answer.stimulus.type !== 'picture') throw new Error('the answer is a picture');
    expect(shown).toContain(answer.stimulus.id);
  });

  it('has a lesson for each of three ways to remember', () => {
    const ids = pack().lessons.map((lesson) => lesson.id);
    expect(ids).toEqual(expect.arrayContaining(['mf-groups-01', 'mf-story-01', 'mf-places-01']));
  });
});

describe('every Memory Forest rule fires', () => {
  const at = (pack: Loose, id: string) => challengeIn(pack, id);

  const BREAK: Record<string, (pack: Loose) => void> = {
    'picture-unknown': (pack) => {
      at(pack, 'mf-hidden-01.demo').prompt.stimulus.of.ids = ['cat', 'unicorn'];
    },
    'memory-choice': (pack) => {
      at(pack, 'mf-hidden-01.demo').choices[1].stimulus = { type: 'letter', letters: 's' };
    },
    'memory-choice-twice': (pack) => {
      const { choices } = at(pack, 'mf-hidden-01.fox-bell-apple');
      choices[2].stimulus.id = choices[1].stimulus.id;
    },
    'memory-answer-count': (pack) => {
      // Two of the choices were there.
      at(pack, 'mf-hidden-01.fox-bell-apple').choices[1].stimulus.id = 'apple';
    },
    'memory-answer-wrong': (pack) => {
      const challenge = at(pack, 'mf-hidden-01.fox-bell-apple');
      challenge.answer = challenge.choices.find(
        (choice: Loose) => choice.id !== challenge.answer,
      ).id;
    },
    'memory-earlier': (pack) => {
      delete pack.lessons[1].plan.closing;
      pack.lessons[1].plan.independent.pool.push('mf-hidden-01.earlier');
    },
    'memory-forest-question': (pack) => {
      at(pack, 'mf-hidden-01.demo').prompt.stimulus = { type: 'picture', id: 'cat' };
    },
    'memory-glance': (pack) => {
      delete at(pack, 'mf-hidden-01.demo').prompt.glance;
    },
    'memory-scene': (pack) => {
      at(pack, 'mf-story-01.demo').prompt.stimulus.of.things = ['hat'];
    },
    'memory-cue': (pack) => {
      at(pack, 'mf-story-01.demo').prompt.cue = { type: 'picture', id: 'elephant' };
    },
    'memory-forest-task': (pack) => {
      const challenge = at(pack, 'mf-order-01.demo');
      challenge.task = {
        type: 'order',
        cards: challenge.task.cards,
        solution: ['cat', 'hen', 'fox', 'fish'],
      };
    },
    'memory-card': (pack) => {
      at(pack, 'mf-pairs-01.demo').task.cards[0].id = 'star';
    },
    'memory-study': (pack) => {
      at(pack, 'mf-groups-01.demo').task.study = ['cat', 'hen'];
    },
  };

  it.each(Object.keys(BREAK))('%s', (code) => {
    expect(codes(broken(BREAK[code]!))).toContain(code);
  });

  it('has a case here for every rule Memory Forest has', async () => {
    const source = (await import('@/content/rules/memoryForest.ts?raw')).default;
    expect(rulesIn(source, ['choose-one'])).toEqual(Object.keys(BREAK).sort());
  });
});
