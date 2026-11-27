import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addDays, dayOfNumber } from '@/engine/days';
import { GRAPH_FORMAT, auditGraph, type ConceptGraph } from '@/engine/graph';
import {
  DEFAULT_PLAY_POLICY,
  advise,
  wantsBefore,
  type Advice,
  type PlayPolicy,
  type Reason,
  type Suggestion,
} from '@/engine/recommend';
import type { Attempt, WorldId } from '@/engine';
import { attempt } from '../helpers/content';

/**
 * A small curriculum to reason about. In the cove: a1 teaches s1; a2 builds on it; a3 builds on a2's; a4 builds
 * on s1 again; a5 asks one skill alone that has a single presentation, and one with two. In the garden: b1, and b2
 * which builds on it.
 */
const skill = (world: WorldId, needs: string[], lessons: string[], variants = 3) => ({
  world,
  needs,
  lessons,
  variants,
  chance: 0,
});
const GRAPH: ConceptGraph = {
  about: 'for a test',
  format: GRAPH_FORMAT,
  schemaVersion: 1,
  packs: { 'reading-cove': 1, 'number-garden': 1 },
  worlds: [
    { id: 'reading-cove', lessons: ['a1', 'a2', 'a3', 'a4', 'a5'] },
    { id: 'number-garden', lessons: ['b1', 'b2'] },
  ],
  lessons: {
    a1: { world: 'reading-cove', skills: ['phonics.s.one'], asks: ['phonics.s.one'] },
    a2: { world: 'reading-cove', skills: ['phonics.s.two'], asks: ['phonics.s.two'] },
    a3: { world: 'reading-cove', skills: ['phonics.s.three'], asks: ['phonics.s.three'] },
    a4: { world: 'reading-cove', skills: ['phonics.s.four'], asks: ['phonics.s.four'] },
    a5: {
      world: 'reading-cove',
      skills: ['phonics.s.five', 'phonics.s.single'],
      asks: ['phonics.s.five', 'phonics.s.single'],
    },
    b1: { world: 'number-garden', skills: ['math.s.one'], asks: ['math.s.one'] },
    b2: { world: 'number-garden', skills: ['math.s.two'], asks: ['math.s.two'] },
  },
  skills: {
    'phonics.s.one': skill('reading-cove', [], ['a1']),
    'phonics.s.two': skill('reading-cove', ['phonics.s.one'], ['a2']),
    'phonics.s.three': skill('reading-cove', ['phonics.s.two'], ['a3']),
    'phonics.s.four': skill('reading-cove', ['phonics.s.one'], ['a4']),
    'phonics.s.five': skill('reading-cove', [], ['a5'], 2),
    'phonics.s.single': skill('reading-cove', ['phonics.s.five'], ['a5'], 1),
    'math.s.one': skill('number-garden', [], ['b1']),
    'math.s.two': skill('number-garden', ['math.s.one'], ['b2']),
  },
};
const SKILL_OF: Record<string, string> = {
  a1: 'phonics.s.one',
  a2: 'phonics.s.two',
  a3: 'phonics.s.three',
  a4: 'phonics.s.four',
  a5: 'phonics.s.five',
  b1: 'math.s.one',
  b2: 'math.s.two',
};

const D0 = '2026-11-02';
const day = (offset: number): string => addDays(D0, offset) ?? '';

let made = 0;
/** Answers in one activity on one day: so many first tries alone that were right, unless said otherwise. */
function sitting(
  lessonId: string,
  dayText: string,
  count: number,
  overrides: Partial<Attempt> = {},
): Attempt[] {
  return Array.from({ length: count }, (_, index) => {
    made += 1;
    return attempt({
      sessionId: `s-${lessonId}-${dayText}`,
      seq: made,
      at: made * 1000,
      day: dayText,
      lessonId,
      skillId: SKILL_OF[lessonId] ?? 'phonics.s.one',
      challengeId: `${lessonId}.c${index}`,
      variant: index % 2 === 0 ? 'this-way' : 'that-way',
      ...overrides,
    });
  });
}
const helped = (lessonId: string, dayText: string): Attempt[] =>
  sitting(lessonId, dayText, 3, { tryIndex: 1, assistance: 'hint', hintLevel: 1 });

interface Told {
  attempts?: Attempt[];
  finished?: string[];
  today?: string;
  startAt?: Partial<Record<WorldId, string>>;
  leftOut?: WorldId[];
  policy?: PlayPolicy;
  graph?: ConceptGraph;
}
function ask({
  attempts = [],
  finished,
  today = D0,
  startAt,
  leftOut,
  policy,
  graph = GRAPH,
}: Told): Advice {
  return advise({
    graph,
    attempts,
    // Unless a test says otherwise, whatever has been played has been finished.
    finished: new Set(finished ?? attempts.map((answer) => answer.lessonId)),
    today,
    ...(startAt ? { startAt } : {}),
    ...(leftOut ? { leftOut } : {}),
    ...(policy ? { policy } : {}),
  });
}
const whys = (suggestion: Suggestion | null | undefined): string[] =>
  (suggestion?.reasons ?? []).map((reason) => reason.why);
const reason = <W extends Reason['why']>(
  suggestion: Suggestion | null | undefined,
  why: W,
): Extract<Reason, { why: W }> | undefined =>
  suggestion?.reasons.find((each): each is Extract<Reason, { why: W }> => each.why === why);

describe('the small curriculum these tests reason about', () => {
  it('is one the audit finds nothing wrong with', () => {
    expect(auditGraph(GRAPH)).toEqual([]);
  });
});

describe('for someone who has played nothing', () => {
  it('offers the first activity of each world, and points at the first world', () => {
    const advice = ask({});
    expect(advice.top).toMatchObject({ lessonId: 'a1', world: 'reading-cove', kind: 'new' });
    expect(advice.byWorld['reading-cove']).toMatchObject({ lessonId: 'a1', kind: 'new' });
    expect(advice.byWorld['number-garden']).toMatchObject({ lessonId: 'b1', kind: 'new' });
    expect(whys(advice.top)).toEqual(['begins-here', 'builds-on-nothing']);
    expect(advice.due).toEqual([]);
    expect(advice.day).toEqual({ before: 0, fresh: 0, trouble: 0 });
    expect(advice.calendarInDoubt).toBe(false);
  });

  it('offers nothing where there is nothing: a world with no activities, a graph with no worlds', () => {
    const bare: ConceptGraph = { ...GRAPH, worlds: [], lessons: {}, skills: {} };
    expect(ask({ graph: bare })).toMatchObject({ top: null, byWorld: {}, due: [] });
    const empty: ConceptGraph = {
      ...GRAPH,
      worlds: [...GRAPH.worlds, { id: 'music-lab', lessons: [] }],
    };
    expect(ask({ graph: empty }).byWorld['music-lab']).toBeUndefined();
  });
});

describe('something new', () => {
  it('is the first activity not yet finished, when what it builds on has been done alone', () => {
    const advice = ask({ attempts: sitting('a1', D0, 4) });
    const next = advice.byWorld['reading-cove'];
    expect(next).toMatchObject({ lessonId: 'a2', kind: 'new' });
    expect(whys(next)).toEqual(['next-in-order', 'builds-on']);
    expect(reason(next, 'builds-on')).toEqual({
      why: 'builds-on',
      skill: 'phonics.s.one',
      shown: true,
      taken: false,
    });
    expect(advice.day).toEqual({ before: 0, fresh: 1, trouble: 0 });
  });

  it('is not held back by an activity that was begun and not finished: that one is still next', () => {
    const advice = ask({ attempts: sitting('a1', D0, 2), finished: [] });
    expect(advice.byWorld['reading-cove']).toMatchObject({ lessonId: 'a1', kind: 'new' });
    expect(whys(advice.byWorld['reading-cove'])).toEqual(['next-in-order', 'builds-on-nothing']);
  });

  it('passes over, for now, an activity that builds on something not yet done alone', () => {
    // The first was done alone; the second only with help; the third builds on the second, the fourth on the first.
    const attempts = [...sitting('a1', D0, 4), ...helped('a2', D0)];
    const next = ask({ attempts }).byWorld['reading-cove'];
    expect(next).toMatchObject({ lessonId: 'a4', kind: 'new' });
    expect(reason(next, 'passed-over')).toEqual({
      why: 'passed-over',
      lesson: 'a3',
      skill: 'phonics.s.two',
    });
  });

  it('is offered all the same when nothing else is ready, and says so', () => {
    const next = ask({ attempts: helped('b1', D0) }).byWorld['number-garden'];
    expect(next).toMatchObject({ lessonId: 'b2', kind: 'reach' });
    expect(whys(next)).toEqual(['next-in-order', 'builds-on', 'nothing-else-ready']);
    expect(reason(next, 'builds-on')).toMatchObject({ skill: 'math.s.one', shown: false });
  });

  it('does not count answers given with help as something done alone, however many there are', () => {
    const attempts = [
      ...helped('b1', day(-2)),
      ...sitting('b1', D0, 6, { stage: 'guided' }),
      ...sitting('b1', D0, 6, { assistance: 'adult' }),
      ...sitting('b1', D0, 6, { hintLevel: 2, assistance: 'hint' }),
      ...sitting('b1', D0, 6, { tryIndex: 1 }),
    ];
    expect(ask({ attempts }).byWorld['number-garden']).toMatchObject({
      lessonId: 'b2',
      kind: 'reach',
    });
    // One first try alone that was right, and it is ready.
    expect(
      ask({ attempts: [...attempts, ...sitting('b1', D0, 1)] }).byWorld['number-garden'],
    ).toMatchObject({ lessonId: 'b2', kind: 'new' });
  });
});

describe('something that is not ready', () => {
  it('is not offered before something that is due, whatever the mix would have', () => {
    // A world of two. The first has been done four times and never alone, the last time a week ago: it is
    // due. The second builds on it, and is not ready. Of what was played lately, most had been played before.
    const graph: ConceptGraph = {
      ...GRAPH,
      worlds: [{ id: 'reading-cove', lessons: ['a1', 'a2'] }],
    };
    const attempts = [-16, -15, -14, -7].flatMap((offset) => helped('a1', day(offset)));
    const advice = ask({ attempts, graph });
    expect(advice.recent).toEqual({ before: 3, fresh: 1 });
    expect(wantsBefore(advice.recent, 0.7)).toBe(false);
    const cove = advice.byWorld['reading-cove'];
    expect(cove).toMatchObject({ lessonId: 'a1', kind: 'again' });
    expect(whys(cove)).toEqual(['due', 'nothing-new']);
    // With nothing due it is offered all the same, and says so.
    const early = ask({ attempts, graph, today: day(-2) }).byWorld['reading-cove'];
    expect(early).toMatchObject({ lessonId: 'a2', kind: 'reach' });
    expect(whys(early)).toContain('nothing-else-ready');
  });
});

describe('where a grown-up has chosen a place to begin', () => {
  const startAt = { 'reading-cove': 'a3' } as const;

  it('begins there, taking on their word what is taught before it, and counting none of it as shown', () => {
    const advice = ask({ startAt });
    const next = advice.byWorld['reading-cove'];
    expect(next).toMatchObject({ lessonId: 'a3', kind: 'new' });
    expect(whys(next)).toEqual(['chosen-start', 'builds-on']);
    expect(reason(next, 'builds-on')).toEqual({
      why: 'builds-on',
      skill: 'phonics.s.two',
      shown: false,
      taken: true,
    });
    expect(advice.top).toMatchObject({ lessonId: 'a3' });
    expect(advice.due).toEqual([]);
  });

  it('goes on from there, and comes back to what was passed over when the rest is finished', () => {
    const on = ask({ startAt, attempts: sitting('a3', D0, 4) });
    expect(on.byWorld['reading-cove']).toMatchObject({ lessonId: 'a4', kind: 'new' });
    const attempts = [...sitting('a3', D0, 4), ...sitting('a4', D0, 4), ...sitting('a5', D0, 4)];
    const back = ask({ startAt, attempts });
    expect(back.byWorld['reading-cove']).toMatchObject({ lessonId: 'a1', kind: 'new' });
    expect(whys(back.byWorld['reading-cove'])).toEqual(['next-in-order', 'builds-on-nothing']);
  });

  it('is not put off by a place that is no longer in the world: it begins at the beginning', () => {
    const advice = ask({ startAt: { 'reading-cove': 'gone-01' } });
    expect(advice.byWorld['reading-cove']).toMatchObject({ lessonId: 'a1' });
    expect(whys(advice.byWorld['reading-cove'])).toEqual(['begins-here', 'builds-on-nothing']);
  });

  it('does not take on their word what is taught from there on', () => {
    // Begun at the third and done only with help: the fourth builds on the first, which is before the start.
    const attempts = helped('a3', D0);
    expect(ask({ startAt, attempts }).byWorld['reading-cove']).toMatchObject({
      lessonId: 'a4',
      kind: 'new',
    });
    // But what builds on the third itself would have to wait: nothing does here, so make one that does.
    const graph: ConceptGraph = {
      ...GRAPH,
      skills: {
        ...GRAPH.skills,
        'phonics.s.four': skill('reading-cove', ['phonics.s.three'], ['a4']),
      },
    };
    const next = ask({ startAt, attempts, graph }).byWorld['reading-cove'];
    expect(next).toMatchObject({ lessonId: 'a5', kind: 'new' });
    expect(reason(next, 'passed-over')).toMatchObject({ lesson: 'a4', skill: 'phonics.s.three' });
  });

  it('takes on their word what was taught before it, though the same thing is taught again further on', () => {
    // The first skill is taught in the first activity, and again in the fourth. The second builds on it.
    const graph: ConceptGraph = {
      ...GRAPH,
      lessons: {
        ...GRAPH.lessons,
        a4: {
          world: 'reading-cove',
          skills: ['phonics.s.four', 'phonics.s.one'],
          asks: ['phonics.s.four', 'phonics.s.one'],
        },
      },
      skills: { ...GRAPH.skills, 'phonics.s.one': skill('reading-cove', [], ['a1', 'a4']) },
    };
    // Play begins at the second: as far as the second builds on the first skill, it was taught before.
    const next = ask({ startAt: { 'reading-cove': 'a2' }, graph }).byWorld['reading-cove'];
    expect(next).toMatchObject({ lessonId: 'a2', kind: 'new' });
    expect(whys(next)).toEqual(['chosen-start', 'builds-on']);
    expect(reason(next, 'builds-on')).toEqual({
      why: 'builds-on',
      skill: 'phonics.s.one',
      shown: false,
      taken: true,
    });
  });

  it('does not take on their word what is still being taught between that place and an activity', () => {
    // The second skill is taught in the second activity and again in the third; the fourth builds on it.
    const graph: ConceptGraph = {
      ...GRAPH,
      lessons: {
        ...GRAPH.lessons,
        a3: {
          world: 'reading-cove',
          skills: ['phonics.s.three', 'phonics.s.two'],
          asks: ['phonics.s.three', 'phonics.s.two'],
        },
      },
      skills: {
        ...GRAPH.skills,
        'phonics.s.two': skill('reading-cove', ['phonics.s.one'], ['a2', 'a3']),
        'phonics.s.four': skill('reading-cove', ['phonics.s.two'], ['a4']),
      },
    };
    // Play begins at the third, which is where it is offered: what the third builds on was taught before.
    expect(ask({ startAt, graph }).byWorld['reading-cove']).toMatchObject({
      lessonId: 'a3',
      kind: 'new',
    });
    // The third was done with help. The fourth builds on what the second taught, which is taken, and on
    // what the third teaches of the same thing, which is not: it waits.
    const next = ask({ startAt, graph, attempts: helped('a3', D0) }).byWorld['reading-cove'];
    expect(next).toMatchObject({ lessonId: 'a5', kind: 'new' });
    expect(reason(next, 'passed-over')).toEqual({
      why: 'passed-over',
      lesson: 'a4',
      skill: 'phonics.s.two',
    });
  });
});

describe('something played before', () => {
  it('is never offered again on the day it was played', () => {
    for (const attempts of [sitting('a1', D0, 1), sitting('a1', D0, 5), helped('a1', D0)]) {
      const advice = ask({ attempts });
      expect(advice.due).toEqual([]);
      expect(advice.byWorld['reading-cove']?.lessonId).not.toBe('a1');
      expect(advice.byWorld['reading-cove']?.kind).toBe('new');
    }
  });

  it('comes back the next day when it was done alone once or twice', () => {
    const advice = ask({ attempts: sitting('a1', D0, 2), today: day(1) });
    const first = advice.byWorld['reading-cove'];
    expect(first).toMatchObject({ lessonId: 'a1', kind: 'practice' });
    expect(whys(first)).toEqual(['due', 'mix']);
    expect(reason(first, 'due')).toEqual({
      why: 'due',
      skill: 'phonics.s.one',
      basis: 'practicing',
      lastDay: D0,
      daysSince: 1,
      waitDays: 1,
    });
    // Of what has been played so far, one activity and that one new: one played before is in order.
    expect(reason(first, 'mix')).toEqual({
      why: 'mix',
      before: 0,
      fresh: 1,
      share: 0.7,
      chose: 'before',
    });
    expect(advice.recent).toEqual({ before: 0, fresh: 1 });
    expect(advice.top).toEqual(first);
    expect(advice.due.map((each) => each.lessonId)).toEqual(['a1']);
  });

  it('waits two days when it was done alone three times and more', () => {
    const attempts = sitting('a1', D0, 4);
    expect(ask({ attempts, today: day(1) }).byWorld['reading-cove']?.lessonId).toBe('a2');
    expect(ask({ attempts, today: day(2) }).byWorld['reading-cove']).toMatchObject({
      lessonId: 'a1',
      kind: 'practice',
    });
  });

  it('is a review once it is independent across days, and two weeks go by first', () => {
    const attempts = [...sitting('a1', D0, 3), ...sitting('a1', day(2), 3)];
    expect(ask({ attempts, today: day(15) }).due).toEqual([]);
    const advice = ask({ attempts, today: day(16) });
    expect(advice.byWorld['reading-cove']).toMatchObject({ lessonId: 'a1', kind: 'review' });
    expect(reason(advice.top, 'due')).toMatchObject({
      basis: 'consistent',
      waitDays: 14,
      daysSince: 14,
    });
  });

  it('comes back the next day after a first try alone that was not right', () => {
    const attempts = [
      ...sitting('a1', D0, 3),
      ...sitting('a1', day(2), 3),
      ...sitting('a1', day(9), 1, { outcome: 'incorrect', response: 'a', at: 9e12 }),
    ];
    const advice = ask({ attempts, today: day(10) });
    expect(advice.due).toHaveLength(1);
    expect(advice.due[0]).toMatchObject({ lessonId: 'a1', kind: 'missed' });
    expect(reason(advice.due[0], 'due')).toMatchObject({ basis: 'missed-last', waitDays: 1 });
  });

  it('is offered again on another day when it was finished with help every time', () => {
    const attempts = helped('a1', D0);
    const advice = ask({ attempts, today: day(1) });
    expect(advice.byWorld['reading-cove']).toMatchObject({ lessonId: 'a1', kind: 'again' });
    expect(reason(advice.top, 'due')).toMatchObject({ basis: 'not-yet-alone', waitDays: 1 });
  });

  it('is not what an unfinished activity is: that one is new until it has been finished', () => {
    const advice = ask({ attempts: sitting('a1', D0, 2), finished: [], today: day(3) });
    expect(advice.due).toEqual([]);
    expect(advice.byWorld['reading-cove']).toMatchObject({ lessonId: 'a1', kind: 'new' });
  });

  it('puts the one that has waited longest first, in any world, and then the one further on in its learning', () => {
    const attempts = [
      ...sitting('a1', day(-9), 2), // due since eight days
      ...sitting('b1', day(-3), 2), // due since two
      ...sitting('a2', day(-3), 4), // due since one
      ...helped('a4', day(-3)), // due since two, and never yet done alone
    ];
    const advice = ask({ attempts });
    expect(advice.due.map((each) => [each.lessonId, each.kind])).toEqual([
      ['a1', 'practice'],
      ['b1', 'practice'],
      ['a4', 'again'],
      ['a2', 'practice'],
    ]);
    expect(advice.top).toMatchObject({ lessonId: 'a1' });
    expect(advice.byWorld['number-garden']).toMatchObject({ lessonId: 'b1', kind: 'practice' });
  });

  it('gives every skill that is due as a reason, the one that has waited longest first', () => {
    const graph: ConceptGraph = {
      ...GRAPH,
      lessons: {
        ...GRAPH.lessons,
        a1: {
          world: 'reading-cove',
          skills: ['phonics.s.one', 'phonics.s.other'],
          asks: ['phonics.s.one', 'phonics.s.other'],
        },
      },
      skills: { ...GRAPH.skills, 'phonics.s.other': skill('reading-cove', [], ['a1']) },
    };
    const attempts = [
      ...sitting('a1', day(-2), 2),
      ...sitting('a1', day(-5), 2, { skillId: 'phonics.s.other' }),
    ];
    const first = ask({ attempts, graph }).due[0];
    expect(first?.lessonId).toBe('a1');
    expect(first?.reasons).toEqual([
      {
        why: 'due',
        skill: 'phonics.s.other',
        basis: 'practicing',
        lastDay: day(-5),
        daysSince: 5,
        waitDays: 1,
      },
      {
        why: 'due',
        skill: 'phonics.s.one',
        basis: 'practicing',
        lastDay: day(-2),
        daysSince: 2,
        waitDays: 1,
      },
    ]);
  });

  it('is not brought back by a skill with a single presentation: the record could never say more of it', () => {
    // Both skills of the fifth activity done alone on one day. The one with two presentations waits two days.
    const five = sitting('a5', D0, 4);
    const single = sitting('a5', D0, 1, { skillId: 'phonics.s.single', variant: 'only-way' });
    const attempts = [...five, ...single];
    // The single one would be due the next day, and every day after, for ever.
    expect(ask({ attempts, today: day(1) }).due).toEqual([]);
    const later = ask({ attempts, today: day(2) });
    expect(later.due.map((each) => each.lessonId)).toEqual(['a5']);
    expect(later.due[0]?.reasons.map((each) => (each.why === 'due' ? each.skill : ''))).toEqual([
      'phonics.s.five',
    ]);
  });

  it('is brought back by such a skill when it is all the activity asks alone', () => {
    const graph: ConceptGraph = {
      ...GRAPH,
      lessons: {
        ...GRAPH.lessons,
        a5: { world: 'reading-cove', skills: ['phonics.s.single'], asks: ['phonics.s.single'] },
      },
      skills: { ...GRAPH.skills, 'phonics.s.single': skill('reading-cove', [], ['a5'], 1) },
    };
    const attempts = sitting('a5', D0, 1, { skillId: 'phonics.s.single', variant: 'only-way' });
    expect(ask({ attempts, graph, today: day(1) }).due.map((each) => each.lessonId)).toEqual([
      'a5',
    ]);
  });
});

describe('the mix', () => {
  it('keeps to seven in ten of any ten in a row, for as long as both piles have something', () => {
    // What would be chosen, with the nine before it to go by, for forty turns.
    const picks: string[] = [];
    for (let turn = 0; turn < 40; turn++) {
      const last = picks.slice(-9);
      const before = wantsBefore(
        {
          before: last.filter((each) => each === 'B').length,
          fresh: last.filter((each) => each === 'N').length,
        },
        0.7,
      );
      picks.push(before ? 'B' : 'N');
    }
    expect(picks.slice(0, 10).join('')).toBe('NBBNBBNBBB');
    for (let from = 0; from + 10 <= picks.length; from++) {
      const ten = picks.slice(from, from + 10);
      expect(ten.filter((each) => each === 'B')).toHaveLength(7);
    }
  });

  it('never asks for one played before when the share is none, and always when it is all', () => {
    for (const counts of [
      { before: 0, fresh: 0 },
      { before: 3, fresh: 1 },
      { before: 0, fresh: 9 },
    ]) {
      expect(wantsBefore(counts, 0)).toBe(false);
      expect(wantsBefore(counts, -1)).toBe(false);
      expect(wantsBefore(counts, Number.NaN)).toBe(false);
      expect(wantsBefore(counts, 1)).toBe(true);
      expect(wantsBefore(counts, 7)).toBe(true);
    }
  });

  it('turns to something new when most of what was played lately had been played before', () => {
    // The first, played on five days; the second, new yesterday and due today.
    const attempts = [
      ...[-7, -6, -5, -3, -1].flatMap((offset) => sitting('a1', day(offset), 1)),
      ...sitting('a2', day(-1), 2),
    ];
    const advice = ask({ attempts });
    expect(advice.recent).toEqual({ before: 4, fresh: 2 });
    expect(advice.due.map((each) => each.lessonId)).toContain('a2');
    const next = advice.byWorld['reading-cove'];
    expect(next).toMatchObject({ lessonId: 'a3', kind: 'new' });
    expect(reason(next, 'mix')).toEqual({
      why: 'mix',
      before: 4,
      fresh: 2,
      share: 0.7,
      chose: 'fresh',
    });
    // And after the new one, back to what is due.
    const after = ask({ attempts: [...attempts, ...sitting('a3', D0, 2)] });
    expect(after.recent).toEqual({ before: 4, fresh: 3 });
    expect(after.byWorld['reading-cove']).toMatchObject({ lessonId: 'a2', kind: 'practice' });
  });

  it('goes by the last activities played, on whatever days: one a day is treated as six a day are', () => {
    // The same nine plays, on nine days and on two.
    const plays = ['a1', 'a2', 'a1', 'a3', 'a2', 'a1', 'a4', 'a3', 'a2'];
    const spread = plays.flatMap((id, index) => sitting(id, day(index - 12), 2));
    const packed = plays.flatMap((id, index) => sitting(id, day(index < 5 ? -3 : -2), 2));
    expect(ask({ attempts: spread }).recent).toEqual({ before: 5, fresh: 4 });
    // (Packed into two days, an activity played twice in a day is one play of it: three new ones on the first
    // day, and on the second one new and three played before.)
    expect(ask({ attempts: packed }).recent).toEqual({ before: 3, fresh: 4 });
  });

  it('looks no further back than the policy says', () => {
    const attempts = [
      ...[-9, -8, -7, -6, -5, -4, -3, -2].flatMap((offset) => sitting('a1', day(offset), 1)),
      ...sitting('a2', day(-1), 2),
    ];
    expect(ask({ attempts }).recent).toEqual({ before: 7, fresh: 2 });
    const short: PlayPolicy = { ...DEFAULT_PLAY_POLICY, mixOver: 4 };
    expect(ask({ attempts, policy: short }).recent).toEqual({ before: 2, fresh: 1 });
    const none: PlayPolicy = { ...DEFAULT_PLAY_POLICY, mixOver: 0 };
    expect(ask({ attempts, policy: none }).recent).toEqual({ before: 0, fresh: 0 });
  });

  it('offers what is due when nothing new is left, whatever the mix would have', () => {
    const all = ['a1', 'a2', 'a3', 'a4', 'a5'];
    // Every activity played on three days: of the last nine plays, eight were of things played before.
    const attempts = [-4, -2, -1].flatMap((offset) =>
      all.flatMap((id) => sitting(id, day(offset), 1, { outcome: 'incorrect', response: 'a' })),
    );
    const advice = ask({ attempts, today: day(6) });
    expect(wantsBefore(advice.recent, 0.7)).toBe(false);
    const next = advice.byWorld['reading-cove'];
    expect(next?.kind).toBe('again');
    expect(whys(next)).toEqual(['due', 'nothing-new']);
  });

  it('counts an activity once however many times it is played in a day', () => {
    const attempts = [
      ...sitting('a1', day(-1), 2),
      ...sitting('a1', D0, 2, { sessionId: 's-again-1' }),
      ...sitting('a1', D0, 2, { sessionId: 's-again-2' }),
      ...sitting('a1', D0, 2, { sessionId: 's-again-3' }),
    ];
    expect(ask({ attempts }).day).toEqual({ before: 1, fresh: 0, trouble: 0 });
  });

  it('follows the share it is given', () => {
    const attempts = [...sitting('a1', day(-1), 2)];
    const none: PlayPolicy = { ...DEFAULT_PLAY_POLICY, beforeShare: 0 };
    expect(ask({ attempts, policy: none }).byWorld['reading-cove']).toMatchObject({
      lessonId: 'a2',
    });
    expect(ask({ attempts, policy: none }).due.map((each) => each.lessonId)).toEqual(['a1']);
    const all: PlayPolicy = { ...DEFAULT_PLAY_POLICY, beforeShare: 1 };
    const played = [...attempts, ...sitting('a2', day(-1), 2), ...sitting('a1', D0, 2)];
    expect(ask({ attempts: played, policy: all }).byWorld['reading-cove']).toMatchObject({
      lessonId: 'a2',
      kind: 'practice',
    });
  });
});

describe('what went badly last time', () => {
  // Three that went badly, each due: two never yet done alone, and one that last ended with a miss.
  const badly = [
    ...helped('a1', day(-2)),
    ...helped('a4', day(-2)),
    ...sitting('b1', day(-3), 2),
    ...sitting('b1', day(-2), 1, { outcome: 'incorrect', response: 'a', at: 9e12 }),
  ];

  it('is offered one a day and no more: the rest wait, and something new comes instead', () => {
    const morning = ask({ attempts: badly });
    expect(morning.due.map((each) => each.kind)).toEqual(['missed', 'again', 'again']);
    expect(morning.top).toMatchObject({ lessonId: 'b1', kind: 'missed' });
    expect(morning.day).toEqual({ before: 0, fresh: 0, trouble: 0 });

    // The first has been tried again, and went badly again. The other two are still due, and are not offered.
    const tried = [...badly, ...helped('b1', D0)];
    const after = ask({ attempts: tried });
    expect(after.day).toEqual({ before: 1, fresh: 0, trouble: 1 });
    expect(after.due.map((each) => each.lessonId)).toEqual(['a1', 'a4']);
    expect(after.byWorld['reading-cove']).toMatchObject({ lessonId: 'a5', kind: 'new' });
    expect(after.top).toMatchObject({ lessonId: 'a5', kind: 'new' });

    // And after the new one, when the mix would have one played before: still none of them.
    const more = ask({ attempts: [...tried, ...sitting('a5', D0, 4)] });
    expect(more.day).toEqual({ before: 1, fresh: 1, trouble: 1 });
    expect(wantsBefore(more.day, 0.7)).toBe(true);
    expect(more.byWorld['reading-cove']).toMatchObject({ lessonId: 'a2', kind: 'reach' });
  });

  it('counts as that by how it stood this morning, however it went today', () => {
    // Tried again today, and done alone this time: it was still the day's one.
    const tried = [...badly, ...sitting('b1', D0, 3, { at: 9.5e12 })];
    expect(ask({ attempts: tried }).day).toEqual({ before: 1, fresh: 0, trouble: 1 });
    // Something that went well, played again today, is not one.
    const well = [...sitting('a1', day(-1), 2), ...sitting('a1', D0, 2)];
    expect(ask({ attempts: well }).day).toEqual({ before: 1, fresh: 0, trouble: 0 });
    // Nor is something begun on another day and still not finished: it is not one "played before, and due".
    const unfinished = [...helped('a1', day(-2)), ...helped('a1', D0)];
    expect(ask({ attempts: unfinished, finished: [] }).day).toEqual({
      before: 1,
      fresh: 0,
      trouble: 0,
    });
    // Nor is something played again today that was not due.
    const early = [...sitting('a1', day(-1), 4), ...sitting('a1', D0, 1, { outcome: 'incorrect' })];
    expect(ask({ attempts: early }).day).toEqual({ before: 1, fresh: 0, trouble: 0 });
  });

  it('is not what a day begins with when something that went well is due, however long it has waited', () => {
    const attempts = [...helped('a1', day(-20)), ...sitting('a4', day(-1), 2)];
    const advice = ask({ attempts });
    // The one that has waited longest is first in the list of what is due.
    expect(advice.due.map((each) => [each.lessonId, each.kind])).toEqual([
      ['a1', 'again'],
      ['a4', 'practice'],
    ]);
    expect(advice.top).toMatchObject({ lessonId: 'a4', kind: 'practice' });
    // Later in the day it is the one that has waited longest.
    const later = ask({
      attempts: [...attempts, ...sitting('b1', D0, 2), ...sitting('b2', D0, 2)],
    });
    expect(later.day).toEqual({ before: 0, fresh: 2, trouble: 0 });
    expect(later.top).toMatchObject({ lessonId: 'a1', kind: 'again' });
  });

  it('is offered a second time in a day only when there is nothing else at all', () => {
    const graph: ConceptGraph = {
      ...GRAPH,
      worlds: [{ id: 'number-garden', lessons: ['b1', 'b2'] }],
    };
    const attempts = [...helped('b1', day(-2)), ...helped('b2', day(-2)), ...helped('b1', D0)];
    const advice = ask({ attempts, graph });
    expect(advice.day).toEqual({ before: 1, fresh: 0, trouble: 1 });
    const offered = advice.byWorld['number-garden'];
    expect(offered).toMatchObject({ lessonId: 'b2', kind: 'again' });
    expect(whys(offered)).toEqual(['due', 'nothing-new']);
  });

  it('gives way to something finished and not played lately, when nothing new is left either', () => {
    // Everything in the garden finished. One went badly and is due; the other went well and is not.
    const graph: ConceptGraph = {
      ...GRAPH,
      worlds: [
        { id: 'reading-cove', lessons: ['a1'] },
        { id: 'number-garden', lessons: ['b1', 'b2'] },
      ],
    };
    const attempts = [
      ...helped('a1', day(-3)),
      ...helped('b1', day(-3)),
      ...sitting('b2', day(-1), 4),
      // Today's one thing that went badly has been played.
      ...helped('a1', D0),
    ];
    const advice = ask({ attempts, graph });
    expect(advice.day.trouble).toBe(1);
    expect(advice.due.map((each) => each.lessonId)).toEqual(['b1']);
    const offered = advice.byWorld['number-garden'];
    expect(offered).toMatchObject({ lessonId: 'b2', kind: 'free' });
    expect(whys(offered)).toEqual(['nothing-new', 'one-a-day', 'longest-ago']);
    expect(advice.top).toBe(offered);
  });

  it('follows the number it is given', () => {
    const tried = [...badly, ...helped('b1', D0)];
    const two: PlayPolicy = { ...DEFAULT_PLAY_POLICY, troublePerDay: 2, beforeShare: 1 };
    expect(ask({ attempts: tried, policy: two }).top).toMatchObject({
      lessonId: 'a1',
      kind: 'again',
    });
    const none: PlayPolicy = { ...DEFAULT_PLAY_POLICY, troublePerDay: 0 };
    expect(ask({ attempts: badly, policy: none }).top).toMatchObject({
      lessonId: 'a5',
      kind: 'new',
    });
  });
});

describe('when everything has been finished', () => {
  const all = ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2'];

  it('offers the one played longest ago when nothing is due, and says why', () => {
    const attempts = [
      ...all.flatMap((id) => sitting(id, D0, 4)),
      ...sitting('a2', day(-1), 1),
      ...sitting('a3', day(1), 1),
    ];
    const advice = ask({ attempts, today: day(1) });
    expect(advice.due).toEqual([]);
    // The cove's were all last played on the second, but for the third activity, which was played today.
    const cove = advice.byWorld['reading-cove'];
    expect(cove).toMatchObject({ lessonId: 'a1', kind: 'free' });
    expect(whys(cove)).toEqual(['nothing-new', 'nothing-due', 'longest-ago']);
    expect(reason(cove, 'longest-ago')).toEqual({ why: 'longest-ago', lastDay: D0 });
    expect(advice.top).toMatchObject({ lessonId: 'a1', kind: 'free' });
  });

  it('does not offer the one just played when another was not played today', () => {
    const attempts = [...sitting('b1', day(-1), 4), ...sitting('b2', D0, 4)];
    const garden = ask({ attempts }).byWorld['number-garden'];
    expect(garden).toMatchObject({ lessonId: 'b1', kind: 'free' });
  });

  it('offers the one played longest ago, and not the one played most lately', () => {
    // Both of the garden's are independent across days, and neither is due for a week and more.
    const attempts = [
      ...sitting('b2', day(-10), 3),
      ...sitting('b2', day(-8), 3),
      ...sitting('b1', day(-5), 3),
      ...sitting('b1', day(-3), 3),
    ];
    const advice = ask({ attempts });
    expect(advice.due).toEqual([]);
    const garden = advice.byWorld['number-garden'];
    expect(garden).toMatchObject({ lessonId: 'b2', kind: 'free' });
    expect(reason(garden, 'longest-ago')).toEqual({ why: 'longest-ago', lastDay: day(-8) });
  });

  it('offers what went well sooner than what went badly, however long ago that was played', () => {
    // The first went badly on four days, the last of them five days ago: it is not due for two days yet.
    // The second went well yesterday, and is not due either.
    const attempts = [
      ...[-14, -13, -12, -5].flatMap((offset) => helped('b1', day(offset))),
      ...sitting('b2', day(-1), 4),
    ];
    const advice = ask({ attempts });
    expect(advice.due).toEqual([]);
    const garden = advice.byWorld['number-garden'];
    expect(garden).toMatchObject({ lessonId: 'b2', kind: 'free' });
    expect(whys(garden)).toEqual(['nothing-new', 'nothing-due', 'longest-ago']);
  });

  it('offers a second thing that went badly sooner than anything played today', () => {
    // A world of three, all finished. One went well and was played again today. Two went badly and were due:
    // one of them was played today, and is the day's one; the other is still waiting.
    const graph: ConceptGraph = {
      ...GRAPH,
      worlds: [{ id: 'reading-cove', lessons: ['a1', 'a2', 'a4'] }],
    };
    const attempts = [
      ...sitting('a1', day(-3), 2),
      ...sitting('a1', D0, 2),
      ...helped('a2', day(-2)),
      ...helped('a2', D0),
      ...helped('a4', day(-2)),
    ];
    const advice = ask({ attempts, graph });
    expect(advice.day).toEqual({ before: 2, fresh: 0, trouble: 1 });
    const cove = advice.byWorld['reading-cove'];
    expect(cove).toMatchObject({ lessonId: 'a4', kind: 'again' });
    expect(whys(cove)).toEqual(['due', 'nothing-new']);
  });
});

describe('questions that are easy to get right without knowing', () => {
  it('are known from the graph: four right of two pictures is not yet independent, and comes back the next day', () => {
    const easy = (chance: number): ConceptGraph => ({
      ...GRAPH,
      skills: {
        ...GRAPH.skills,
        'phonics.s.one': { ...skill('reading-cove', [], ['a1']), chance },
      },
    });
    const four = sitting('a1', D0, 4);
    // With nothing to be had by luck, four right is independent so far, and waits two days.
    expect(ask({ attempts: four, today: day(1), graph: easy(0) }).due).toEqual([]);
    // With a half to be had by luck, four in a row comes off one time in sixteen: it is still being practised.
    const advice = ask({ attempts: four, today: day(1), graph: easy(0.5) });
    expect(advice.due.map((each) => each.lessonId)).toEqual(['a1']);
    expect(reason(advice.due[0], 'due')).toMatchObject({ basis: 'practicing', waitDays: 1 });
    // Five in a row comes off one time in thirty-two, and that is taken to be more than luck.
    const five = sitting('a1', D0, 5);
    expect(ask({ attempts: five, today: day(1), graph: easy(0.5) }).due).toEqual([]);
  });

  it('are known when the day so far is counted, too', () => {
    // One activity asks two things alone. One has never been done alone and was tried yesterday. The other was
    // right three times, three days ago: still being practised if its questions are easy to guess, and due two
    // days since; independent so far if they are not, and not due for two days yet.
    const twoSkills = (chance: number): ConceptGraph => ({
      ...GRAPH,
      lessons: {
        ...GRAPH.lessons,
        a1: {
          world: 'reading-cove',
          skills: ['phonics.s.one', 'phonics.s.other'],
          asks: ['phonics.s.one', 'phonics.s.other'],
        },
      },
      skills: {
        ...GRAPH.skills,
        'phonics.s.other': { ...skill('reading-cove', [], ['a1']), chance },
      },
    });
    const policy: PlayPolicy = {
      ...DEFAULT_PLAY_POLICY,
      review: {
        ...DEFAULT_PLAY_POLICY.review,
        afterDays: { ...DEFAULT_PLAY_POLICY.review.afterDays, practicing: [1], provisional: [5] },
      },
    };
    const attempts = [
      ...sitting('a1', day(-3), 3, { skillId: 'phonics.s.other' }),
      ...helped('a1', day(-1)),
      // Played again today.
      ...sitting('a1', D0, 1),
    ];
    // Easy to guess: what brought it back this morning was the one being practised, which had waited longest.
    expect(ask({ attempts, policy, graph: twoSkills(0.5) }).day).toEqual({
      before: 1,
      fresh: 0,
      trouble: 0,
    });
    // Not to be guessed: that one was not due, and what brought it back was the one never yet done alone.
    expect(ask({ attempts, policy, graph: twoSkills(0) }).day).toEqual({
      before: 1,
      fresh: 0,
      trouble: 1,
    });
  });
});

describe('a calendar that has moved', () => {
  it('offers again what was played, with nothing to count from, and says the calendar is in doubt', () => {
    const attempts = sitting('a1', D0, 4);
    const advice = ask({ attempts, today: '2020-01-01' });
    expect(advice.calendarInDoubt).toBe(true);
    expect(advice.due).toHaveLength(1);
    expect(advice.due[0]).toMatchObject({ lessonId: 'a1', kind: 'practice' });
    // No day it was played on can be counted from, so nothing has been "played lately" either.
    expect(advice.recent).toEqual({ before: 0, fresh: 0 });
    expect(advice.top).toMatchObject({ lessonId: 'a2', kind: 'new' });
    expect(whys(advice.top)).toEqual(['next-in-order', 'builds-on', 'mix', 'calendar-in-doubt']);
    // What was played before says so too, when it is what is offered.
    const all: PlayPolicy = { ...DEFAULT_PLAY_POLICY, beforeShare: 1 };
    const offered = ask({ attempts, today: '2020-01-01', policy: all }).top;
    expect(offered).toMatchObject({ lessonId: 'a1', kind: 'practice' });
    expect(whys(offered)).toEqual(['due', 'mix', 'calendar-in-doubt']);
  });

  it('takes a day or two ahead as today: nothing is offered again, and nothing is in doubt', () => {
    const attempts = sitting('a1', day(2), 2);
    const advice = ask({ attempts });
    expect(advice.calendarInDoubt).toBe(false);
    expect(advice.due).toEqual([]);
    expect(advice.day).toEqual({ before: 0, fresh: 1, trouble: 0 });
  });
});

describe('a record from other content', () => {
  it('passes by answers and activities the graph does not have', () => {
    const attempts = [
      ...sitting('gone-01', D0, 4, { skillId: 'phonics.gone.other' }),
      ...sitting('a1', day(-3), 2, { skillId: 'phonics.gone.skill' }),
    ];
    const advice = ask({ attempts, finished: ['gone-01', 'a1', 'also-gone'] });
    expect(advice.due).toEqual([]);
    // The first is finished, and nothing says its skill was done alone: what builds on it is passed over.
    const next = advice.byWorld['reading-cove'];
    expect(next).toMatchObject({ lessonId: 'a5', kind: 'new' });
    expect(next?.reasons.filter((each) => each.why === 'passed-over')).toEqual([
      { why: 'passed-over', lesson: 'a2', skill: 'phonics.s.one' },
      { why: 'passed-over', lesson: 'a3', skill: 'phonics.s.two' },
      { why: 'passed-over', lesson: 'a4', skill: 'phonics.s.one' },
    ]);
    // An activity the graph does not have is not part of the day.
    expect(advice.day).toEqual({ before: 0, fresh: 0, trouble: 0 });
  });

  it('passes by an activity its world lists and the graph does not describe', () => {
    const graph: ConceptGraph = {
      ...GRAPH,
      worlds: [{ id: 'reading-cove', lessons: ['a0', ...(GRAPH.worlds[0]?.lessons ?? [])] }],
    };
    expect(ask({ graph }).top).toMatchObject({ lessonId: 'a1' });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Any record at all
// ---------------------------------------------------------------------------------------------------------------------

const LESSONS = Object.keys(GRAPH.lessons);
const BASE = 20_000;

const anyAnswer = fc.record({
  lesson: fc.constantFrom(...LESSONS, 'gone-01'),
  dayOffset: fc.integer({ min: -40, max: 6 }),
  at: fc.integer({ min: 0, max: 2_000_000_000_000 }),
  stage: fc.constantFrom<'guided' | 'independent'>('guided', 'independent'),
  tryIndex: fc.integer({ min: 0, max: 1 }),
  hintLevel: fc.integer({ min: 0, max: 1 }),
  assistance: fc.constantFrom<'none' | 'hint' | 'adult'>('none', 'none', 'hint', 'adult'),
  outcome: fc.constantFrom<'correct' | 'incorrect'>('correct', 'correct', 'incorrect'),
  challenge: fc.integer({ min: 0, max: 4 }),
  variant: fc.constantFrom('a', 'b', 'c'),
  session: fc.integer({ min: 0, max: 5 }),
  second: fc.boolean(),
});
const anyRecord = fc.array(anyAnswer, { maxLength: 60 }).map((answers) =>
  answers.map((answer, index) =>
    attempt({
      sessionId: `s-${answer.session}`,
      seq: index,
      at: answer.at,
      day: dayOfNumber(BASE + answer.dayOffset),
      lessonId: answer.lesson,
      skillId:
        answer.lesson === 'a5' && answer.second
          ? 'phonics.s.single'
          : (SKILL_OF[answer.lesson] ?? 'phonics.gone.skill'),
      stage: answer.stage,
      tryIndex: answer.tryIndex,
      hintLevel: answer.hintLevel,
      assistance: answer.assistance,
      outcome: answer.outcome,
      challengeId: `${answer.lesson}.c${answer.challenge}`,
      variant: answer.variant,
    }),
  ),
);
const anyFinished = fc.subarray([...LESSONS, 'gone-01']);
const anyToday = fc.integer({ min: -45, max: 50 }).map((offset) => dayOfNumber(BASE + offset));
const anyStart = fc.option(fc.constantFrom(...(GRAPH.worlds[0]?.lessons ?? []), 'gone-01'), {
  nil: undefined,
});
const anyShare = fc.constantFrom(0, 0.3, 0.7, 1);

const BEFORE_KINDS = ['again', 'practice', 'missed', 'review', 'free'];

describe('for any record', () => {
  it('there is always something to play in every world, it is in that world, and it says why', () => {
    fc.assert(
      fc.property(
        anyRecord,
        anyFinished,
        anyToday,
        anyStart,
        anyShare,
        (attempts, finished, today, start, share) => {
          const advice = ask({
            attempts,
            finished,
            today,
            ...(start === undefined ? {} : { startAt: { 'reading-cove': start } }),
            policy: { ...DEFAULT_PLAY_POLICY, beforeShare: share },
          });
          for (const world of GRAPH.worlds) {
            const offered = advice.byWorld[world.id];
            expect(offered).toBeDefined();
            expect(world.lessons).toContain(offered?.lessonId);
            expect(offered?.world).toBe(world.id);
            expect(offered?.reasons.length).toBeGreaterThan(0);
          }
          // Where Glim points is one of them, the very same.
          expect(advice.top).not.toBeNull();
          expect(Object.values(advice.byWorld)).toContain(advice.top);
        },
      ),
      { numRuns: 400 },
    );
  });

  it('what is new has not been finished, and what was played before has', () => {
    fc.assert(
      fc.property(
        anyRecord,
        anyFinished,
        anyToday,
        anyShare,
        (attempts, finished, today, share) => {
          const advice = ask({
            attempts,
            finished,
            today,
            policy: { ...DEFAULT_PLAY_POLICY, beforeShare: share },
          });
          for (const offered of [...Object.values(advice.byWorld), ...advice.due]) {
            expect(finished.includes(offered.lessonId)).toBe(BEFORE_KINDS.includes(offered.kind));
          }
        },
      ),
      { numRuns: 400 },
    );
  });

  it('nothing is due again on a day it was played, however often it was played that day', () => {
    fc.assert(
      fc.property(anyRecord, anyFinished, (attempts, finished) => {
        for (const answer of attempts) {
          const advice = ask({ attempts, finished, today: answer.day });
          expect(advice.due.map((each) => each.lessonId)).not.toContain(answer.lessonId);
          const offered = advice.byWorld[GRAPH.lessons[answer.lessonId]?.world ?? 'music-lab'];
          if (offered && offered.lessonId === answer.lessonId) {
            // Offered on the day it was played only as something not yet finished, or when there is nothing else.
            expect(['new', 'reach', 'free']).toContain(offered.kind);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('the answer is the same whatever order the record is in', () => {
    fc.assert(
      fc.property(
        anyRecord,
        anyFinished,
        anyToday,
        fc.integer(),
        (attempts, finished, today, seed) => {
          const shuffled =
            fc.sample(fc.shuffledSubarray(attempts, { minLength: attempts.length }), {
              seed,
              numRuns: 1,
            })[0] ?? [];
          expect(
            ask({ attempts: [...shuffled, ...attempts.slice(0, 5)], finished, today }),
          ).toEqual(ask({ attempts, finished, today }));
        },
      ),
      { numRuns: 300 },
    );
  });

  it('answers given with help never make something new ready, and never make something a review', () => {
    fc.assert(
      fc.property(anyRecord, anyFinished, anyToday, (attempts, finished, today) => {
        const helpedOnly = attempts.map((answer) =>
          answer.stage === 'independent' &&
          answer.tryIndex === 0 &&
          answer.hintLevel === 0 &&
          answer.assistance === 'none'
            ? { ...answer, assistance: 'adult' as const }
            : answer,
        );
        const advice = ask({ attempts: helpedOnly, finished, today });
        for (const offered of [...Object.values(advice.byWorld), ...advice.due]) {
          expect(['practice', 'missed', 'review']).not.toContain(offered.kind);
          for (const each of offered.reasons) {
            if (each.why === 'builds-on') expect(each.shown).toBe(false);
          }
        }
      }),
      { numRuns: 300 },
    );
  });
});

describe('a world a grown-up has left out of where Glim points', () => {
  it('is never where Glim points, and still has its own Play', () => {
    const advice = ask({ leftOut: ['reading-cove'] });
    expect(advice.top).toMatchObject({ world: 'number-garden', lessonId: 'b1' });
    // Nothing is closed and nothing is counted done: the world's page offers what it would have.
    expect(advice.byWorld['reading-cove']).toEqual(ask({}).byWorld['reading-cove']);
  });

  it('leaves Glim pointing nowhere when every world is left out', () => {
    const advice = ask({ leftOut: ['reading-cove', 'number-garden'] });
    expect(advice.top).toBeNull();
    expect(Object.keys(advice.byWorld).sort()).toEqual(['number-garden', 'reading-cove']);
  });

  it('changes nothing else that is offered, whatever the record holds', () => {
    fc.assert(
      fc.property(anyRecord, anyFinished, anyToday, (attempts, finished, today) => {
        const all = advise({ graph: GRAPH, attempts, finished: new Set(finished), today });
        const some = advise({
          graph: GRAPH,
          attempts,
          finished: new Set(finished),
          today,
          leftOut: ['number-garden'],
        });
        expect(some.byWorld).toEqual(all.byWorld);
        expect(some.due).toEqual(all.due);
        expect(some.top?.world).not.toBe('number-garden');
        // Where Glim pointed at a world that is still included, it points there still.
        if (all.top?.world === 'reading-cove') expect(some.top).toEqual(all.top);
      }),
    );
  });
});
