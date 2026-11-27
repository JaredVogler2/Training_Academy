import { hasPack, loadPack } from '@/content';
import {
  WORLD_IDS,
  advanceDemo,
  createRng,
  createSession,
  getHint,
  getNextChallenge,
  getSkillEvidence,
  hashString,
  judgeTask,
  keptBy,
  submitAttempt,
  type Attempt,
  type ChallengeView,
  type ContentPack,
  type EvidenceStatus,
  type Lesson,
  type Rng,
} from '@/engine';
import { dayNumber, dayOfNumber } from '@/engine/days';
import { graphOf, type ConceptGraph } from '@/engine/graph';
import {
  DEFAULT_PLAY_POLICY,
  advise,
  type PlayPolicy,
  type SuggestionKind,
} from '@/engine/recommend';
import { answerTo, wrongAnswerTo } from './content';

/**
 * Made-up learners, for trying the whole of it on: the real lessons, the real rules for what counts, the real
 * choice of what to offer next, over weeks of made-up days. Each is a rule for what to do with one question.
 * None is a model of a child, and nothing found with them is a finding about children: they show what the rules
 * do with a kind of answering, so that the numbers in the rules can be looked at and changed.
 */

export interface LearnerState {
  /** How likely they are to know the answer to a question of each skill, from none to certain. */
  know: Map<string, number>;
  /** The day it is, counted from the first. */
  day: number;
  rng: Rng;
}

export interface Learner {
  name: string;
  /** How likely they are to know a skill they have never met. */
  starts: number;
  /** How much one more question of a skill, shown or asked, adds to that. */
  learns: number;
  /** As much as they ever come to know. */
  ceiling: number;
  /** How likely they are to know it today: for someone whose days differ. */
  today?: (day: number, known: number) => number;
  /** How often a finger lands on something other than what was meant. */
  slips: number;
  /** How often, not knowing, they ask for help before answering. */
  asksForHelp: number;
  /** True for someone who taps at once without looking: never knows, never asks. */
  guesses?: boolean;
}

/** Answers nearly everything rightly from the start. */
export const HIGH_PERFORMER: Learner = {
  name: 'high performer',
  starts: 0.97,
  learns: 0,
  ceiling: 0.97,
  slips: 0,
  asksForHelp: 0,
};

/** Knows little of anything at first, and comes to know each thing by meeting it. */
export const NOVICE: Learner = {
  name: 'novice',
  starts: 0.2,
  learns: 0.07,
  ceiling: 0.92,
  slips: 0.02,
  asksForHelp: 0.5,
};

/** Taps something at once, every time. */
export const RAPID_GUESSER: Learner = {
  name: 'rapid guesser',
  starts: 0,
  learns: 0,
  ceiling: 0,
  slips: 0,
  asksForHelp: 0,
  guesses: true,
};

/** Knows it on one day and not on the next. */
export const INCONSISTENT: Learner = {
  name: 'inconsistent learner',
  starts: 0.6,
  learns: 0.03,
  ceiling: 0.9,
  today: (day, known) => (day % 2 === 0 ? known : known * 0.4),
  slips: 0.02,
  asksForHelp: 0.2,
};

/** Knows nearly everything, and one tap in four lands somewhere else. */
export const UNSTEADY_HAND: Learner = {
  name: 'reduced motor control',
  starts: 0.95,
  learns: 0,
  ceiling: 0.95,
  slips: 0.25,
  asksForHelp: 0,
};

export const LEARNERS = [NOVICE, RAPID_GUESSER, HIGH_PERFORMER, INCONSISTENT, UNSTEADY_HAND];

type Move = { type: 'answer'; response: string } | { type: 'hint' };

/**
 * A wrong answer that the thing shown can be given. (The one the other tests use for a robot's plan is a turn,
 * which a plan of nothing but steps forward cannot hold.)
 */
function wrongFor(view: ChallengeView): string | null {
  const { challenge } = view;
  if (challenge.kind === 'choose-one') return wrongAnswerTo(view);
  const { task } = challenge;
  const tries = [wrongAnswerTo(view)];
  if (task.type === 'program') {
    const parts = task.solution.split('-');
    const times = parts[0]?.startsWith('x') ? [parts[0]] : [];
    const commands = parts.slice(times.length);
    // One step short; one step over; and the first command alone.
    tries.push([...times, ...commands.slice(0, -1)].join('-'));
    tries.push([...times, ...commands, commands.at(-1) ?? 'f'].join('-'));
    tries.push(commands[0] ?? 'f');
  }
  for (const each of tries) {
    if (each === null || each === '') continue;
    const judged = judgeTask(task, each);
    if (judged !== null && !judged.correct) return each;
  }
  return null;
}

/** Any answer that can be given to what is shown, chosen without looking. */
function blindAnswer(view: ChallengeView, rng: Rng): string {
  if (view.challenge.kind === 'choose-one') {
    const open = view.choices.filter((choice) => choice.available);
    return open[rng.int(open.length)]?.choice.id ?? answerTo(view);
  }
  const { task } = view.challenge;
  if (view.shownAnswer !== null) return answerTo(view);
  const any = <T>(from: readonly T[]): T => from[rng.int(from.length)] as T;
  switch (task.type) {
    case 'pairs': {
      // Two cards still down are turned over at random, and nothing is remembered, until every pair is found.
      let left = task.cards.length;
      let turns = 0;
      while (left > 0) {
        turns += 1;
        if (rng.int(2 * left - 1) === 0) left -= 1;
      }
      return String(Math.min(99, turns));
    }
    case 'give':
      return String(1 + rng.int(task.pile));
    case 'order':
      return rng.shuffle(task.cards.map((card) => card.id)).join('-');
    case 'echo':
      return task.solution.map(() => any(task.cards).id).join('-');
    case 'recall': {
      const way = any(task.ways);
      return `${way.way}-${any(way.choices)}`;
    }
    case 'design':
      return task.controls.map((control) => any(control.options)).join('-');
    case 'tune':
      return Array.from({ length: task.length }, () => any(task.notes)).join('-');
    case 'select':
    case 'program':
    case 'beat':
      // A handful picked, a plan made or a beat kept without looking is right so seldom that it is taken as
      // never: something wrong is given.
      return wrongFor(view) ?? answerTo(view);
  }
}

function moveOf(learner: Learner, state: LearnerState, view: ChallengeView): Move {
  const { rng } = state;
  if (learner.guesses) return { type: 'answer', response: blindAnswer(view, rng) };
  const known = state.know.get(view.challenge.skillId) ?? learner.starts;
  const today = learner.today ? learner.today(state.day, known) : known;
  // Once the answer is being shown, or after a wrong try, anyone can give it.
  const knows = view.shownAnswer !== null || view.tryIndex > 0 || rng.next() < today;
  if (!knows) {
    if (view.hintsUsed < view.hintsAvailable && rng.next() < learner.asksForHelp) {
      return { type: 'hint' };
    }
    return { type: 'answer', response: blindAnswer(view, rng) };
  }
  if (rng.next() < learner.slips) {
    return { type: 'answer', response: wrongFor(view) ?? answerTo(view) };
  }
  return { type: 'answer', response: answerTo(view) };
}

export interface Content {
  packs: ContentPack[];
  graph: ConceptGraph;
  lessons: Map<string, { lesson: Lesson; contentVersion: number }>;
}

export async function everything(): Promise<Content> {
  const packs = await Promise.all(WORLD_IDS.filter(hasPack).map((world) => loadPack(world)));
  const lessons = new Map(
    packs.flatMap((pack) =>
      pack.lessons.map((lesson) => [lesson.id, { lesson, contentVersion: pack.contentVersion }]),
    ),
  );
  return { packs, graph: graphOf(packs), lessons };
}

export interface Played {
  day: number;
  lessonId: string;
  kind: SuggestionKind;
  /** First tries alone in this sitting, and how many of them were right. */
  alone: number;
  right: number;
}

export interface Simulation {
  learner: string;
  played: Played[];
  attempts: Attempt[];
  finished: Set<string>;
  /** What the record said of every skill at the end of each day. */
  daily: Map<string, EvidenceStatus>[];
  lastDay: string;
}

export const FIRST_DAY = '2026-11-02';
const MINUTE = 60_000;

export interface SimulationOptions {
  days: number;
  /** How many activities are played on a day that is played on. */
  perDay: number;
  seed: number;
  /** Which days are played on: every day unless this says otherwise. */
  plays?: (day: number) => boolean;
  policy?: PlayPolicy;
}

/** One made-up learner, playing whatever Glim points at, for so many days. */
export function simulate(
  content: Content,
  learner: Learner,
  options: SimulationOptions,
): Simulation {
  const { graph, lessons } = content;
  const policy = options.policy ?? DEFAULT_PLAY_POLICY;
  const rng = createRng(hashString(`${learner.name}|${String(options.seed)}`));
  const state: LearnerState = { know: new Map(), day: 0, rng };
  const attempts: Attempt[] = [];
  const finished = new Set<string>();
  const played: Played[] = [];
  const daily: Map<string, EvidenceStatus>[] = [];
  const kept = new Map<string, { challengeId: string; at: number; day: string }>();
  const first = dayNumber(FIRST_DAY) ?? 0;
  let sittings = 0;

  const meet = (skillId: string) => {
    const known = state.know.get(skillId) ?? learner.starts;
    state.know.set(skillId, Math.min(learner.ceiling, known + learner.learns));
  };

  for (let day = 0; day < options.days; day++) {
    state.day = day;
    const today = dayOfNumber(first + day);
    if (options.plays?.(day) ?? true) {
      for (let turn = 0; turn < options.perDay; turn++) {
        const pick = advise({ graph, attempts, finished, today, policy }).top;
        if (!pick) break;
        const found = lessons.get(pick.lessonId);
        if (!found) throw new Error(`Offered an activity there is not: ${pick.lessonId}`);
        const { lesson, contentVersion } = found;
        // Nine in the morning, and a quarter of an hour for each activity.
        let now = (first + day) * 24 * 60 * MINUTE + 9 * 60 * MINUTE + turn * 15 * MINUTE;
        sittings += 1;
        const before = kept.get(lesson.id);
        let session = createSession(lesson, {
          id: `sim-${String(sittings)}`,
          profileId: 'p-sim',
          seed: hashString(`${learner.name}|${String(options.seed)}|${String(sittings)}`),
          now,
          contentVersion,
          day: today,
          ...(before ? { kept: before } : {}),
        });
        const sitting: Played = { day, lessonId: lesson.id, kind: pick.kind, alone: 0, right: 0 };
        for (let moves = 0; moves < 2000; moves++) {
          const view = getNextChallenge(session, lesson);
          if (!view) break;
          now += 4000;
          if (view.stage === 'demo') {
            meet(view.challenge.skillId);
            session = advanceDemo(session, lesson, now);
            continue;
          }
          const move = moveOf(learner, state, view);
          if (move.type === 'hint') {
            session = getHint(session, lesson, now).session;
            continue;
          }
          const result = submitAttempt(session, lesson, {
            key: view.key,
            response: move.response,
            now,
            day: today,
            durationMs: learner.guesses ? 400 : 3000,
          });
          if (!result.accepted) {
            const what = view.challenge.kind === 'make' ? view.challenge.task.type : 'choose-one';
            throw new Error(
              `Move rejected (${result.reason}): ${lesson.id} ${view.challenge.id} ${what} "${move.response}" try ${String(view.tryIndex)}`,
            );
          }
          session = result.session;
          attempts.push(result.attempt);
          const answered = result.attempt;
          if (
            answered.stage === 'independent' &&
            answered.tryIndex === 0 &&
            answered.hintLevel === 0
          ) {
            sitting.alone += 1;
            if (answered.outcome === 'correct') sitting.right += 1;
          }
          if (result.feedback.next !== 'retry') meet(view.challenge.skillId);
        }
        if (session.status !== 'completed') throw new Error(`Not finished: ${lesson.id}`);
        finished.add(lesson.id);
        const keptId = keptBy(session, lesson);
        if (keptId !== null) kept.set(lesson.id, { challengeId: keptId, at: now, day: today });
        else kept.delete(lesson.id);
        played.push(sitting);
      }
    }
    const statuses = new Map<string, EvidenceStatus>();
    for (const [skillId, skill] of Object.entries(graph.skills)) {
      statuses.set(
        skillId,
        getSkillEvidence(attempts, skillId, policy.evidence, skill.chance).status,
      );
    }
    daily.push(statuses);
  }
  return {
    learner: learner.name,
    played,
    attempts,
    finished,
    daily,
    lastDay: dayOfNumber(first + options.days - 1),
  };
}

const INDEPENDENT: readonly EvidenceStatus[] = [
  'provisionally-independent',
  'consistently-independent',
];

export interface Summary {
  learner: string;
  sittings: number;
  finished: number;
  /** The first day (counted from one) by the end of which every activity had been finished, if there was one. */
  allFinishedOn: number | null;
  newOnes: number;
  before: number;
  /** The most times any one activity was played. */
  mostRepeats: number;
  /** Skills by what the record said of them on the last day. */
  atEnd: Record<EvidenceStatus, number>;
  /** Skills the record ever called independent (so far, or across days), and ever called independent across days. */
  everIndependent: number;
  everConsistent: number;
  /** Of all the days of all the skills, the share on which the record called the skill independent. */
  shareOfDaysIndependent: number;
  firstTriesAlone: number;
  firstTriesRight: number;
}

export function summarize(simulation: Simulation, total: number): Summary {
  const { played, daily } = simulation;
  const counts = new Map<string, number>();
  for (const each of played) counts.set(each.lessonId, (counts.get(each.lessonId) ?? 0) + 1);
  const atEnd: Record<EvidenceStatus, number> = {
    'not-yet-observed': 0,
    exploring: 0,
    guided: 0,
    practicing: 0,
    'provisionally-independent': 0,
    'consistently-independent': 0,
  };
  for (const status of daily.at(-1)?.values() ?? []) atEnd[status] += 1;
  const ever = new Set<string>();
  const everConsistent = new Set<string>();
  let independentDays = 0;
  let skillDays = 0;
  for (const statuses of daily) {
    for (const [skillId, status] of statuses) {
      skillDays += 1;
      if (INDEPENDENT.includes(status)) {
        independentDays += 1;
        ever.add(skillId);
      }
      if (status === 'consistently-independent') everConsistent.add(skillId);
    }
  }
  const seen = new Set<string>();
  let allFinishedOn: number | null = null;
  for (const each of played) {
    seen.add(each.lessonId);
    if (seen.size === total && allFinishedOn === null) allFinishedOn = each.day + 1;
  }
  const fresh = played.filter((each) => each.kind === 'new' || each.kind === 'reach').length;
  return {
    learner: simulation.learner,
    sittings: played.length,
    finished: simulation.finished.size,
    allFinishedOn,
    newOnes: fresh,
    before: played.length - fresh,
    mostRepeats: Math.max(0, ...counts.values()),
    atEnd,
    everIndependent: ever.size,
    everConsistent: everConsistent.size,
    shareOfDaysIndependent: skillDays === 0 ? 0 : independentDays / skillDays,
    firstTriesAlone: played.reduce((sum, each) => sum + each.alone, 0),
    firstTriesRight: played.reduce((sum, each) => sum + each.right, 0),
  };
}
