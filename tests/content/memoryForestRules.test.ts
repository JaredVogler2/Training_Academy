import { describe, expect, it } from 'vitest';
import memoryForest from '@/content/packs/memory-forest.v2.json';
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
      'memory.cued.chosen-way',
      'memory.unaided.four-after-choosing',
      'memory.unaided.five-things',
      'memory.delayed.keep-three',
      'memory.delayed.same-day',
      'memory.delayed.another-day',
    ]);
    // A lesson practises one of them, and whatever else it asks is counted on its own: the one question about
    // the start; a question with a hint and the one with none that follows it; taking three things in, and
    // having kept them for ten minutes, or overnight.
    const more: Record<string, number> = { 'mf-hidden-01': 2, 'mf-choose-01': 2, 'mf-later-01': 4 };
    for (const lesson of pack().lessons) {
      const own = new Set(lesson.challenges.map((challenge) => challenge.skillId));
      expect(own.size, lesson.id).toBe(more[lesson.id] ?? 1);
    }
  });

  it('never counts an answer that had a hint as one that had none: they are different challenges', () => {
    const lesson = pack().lessons.find((each) => each.id === 'mf-choose-01')!;
    const then = lesson.plan.then ?? {};
    expect(Object.keys(then)).toHaveLength(6);
    for (const [first, next] of Object.entries(then)) {
      const cued = lesson.challenges.find((each) => each.id === first)!;
      const unaided = lesson.challenges.find((each) => each.id === next)!;
      expect(cued.skillId, first).toBe('memory.cued.chosen-way');
      expect(unaided.skillId, next).toBe('memory.unaided.four-after-choosing');
      if (cued.kind !== 'make' || cued.task.type !== 'recall') throw new Error(first);
      if (unaided.kind !== 'make' || unaided.task.type !== 'select') throw new Error(next);
      // With no hint: nothing is shown again, there is no look to ask for, and all four are asked for.
      expect(unaided.task.study, next).toBeUndefined();
      expect(unaided.task.recalled, next).toBe('just-now');
      expect(
        unaided.hints.map((hint) => hint.type),
        next,
      ).toEqual(['step', 'reveal']);
      expect([...unaided.task.solution].sort(), next).toEqual([...cued.task.study].sort());
      // And each way to look asks for a different one of the four.
      expect(new Set(cued.task.ways.map((way) => way.answer)).size, first).toBe(3);
      expect(
        cued.task.ways.map((way) => way.way),
        first,
      ).toEqual(['groups', 'story', 'places']);
    }
  });

  it('asks for what was kept on the same cards whichever day it is, under a skill for each wait', () => {
    const lesson = pack().lessons.find((each) => each.id === 'mf-later-01')!;
    const { keep } = lesson.plan;
    expect(keep?.pool).toHaveLength(4);
    const taskOf = (id: string) => {
      const found = lesson.challenges.find((each) => each.id === id)!;
      if (found.kind !== 'make' || found.task.type !== 'select') throw new Error(id);
      return { skillId: found.skillId, task: found.task };
    };
    for (const id of keep?.pool ?? []) {
      const kept = taskOf(id);
      const back = keep!.recall[id]!;
      const same = taskOf(back.sameDay);
      const later = taskOf(back.laterDay);
      expect(kept.skillId).toBe('memory.delayed.keep-three');
      expect(same.skillId).toBe('memory.delayed.same-day');
      expect(later.skillId).toBe('memory.delayed.another-day');
      expect(kept.task.study).toEqual(kept.task.solution);
      for (const asked of [same.task, later.task]) {
        expect(asked.study).toBeUndefined();
        expect(asked.recalled).toBe('last-time');
        expect(asked.cards).toEqual(kept.task.cards);
        expect(asked.solution).toEqual(kept.task.solution);
      }
    }
  });

  it('uses only pictures the first six activities never show, for five things and for things to keep', () => {
    const lessons = pack().lessons;
    const seen = new Set<string>();
    const picturesOf = (value: unknown): string[] => {
      if (Array.isArray(value)) return value.flatMap(picturesOf);
      if (value === null || typeof value !== 'object') return [];
      const entry = value as Record<string, unknown>;
      const own =
        entry.type === 'picture' && typeof entry.id === 'string' ? [entry.id] : ([] as string[]);
      const listed = ['ids', 'owners', 'things'].flatMap((key) =>
        Array.isArray(entry[key]) ? (entry[key] as string[]) : [],
      );
      return [...own, ...listed, ...Object.values(entry).flatMap(picturesOf)];
    };
    for (const lesson of lessons.slice(0, 6)) picturesOf(lesson).forEach((id) => seen.add(id));
    const later = lessons.find((each) => each.id === 'mf-later-01')!;
    for (const challenge of later.challenges) {
      if (challenge.kind !== 'make' || challenge.task.type !== 'select') continue;
      for (const id of challenge.task.solution) {
        expect(seen.has(id), `${challenge.id}: ${id}`).toBe(false);
      }
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
    'memory-ways': (pack) => {
      at(pack, 'mf-choose-01.demo').task.ways.pop();
    },
    'memory-way-answers': (pack) => {
      // The place asked about is now the one where the story's answer was left.
      const { ways } = at(pack, 'mf-choose-01.demo').task;
      ways[2].cue = { type: 'picture', id: ways[2].scene.of.owners[3] };
      ways[2].answer = ways[1].answer;
      ways[2].choices = [ways[1].answer, ways[2].choices[0], ways[2].choices[2]];
    },
    'memory-way-scene': (pack) => {
      at(pack, 'mf-choose-01.demo').task.ways[0].scene.scene = 'things';
    },
    'memory-way-things': (pack) => {
      at(pack, 'mf-choose-01.demo').task.ways[1].scene.of.things = ['cup', 'pot'];
    },
    'memory-way-choices': (pack) => {
      // Both of the others were there: nothing offered was never shown.
      const way = at(pack, 'mf-choose-01.demo').task.ways[0];
      way.choices = [way.answer, 'cup', 'pan'];
    },
    'memory-follow': (pack) => {
      at(pack, 'mf-choose-01.demo-all').task.solution = ['fox', 'ram', 'cup', 'rat'];
    },
    'memory-back': (pack) => {
      at(pack, 'mf-later-01.back-rocket-moth-seed-same-day').task.solution = [
        'rocket',
        'moth',
        'ship',
      ];
    },
  };

  it.each(Object.keys(BREAK))('%s', (code) => {
    expect(codes(broken(BREAK[code]!))).toContain(code);
  });

  it('has a case here for every rule Memory Forest has', async () => {
    const source = (await import('@/content/rules/memoryForest.ts?raw')).default;
    // A kind of challenge, and the two ways a thing can have been looked at before: not rules.
    expect(rulesIn(source, ['choose-one', 'just-now', 'last-time'])).toEqual(
      Object.keys(BREAK).sort(),
    );
  });
});
