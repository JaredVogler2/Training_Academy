import { DEFAULT_EVIDENCE_POLICY, type EvidencePolicy } from './evidence';
import type { ConceptGraph } from './graph';
import { dayNumber } from './days';
import {
  DEFAULT_REVIEW_POLICY,
  attemptsBySkill,
  daysAgo,
  getSkillReview,
  type ReviewBasis,
  type ReviewPolicy,
  type SkillReview,
} from './review';
import type { Attempt, WorldId } from './schema';

/**
 * What to offer next, and why.
 *
 * It is a suggestion and nothing more: it is where the big Play button goes and where Glim points. Every activity
 * stays open on its world's page whatever is suggested, and nothing here is ever locked, hidden or taken away.
 *
 * There are two piles. **Played before, and due again**: an activity that has been finished and whose skills it
 * is time to come back to (see `review.ts`), the one that has waited longest first. **New**: the first activity
 * not yet finished whose skills build on things already done alone; one that builds on something not yet done
 * alone is passed over for the moment, and offered only when nothing else is.
 *
 * The two are mixed: of any ten activities in a row, about seven are ones played before, for as long as any are
 * due, and the rest are new. It is reckoned over the last activities played, on whatever days, so that someone
 * who plays one a day meets new things as surely as someone who plays six. Nothing is offered again on the day
 * it was played. And of the things played before, no more than one a day is one that went badly last time (never
 * yet done alone, or last ended with a first try alone that was not right): a day's first is something that went
 * well when there is one, and nobody is taken from one trouble straight to the next. The numbers are in the
 * policy, to be changed and looked at; they are a product choice, not a finding.
 *
 * Everything is worked out from the record, the day it is today, and the graph. Nothing here reads a clock, and
 * the same three things give the same answer on any device.
 */

export interface PlayPolicy {
  /**
   * Of the activities played, the share Play aims to make ones played before and due again, for as long as any
   * are due. None: something played before is offered only when nothing new is ready. One: everything due comes
   * before anything new.
   */
  beforeShare: number;
  /** How many activities in a row that share is reckoned over: the one being chosen, and those before it. */
  mixOver: number;
  /**
   * How many activities a day may be ones that went badly last time. The rest of what is due waits for another
   * day, unless there is nothing else at all to offer.
   */
  troublePerDay: number;
  review: ReviewPolicy;
  evidence: EvidencePolicy;
}

export const DEFAULT_PLAY_POLICY: PlayPolicy = {
  beforeShare: 0.7,
  mixOver: 10,
  troublePerDay: 1,
  review: DEFAULT_REVIEW_POLICY,
  evidence: DEFAULT_EVIDENCE_POLICY,
};

export type SuggestionKind =
  /** Not finished yet, and everything it builds on has been done alone (or it builds on nothing). */
  | 'new'
  /** Not finished yet; something it builds on has not been done alone. Offered because nothing else is ready. */
  | 'reach'
  /** Finished, with help every time: another go, on another day, with different questions. */
  | 'again'
  /** Done alone before, not yet on separate days: due again. */
  | 'practice'
  /** Done alone before, and the latest first try alone was not right. */
  | 'missed'
  /** Independent across days: due to be looked at again. */
  | 'review'
  /** Everything finished and nothing due: the one played longest ago. */
  | 'free';

export type Reason =
  /** Nothing has been played in this world yet. */
  | { why: 'begins-here' }
  /** The first activity not yet finished. */
  | { why: 'next-in-order' }
  /** Where a grown-up chose for Play to begin in this world. */
  | { why: 'chosen-start' }
  /** Something it builds on, and whether the record shows it done alone. `taken` is on a grown-up's word. */
  | { why: 'builds-on'; skill: string; shown: boolean; taken: boolean }
  | { why: 'builds-on-nothing' }
  /** An activity earlier in the order was passed over for now: it builds on a skill not yet done alone. */
  | { why: 'passed-over'; lesson: string; skill: string }
  /** It builds on something not yet done alone, and is offered all the same: nothing else here is ready. */
  | { why: 'nothing-else-ready' }
  /** A skill it is time to come back to. */
  | {
      why: 'due';
      skill: string;
      basis: ReviewBasis;
      lastDay: string | null;
      daysSince: number | null;
      waitDays: number;
    }
  /** Of the last activities played, how many had been played before and how many were new, and which pile that pointed to. */
  | { why: 'mix'; before: number; fresh: number; share: number; chose: 'before' | 'fresh' }
  /** No activity here is unfinished and ready. */
  | { why: 'nothing-new' }
  /** Nothing played before is due again. */
  | { why: 'nothing-due' }
  /** Something that went badly last time is due, and one of those a day is enough. */
  | { why: 'one-a-day' }
  | { why: 'longest-ago'; lastDay: string | null }
  /** Days in the record are after today: the device's calendar has moved. */
  | { why: 'calendar-in-doubt' };

export interface Suggestion {
  lessonId: string;
  world: WorldId;
  kind: SuggestionKind;
  /** Why, in a form the grown-ups' page puts into words. Never empty. */
  reasons: Reason[];
}

export interface Advice {
  today: string;
  /** What Play offers in each world that has anything to play. */
  byWorld: Partial<Record<WorldId, Suggestion>>;
  /** The one Glim points at among the worlds the grown-up includes. */
  top: Suggestion | null;
  /** Everything played before that is due again, in every world, the longest-waiting first. */
  due: Suggestion[];
  /**
   * Today so far: activities played that had been played before, ones played for the first time, and how many
   * of those played before were ones that had gone badly the last time.
   */
  day: { before: number; fresh: number; trouble: number };
  /** The last activities played, on whatever days, as the mix counts them: played before, and new. */
  recent: { before: number; fresh: number };
  calendarInDoubt: boolean;
}

export interface AdviseInput {
  graph: ConceptGraph;
  /** Every answer recorded for one player, in any order. */
  attempts: readonly Attempt[];
  /** The activities that player has finished at least once. */
  finished: ReadonlySet<string>;
  /** The local calendar day it is, `YYYY-MM-DD`. */
  today: string;
  /** Where a grown-up has chosen for Play to begin, by world. */
  startAt?: Partial<Record<WorldId, string>>;
  leftOut?: readonly WorldId[];
  policy?: PlayPolicy;
}

interface Played {
  /** Every day it was played on, by the number of the day, with how long ago that was where today can vouch. */
  days: Map<number, number | null>;
  today: boolean;
  before: boolean;
  /** Days since it was last played, as far as today can vouch; `null` if no day recorded can be counted from. */
  ago: number | null;
  lastDay: string | null;
}

interface Candidate {
  suggestion: Suggestion;
  /** It went badly last time: never yet done alone, or last ended with a first try alone that was not right. */
  trouble: boolean;
  /** Days past due of the skill that has waited longest. */
  overdue: number;
  rank: number;
  world: number;
  index: number;
}

/** An activity that has been finished, and how long ago it was played: longer than any number where no day is known. */
interface Resting extends Candidate {
  ago: number;
}

const BASIS_ORDER: readonly ReviewBasis[] = [
  'missed-last',
  'not-yet-alone',
  'practicing',
  'provisional',
  'consistent',
];
const KIND_OF: Record<ReviewBasis, SuggestionKind> = {
  'not-yet-observed': 'new',
  'not-yet-alone': 'again',
  'missed-last': 'missed',
  practicing: 'practice',
  provisional: 'practice',
  consistent: 'review',
};
const KIND_RANK: Record<SuggestionKind, number> = {
  practice: 0,
  missed: 0,
  review: 1,
  again: 2,
  new: 3,
  reach: 4,
  free: 5,
};

const TROUBLE: readonly ReviewBasis[] = ['not-yet-alone', 'missed-last'];

const byWaiting = (a: Candidate, b: Candidate): number =>
  b.overdue - a.overdue || a.rank - b.rank || a.world - b.world || a.index - b.index;

/**
 * Whether the next thing offered should be one played before: whether, with it, the share of those among the last
 * activities played would still be within what the policy aims for.
 */
export function wantsBefore(recent: { before: number; fresh: number }, share: number): boolean {
  if (!(share > 0)) return false;
  return (recent.before + 1) / (recent.before + recent.fresh + 1) <= Math.min(1, share);
}

export function advise(input: AdviseInput): Advice {
  const { graph, attempts, finished, today } = input;
  const policy = input.policy ?? DEFAULT_PLAY_POLICY;
  const slack = policy.review.calendarSlackDays;

  /** How likely a blind answer to a skill's questions is to be right, as the graph has it. */
  const chanceOfSkill = (skill: string): number => graph.skills[skill]?.chance ?? 0;

  // What the record says of each skill, looked up once.
  const sorted = attemptsBySkill(attempts);
  const reviews = new Map<string, SkillReview>();
  const reviewOf = (skill: string): SkillReview => {
    let review = reviews.get(skill);
    if (!review) {
      review = getSkillReview(
        sorted.get(skill) ?? [],
        skill,
        today,
        policy.review,
        policy.evidence,
        chanceOfSkill(skill),
      );
      reviews.set(skill, review);
    }
    return review;
  };
  const doneAlone = (skill: string): boolean => reviewOf(skill).evidence.independentSuccesses > 0;

  // When each activity was played, by the days written on its answers.
  const played = new Map<string, Played>();
  let calendarInDoubt = false;
  for (const attempt of attempts) {
    if (!Object.hasOwn(graph.lessons, attempt.lessonId)) continue;
    const state = played.get(attempt.lessonId) ?? {
      days: new Map<number, number | null>(),
      today: false,
      before: false,
      ago: null,
      lastDay: null,
    };
    const ago = daysAgo(attempt.day, today, slack);
    if (ago === 'after-today') calendarInDoubt = true;
    if (ago === 0) state.today = true;
    else state.before = true;
    const number = dayNumber(attempt.day);
    if (number !== null) state.days.set(number, typeof ago === 'number' ? ago : null);
    if (
      typeof ago === 'number' &&
      (state.ago === null ||
        ago < state.ago ||
        (ago === state.ago && attempt.day < (state.lastDay ?? '')))
    ) {
      state.ago = ago;
      state.lastDay = attempt.day;
    }
    played.set(attempt.lessonId, state);
  }
  /** The skills an activity's coming back turns on: those it asks alone that the record could come to say more of. */
  const turnsOn = (lessonId: string): string[] => {
    const asks = graph.lessons[lessonId]?.asks ?? [];
    const enough = policy.evidence.provisional.minDistinctVariants;
    const able = asks.filter((skill) => (graph.skills[skill]?.variants ?? 0) >= enough);
    return able.length > 0 ? able : asks;
  };
  /** The skills that bring an activity back, the one that has waited longest first. None: it is not due. */
  const dueIn = (lessonId: string, look: (skill: string) => SkillReview): SkillReview[] =>
    turnsOn(lessonId)
      .map(look)
      .filter((review) => review.due && review.waitDays !== null)
      .sort(
        (a, b) =>
          (b.overdueDays ?? 0) - (a.overdueDays ?? 0) ||
          BASIS_ORDER.indexOf(a.basis) - BASIS_ORDER.indexOf(b.basis),
      );

  // Today so far. Whether one played again today had gone badly the last time is asked of the record as it stood
  // this morning: what was played today is left out of it.
  let morning: Map<string, Attempt[]> | null = null;
  const thisMorning = (skill: string): SkillReview => {
    morning ??= attemptsBySkill(
      attempts.filter((attempt) => daysAgo(attempt.day, today, slack) !== 0),
    );
    return getSkillReview(
      morning.get(skill) ?? [],
      skill,
      today,
      policy.review,
      policy.evidence,
      chanceOfSkill(skill),
    );
  };
  const day = { before: 0, fresh: 0, trouble: 0 };
  for (const [lessonId, state] of played) {
    if (!state.today) continue;
    if (!state.before) {
      day.fresh += 1;
      continue;
    }
    day.before += 1;
    const [first] = finished.has(lessonId) ? dueIn(lessonId, thisMorning) : [];
    if (first && TROUBLE.includes(first.basis)) day.trouble += 1;
  }
  const troubleLeft = day.trouble < policy.troublePerDay;

  // The last activities played, the latest first: one for each day an activity was played on. It is new on the
  // first day it was played, and one played before on any other. A day today cannot vouch for is left out.
  const plays: { lesson: string; ago: number; fresh: boolean }[] = [];
  for (const [lesson, state] of played) {
    const first = Math.min(...state.days.keys());
    for (const [number, ago] of state.days) {
      if (ago !== null) plays.push({ lesson, ago, fresh: number === first });
    }
  }
  plays.sort(
    (a, b) =>
      a.ago - b.ago || Number(a.fresh) - Number(b.fresh) || a.lesson.localeCompare(b.lesson),
  );
  const recent = { before: 0, fresh: 0 };
  for (const play of plays.slice(0, Math.max(0, Math.floor(policy.mixOver) - 1))) {
    if (play.fresh) recent.fresh += 1;
    else recent.before += 1;
  }
  const before = wantsBefore(recent, policy.beforeShare);
  const mix = (chose: 'before' | 'fresh'): Reason => ({
    why: 'mix',
    before: recent.before,
    fresh: recent.fresh,
    share: policy.beforeShare,
    chose,
  });
  const doubt: Reason[] = calendarInDoubt ? [{ why: 'calendar-in-doubt' }] : [];

  const offers = graph.worlds.map((world, worldIndex) => {
    const order = world.lessons.filter((id) => Object.hasOwn(graph.lessons, id));
    const start = input.startAt?.[world.id];
    const from = Math.max(0, start === undefined ? 0 : order.indexOf(start));
    const rotated = [...order.slice(from), ...order.slice(0, from)];
    const begun = order.some((id) => played.has(id) || finished.has(id));

    // Played before, and due again.
    const pile: Candidate[] = [];
    order.forEach((id, index) => {
      if (!finished.has(id) || played.get(id)?.today) return;
      const due = dueIn(id, reviewOf);
      const [first] = due;
      if (!first) return;
      const kind = KIND_OF[first.basis];
      pile.push({
        suggestion: {
          lessonId: id,
          world: world.id,
          kind,
          reasons: due.map((review): Reason => ({
            why: 'due',
            skill: review.skillId,
            basis: review.basis,
            lastDay: review.lastDay,
            daysSince: review.daysSince,
            waitDays: review.waitDays ?? 0,
          })),
        },
        trouble: TROUBLE.includes(first.basis),
        overdue: first.overdueDays ?? 0,
        rank: KIND_RANK[kind],
        world: worldIndex,
        index,
      });
    });
    pile.sort(byWaiting);

    // New: what each unfinished activity builds on, and whether that is in place.
    const needsOf = (id: string): { skill: string; shown: boolean; taken: boolean }[] => {
      const lesson = graph.lessons[id];
      if (!lesson) return [];
      const here = order.indexOf(id);
      const needs: { skill: string; shown: boolean; taken: boolean }[] = [];
      for (const skill of lesson.skills) {
        for (const need of graph.skills[skill]?.needs ?? []) {
          // What is taught in the same activity is not something to have first.
          if (lesson.skills.includes(need) || needs.some((known) => known.skill === need)) continue;
          // Where a grown-up has chosen a place to begin, what was taught before that place is taken on their
          // word. An activity builds on a thing as far as it has been taught before that activity: so it is
          // taken when every activity that teaches it before this one comes before the place chosen. (What is
          // taught of it between the place chosen and this activity is for the child to show; what is taught
          // of it further on than this activity has nothing to do with this one.)
          const taughtBefore = (graph.skills[need]?.lessons ?? [])
            .map((lessonId) => order.indexOf(lessonId))
            .filter((at) => at >= 0 && at < here);
          const taken =
            from > 0 && taughtBefore.length > 0 && taughtBefore.every((at) => at < from);
          needs.push({ skill: need, shown: doneAlone(need), taken });
        }
      }
      return needs;
    };
    const unfinished = rotated.filter((id) => !finished.has(id));
    const missing = (id: string): string | null =>
      needsOf(id).find((need) => !need.shown && !need.taken)?.skill ?? null;
    const ready = unfinished.find((id) => missing(id) === null);

    const about = (id: string): Reason[] => {
      const reasons: Reason[] = [];
      if (from > 0 && id === order[from]) reasons.push({ why: 'chosen-start' });
      else if (!begun) reasons.push({ why: 'begins-here' });
      else reasons.push({ why: 'next-in-order' });
      const needs = needsOf(id);
      if (needs.length === 0) reasons.push({ why: 'builds-on-nothing' });
      for (const need of needs) reasons.push({ why: 'builds-on', ...need });
      return reasons;
    };

    let fresh: Suggestion | null = null;
    if (ready !== undefined) {
      const reasons = about(ready);
      for (const id of unfinished.slice(0, unfinished.indexOf(ready))) {
        const skill = missing(id);
        if (skill !== null) reasons.push({ why: 'passed-over', lesson: id, skill });
      }
      fresh = { lessonId: ready, world: world.id, kind: 'new', reasons };
    }
    const [firstUnfinished] = unfinished;
    const reach: Suggestion | null =
      ready === undefined && firstUnfinished !== undefined
        ? {
            lessonId: firstUnfinished,
            world: world.id,
            kind: 'reach',
            reasons: [...about(firstUnfinished), { why: 'nothing-else-ready' }],
          }
        : null;

    // What has been finished here, and how long ago each was played: for when there is nothing new and nothing
    // to come back to. One played today counts as the most lately played of all.
    const rest: Resting[] = [];
    for (const [index, id] of order.entries()) {
      if (!finished.has(id)) continue;
      const state = played.get(id);
      rest.push({
        suggestion: {
          lessonId: id,
          world: world.id,
          kind: 'free',
          reasons: [{ why: 'longest-ago', lastDay: state?.lastDay ?? null }],
        },
        // It went badly last time, whether or not it is time to come back to it.
        trouble: turnsOn(id).some((skill) => TROUBLE.includes(reviewOf(skill).basis)),
        overdue: 0,
        rank: KIND_RANK.free,
        world: worldIndex,
        index,
        ago: state?.today ? -1 : (state?.ago ?? Number.POSITIVE_INFINITY),
      });
    }

    return { world: world.id, pile, fresh, reach, rest };
  });

  type Offer = (typeof offers)[number];
  /**
   * One choice from what some worlds have to offer: by the mix when both piles have something, otherwise whatever
   * there is. Of what went badly last time, only as many a day as the policy allows; a day's first is something
   * that went well, when there is one.
   */
  const choose = (from: readonly Offer[]): Suggestion | null => {
    const pile = from.flatMap((offer) => offer.pile).sort(byWaiting);
    const allowed = pile.filter((candidate) => troubleLeft || !candidate.trouble);
    const warmUp =
      day.before + day.fresh === 0 ? allowed.find((candidate) => !candidate.trouble) : undefined;
    const first = warmUp ?? allowed[0];
    const fresh = from.find((offer) => offer.fresh)?.fresh ?? null;
    const reach = from.find((offer) => offer.reach)?.reach ?? null;
    const withReasons = (suggestion: Suggestion, more: Reason[]): Suggestion => ({
      ...suggestion,
      reasons: [...suggestion.reasons, ...more, ...doubt],
    });
    if (first && before) return withReasons(first.suggestion, fresh ? [mix('before')] : []);
    if (fresh) return withReasons(fresh, first ? [mix('fresh')] : []);
    if (first) return withReasons(first.suggestion, [{ why: 'nothing-new' }]);
    if (reach) return withReasons(reach, []);

    // Nothing new, and nothing to come back to that may be offered now. Something finished that went well and
    // is not due, the one played longest ago: sooner than a second thing in a day that went badly last time.
    const waiting = new Set(pile.map((candidate) => candidate.suggestion.lessonId));
    const longestAgo = (among: readonly Resting[]): Resting | null =>
      among.reduce<Resting | null>(
        (best, each) => (best === null || each.ago > best.ago ? each : best),
        null,
      );
    const freely = (resting: Resting): Suggestion =>
      withReasons(
        {
          ...resting.suggestion,
          reasons: [
            { why: 'nothing-new' },
            waiting.size > 0 ? { why: 'one-a-day' } : { why: 'nothing-due' },
            ...resting.suggestion.reasons,
          ],
        },
        [],
      );
    const everything = from.flatMap((offer) => offer.rest);
    const notToday = everything.filter((each) => each.ago >= 0);
    const wentWell = longestAgo(
      notToday.filter((each) => !each.trouble && !waiting.has(each.suggestion.lessonId)),
    );
    if (wentWell) return freely(wentWell);
    // Nothing that went well is left for today: one more of what went badly, the one whose turn it is.
    const [next] = pile;
    if (next) return withReasons(next.suggestion, [{ why: 'nothing-new' }]);
    const any = longestAgo(notToday) ?? longestAgo(everything);
    return any ? freely(any) : null;
  };

  const byWorld: Partial<Record<WorldId, Suggestion>> = {};
  for (const offer of offers) {
    const chosen = choose([offer]);
    if (chosen) byWorld[offer.world] = chosen;
  }

  // Where Glim points: the world of the one thing that would be chosen from everything there is. What is offered
  // there is that world's own suggestion, so that the map and the world's page never say different things.
  const topWorld = choose(offers.filter(({ world }) => !input.leftOut?.includes(world)))?.world;
  const top = topWorld === undefined ? null : (byWorld[topWorld] ?? null);

  return {
    today,
    byWorld,
    top,
    due: offers
      .flatMap((offer) => offer.pile)
      .sort(byWaiting)
      .map((candidate) => candidate.suggestion),
    day,
    recent,
    calendarInDoubt,
  };
}
