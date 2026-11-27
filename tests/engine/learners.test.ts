import { writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_PLAY_POLICY, type EvidenceStatus } from '@/engine';
import {
  HIGH_PERFORMER,
  INCONSISTENT,
  LEARNERS,
  NOVICE,
  RAPID_GUESSER,
  UNSTEADY_HAND,
  everything,
  simulate,
  summarize,
  type Content,
  type Simulation,
  type Summary,
} from '../helpers/learners';

/**
 * Five made-up learners play the real game for six weeks: the real lessons, the real rules for what counts, and
 * whatever Glim points at next. None of them is a child, and nothing here is a finding about children. They are
 * here to show what the rules do with five kinds of answering, so that the numbers in the rules can be looked at,
 * and so that a change to the rules that would call a guesser independent, or keep a beginner on one thing, or
 * send someone round and round what they cannot do, fails here.
 */

const DAYS = 42;
const A_DAY = 4;
const SEEDS = [1, 2];
const INDEPENDENT: readonly EvidenceStatus[] = [
  'provisionally-independent',
  'consistently-independent',
];

let content: Content;
const runs = new Map<string, { simulation: Simulation; summary: Summary }[]>();
const of = (name: string) => runs.get(name) ?? [];

beforeAll(async () => {
  content = await everything();
  for (const learner of LEARNERS) {
    runs.set(
      learner.name,
      SEEDS.map((seed) => {
        const simulation = simulate(content, learner, { days: DAYS, perDay: A_DAY, seed });
        return { simulation, summary: summarize(simulation, content.lessons.size) };
      }),
    );
  }
  // For the documents: `LEARNERS_OUT=<file> npx vitest run tests/engine/learners.test.ts` writes the table.
  const out = process.env.LEARNERS_OUT;
  if (out !== undefined) {
    const rows = LEARNERS.flatMap((learner) =>
      of(learner.name).map(({ summary }, index) => ({ seed: SEEDS[index], ...summary })),
    );
    writeFileSync(out, JSON.stringify(rows, null, 1));
  }
}, 300_000);

describe('whoever is playing', () => {
  it('is offered something every time, from the game there is, and plays it to the end', () => {
    for (const learner of LEARNERS) {
      for (const { simulation, summary } of of(learner.name)) {
        expect(summary.sittings, learner.name).toBe(DAYS * A_DAY);
        for (const sitting of simulation.played) {
          expect(content.lessons.has(sitting.lessonId)).toBe(true);
        }
      }
    }
  });

  it('is never offered an activity twice in a day while there is anything else to offer', () => {
    for (const learner of LEARNERS) {
      for (const { simulation } of of(learner.name)) {
        for (let day = 0; day < DAYS; day++) {
          const today = simulation.played.filter((sitting) => sitting.day === day);
          const again = today.filter(
            (sitting, index) =>
              today.findIndex((other) => other.lessonId === sitting.lessonId) !== index,
          );
          // The only way to be offered one again is for everything to be finished and nothing to be due.
          for (const sitting of again) expect(sitting.kind, learner.name).toBe('free');
        }
      }
    }
  });

  it('is taken back to what went badly no more than once a day, while there is anything new to offer', () => {
    const allowed = DEFAULT_PLAY_POLICY.troublePerDay;
    for (const learner of LEARNERS) {
      for (const { simulation, summary } of of(learner.name)) {
        // (Once everything is finished, someone for whom everything goes badly has nothing else to be offered.)
        const until = (summary.allFinishedOn ?? DAYS + 1) - 1;
        for (let day = 0; day < Math.min(DAYS, until); day++) {
          const trouble = simulation.played.filter(
            (sitting) =>
              sitting.day === day && (sitting.kind === 'again' || sitting.kind === 'missed'),
          );
          expect(trouble.length, `${learner.name}, day ${String(day)}`).toBeLessThanOrEqual(
            allowed,
          );
        }
      }
    }
  });

  it('meets new things all the way through: never three days running with nothing new while anything is unfinished', () => {
    for (const learner of LEARNERS) {
      for (const { simulation, summary } of of(learner.name)) {
        const until = summary.allFinishedOn ?? DAYS;
        let without = 0;
        for (let day = 0; day < until - 1; day++) {
          const fresh = simulation.played.some(
            (sitting) =>
              sitting.day === day && (sitting.kind === 'new' || sitting.kind === 'reach'),
          );
          without = fresh ? 0 : without + 1;
          expect(without, `${learner.name}, day ${String(day)}`).toBeLessThan(3);
        }
      }
    }
  });

  it('is not kept on one thing: while anything is unfinished, no activity is played more than about once a week', () => {
    for (const learner of LEARNERS) {
      for (const { simulation, summary } of of(learner.name)) {
        const until = summary.allFinishedOn ?? DAYS + 1;
        const times = new Map<string, number>();
        for (const sitting of simulation.played) {
          if (sitting.day + 1 >= until) continue;
          times.set(sitting.lessonId, (times.get(sitting.lessonId) ?? 0) + 1);
        }
        expect(Math.max(0, ...times.values()), learner.name).toBeLessThanOrEqual(
          Math.ceil(DAYS / 7) + 2,
        );
        // And never, even when everything is finished and little of it went well, more than every third day.
        expect(summary.mostRepeats, learner.name).toBeLessThanOrEqual(DAYS / 3);
      }
    }
  });
});

describe('someone who answers nearly everything rightly', () => {
  it('has finished every activity inside six weeks at four a day, and most skills are independent across days', () => {
    for (const { summary } of of(HIGH_PERFORMER.name)) {
      expect(summary.finished).toBe(content.lessons.size);
      expect(summary.allFinishedOn).not.toBeNull();
      expect(summary.atEnd['consistently-independent']).toBeGreaterThanOrEqual(45);
      expect(summary.atEnd.exploring + summary.atEnd.guided).toBeLessThanOrEqual(2);
      // Right nearly every time they were asked alone.
      expect(summary.firstTriesRight / summary.firstTriesAlone).toBeGreaterThan(0.93);
    }
  });
});

describe('someone who knows little at first and learns by meeting things', () => {
  it('gets through everything too, and ends with most of what they have met done alone', () => {
    for (const { summary } of of(NOVICE.name)) {
      expect(summary.finished).toBeGreaterThanOrEqual(content.lessons.size - 6);
      const alone =
        summary.atEnd.practicing +
        summary.atEnd['provisionally-independent'] +
        summary.atEnd['consistently-independent'];
      expect(alone).toBeGreaterThanOrEqual(60);
      expect(summary.atEnd['consistently-independent']).toBeGreaterThanOrEqual(30);
    }
  });
});

describe('someone who taps at once without looking', () => {
  it('is never called independent at anything that cannot be done by luck', () => {
    for (const { simulation } of of(RAPID_GUESSER.name)) {
      for (const statuses of simulation.daily) {
        for (const [skillId, status] of statuses) {
          if ((content.graph.skills[skillId]?.chance ?? 0) > 0.01) continue;
          expect(INDEPENDENT.includes(status), skillId).toBe(false);
        }
      }
    }
  });

  it('is called independent on very few of the days of the skills they have met, and across days on fewer', () => {
    for (const { simulation } of of(RAPID_GUESSER.name)) {
      let met = 0;
      let independent = 0;
      let acrossDays = 0;
      for (const statuses of simulation.daily) {
        for (const status of statuses.values()) {
          if (status === 'not-yet-observed') continue;
          met += 1;
          if (INDEPENDENT.includes(status)) independent += 1;
          if (status === 'consistently-independent') acrossDays += 1;
        }
      }
      expect(met).toBeGreaterThan(1000);
      expect(independent / met).toBeLessThan(0.04);
      expect(acrossDays / met).toBeLessThan(0.02);
    }
  });

  it('is hardly ever called independent where there are two things to choose from, though half their taps are right', () => {
    // Eight of them, for a month each: with questions like these a few lucky days would hide in a smaller crowd.
    let met = 0;
    let independent = 0;
    let acrossDays = 0;
    for (let seed = 11; seed <= 18; seed++) {
      const { daily } = simulate(content, RAPID_GUESSER, { days: 30, perDay: A_DAY, seed });
      for (const statuses of daily) {
        for (const [skillId, status] of statuses) {
          if (
            (content.graph.skills[skillId]?.chance ?? 0) < 0.45 ||
            status === 'not-yet-observed'
          ) {
            continue;
          }
          met += 1;
          if (INDEPENDENT.includes(status)) independent += 1;
          if (status === 'consistently-independent') acrossDays += 1;
        }
      }
    }
    expect(met).toBeGreaterThan(1000);
    // Forty such months were read both ways (docs/QUALITY_REPORT.md): without the rule about luck these
    // skills were called independent on nearly ten days in a hundred, and "across days" on two of them; with
    // it, on two in a hundred, and "across days" on three in ten thousand.
    expect(independent / met).toBeLessThan(0.05);
    expect(acrossDays / met).toBeLessThan(0.01);
  });

  it('is right alone about as often as chance has it, and the record shows most of what they met as not yet done alone or only practising', () => {
    for (const { summary } of of(RAPID_GUESSER.name)) {
      expect(summary.firstTriesRight / summary.firstTriesAlone).toBeLessThan(0.4);
      expect(summary.atEnd['consistently-independent']).toBeLessThanOrEqual(2);
      expect(summary.atEnd['provisionally-independent']).toBeLessThanOrEqual(4);
    }
  });

  it('still meets everything: nothing is locked, and what builds on a thing not done is offered when nothing else is', () => {
    for (const { simulation, summary } of of(RAPID_GUESSER.name)) {
      expect(summary.finished).toBeGreaterThanOrEqual(content.lessons.size - 6);
      expect(simulation.played.some((sitting) => sitting.kind === 'reach')).toBe(true);
    }
  });
});

describe('someone who knows it one day and not the next', () => {
  it('is shown as practising at more, and as independent across days at fewer, than someone steady', () => {
    const steady = of(HIGH_PERFORMER.name)[0]?.summary;
    for (const { summary } of of(INCONSISTENT.name)) {
      expect(summary.atEnd['consistently-independent']).toBeLessThan(
        steady?.atEnd['consistently-independent'] ?? 0,
      );
      expect(summary.atEnd.practicing).toBeGreaterThan(steady?.atEnd.practicing ?? 99);
    }
  });
});

describe('someone who knows nearly everything, and whose finger lands elsewhere one time in four', () => {
  it('is shown as knowing less than they do: the record cannot tell a finger that missed from not knowing', () => {
    // This is a limit of the record, written down so that it is known, and so that a change that made it worse
    // would show. A grown-up who sees it can say they are helping, and can see every first try that was not right.
    const steady = of(HIGH_PERFORMER.name)[0]?.summary;
    for (const { summary } of of(UNSTEADY_HAND.name)) {
      const right = summary.firstTriesRight / summary.firstTriesAlone;
      expect(right).toBeGreaterThan(0.62);
      expect(right).toBeLessThan(0.8);
      expect(summary.shareOfDaysIndependent).toBeLessThan(steady?.shareOfDaysIndependent ?? 0);
      // But they are not shut out: a good share of what they have met is called independent.
      expect(
        summary.atEnd['provisionally-independent'] + summary.atEnd['consistently-independent'],
      ).toBeGreaterThanOrEqual(25);
      expect(summary.finished).toBeGreaterThanOrEqual(content.lessons.size - 6);
    }
  });
});
