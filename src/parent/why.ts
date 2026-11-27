import type { SkillEvidence } from '@/engine';
import type { Reason, SuggestionKind } from '@/engine/recommend';
import { dayInWords } from '@/game/dates';

/**
 * Why Play offers what it does, in words a grown-up can check against what they have seen. Each reason the engine
 * gives (`engine/recommend.ts`) has one sentence here, and the sentence says no more than the reason does: what
 * the record holds, what the game's own rule is, and nothing about the child beyond that.
 */

export interface Names {
  /** What an activity is called. */
  lesson: (id: string) => string;
  /** What a skill is called. */
  skill: (id: string) => string;
}

const days = (count: number): string => (count === 1 ? '1 day' : `${String(count)} days`);
const activities = (count: number): string =>
  count === 1 ? '1 activity' : `${String(count)} activities`;

/** How long ago, as it is said: today, yesterday, so many days ago; or that the calendar cannot say. */
export function ago(daysSince: number | null): string {
  if (daysSince === null) return 'on a day this device’s calendar cannot vouch for';
  if (daysSince <= 0) return 'today';
  return daysSince === 1 ? 'yesterday' : `${String(daysSince)} days ago`;
}

/** The kind of thing that is offered, as a short label. */
export const KIND_IN_WORDS: Record<SuggestionKind, string> = {
  new: 'Something new',
  reach: 'Something new, a little early',
  again: 'Another go at something finished with help',
  practice: 'More practice of something done before',
  missed: 'Back to something that went wrong last time',
  review: 'A look back at something done on separate days',
  free: 'Something played before, with nothing due',
};

export function reasonInWords(reason: Reason, names: Names): string {
  switch (reason.why) {
    case 'begins-here':
      return 'Nothing has been played in this world yet, so Play begins at its first activity.';
    case 'next-in-order':
      return 'It is the first activity here that has not been finished.';
    case 'chosen-start':
      return 'It is where you chose for Play to begin in this world.';
    case 'builds-on': {
      const skill = `“${names.skill(reason.skill)}”`;
      if (reason.shown) return `It builds on ${skill}, which has been done without help.`;
      if (reason.taken) {
        return `It builds on ${skill}, which is taken on your word: it is taught before the place you chose. The record does not show it.`;
      }
      return `It builds on ${skill}, which has not yet been done without help.`;
    }
    case 'builds-on-nothing':
      return 'It builds on nothing that comes before it.';
    case 'passed-over':
      return `“${names.lesson(reason.lesson)}” comes earlier and was passed over for now: it builds on “${names.skill(reason.skill)}”, which has not yet been done without help. It is still open on the world’s page.`;
    case 'nothing-else-ready':
      return 'Everything unfinished here builds on something not yet done without help, so the first of them is offered all the same.';
    case 'due': {
      const skill = `“${names.skill(reason.skill)}”`;
      const last = ago(reason.daysSince);
      const wait = days(reason.waitDays);
      switch (reason.basis) {
        case 'not-yet-alone':
          return `${skill} has been practised and not yet done without help. It was last practised ${last}, and the game comes back to it after ${wait}.`;
        case 'missed-last':
          return `The last first try without help at ${skill} was not right. It was last practised ${last}, and the game comes back to it after ${wait}.`;
        case 'practicing':
          return `${skill} has been done without help, not yet often enough to say more. It was last practised ${last}, and comes back after ${wait}.`;
        case 'provisional':
          return `${skill} has been done without help several times, close together. It was last practised ${last}; coming back after ${wait} is what shows whether it has lasted.`;
        case 'consistent':
          return `${skill} has been done without help on separate days. It was last practised ${last}, and is looked at again after ${wait}.`;
        case 'not-yet-observed':
          return `${skill} is due.`;
      }
      break;
    }
    case 'mix': {
      const total = reason.before + reason.fresh;
      // Said as a person would say it: "none", not "0"; and one activity is not "the last 1 activity".
      const some = (count: number): string => (count === 0 ? 'none' : String(count));
      const lately =
        total === 0
          ? 'Nothing has been played lately.'
          : total === 1
            ? `The last activity played was ${reason.fresh === 1 ? 'new' : 'one played before'}.`
            : `Of the last ${activities(total)} played, ${some(reason.before)} had been played before and ${some(reason.fresh)} ${reason.fresh === 1 ? 'was' : 'were'} new.`;
      const aim = String(Math.round(reason.share * 10));
      const chose = reason.chose === 'before' ? 'one played before' : 'something new';
      return `${lately} While anything is due, the game aims for about ${aim} in 10 to be ones played before, so this time it is ${chose}.`;
    }
    case 'nothing-new':
      return 'Nothing new here is ready.';
    case 'nothing-due':
      return 'Nothing played before is due again.';
    case 'one-a-day':
      return 'Something that went badly last time is due, and one of those a day is enough: it waits for another day.';
    case 'longest-ago':
      return reason.lastDay === null
        ? 'Of everything finished here, this is the one played longest ago.'
        : `Of everything finished here, this is the one played longest ago: on ${dayInWords(reason.lastDay)}.`;
    case 'calendar-in-doubt':
      return 'Some answers are dated after today, so this device’s calendar has been changed at some time. Those dates are not counted from.';
  }
  return '';
}

/** One time in so many, for a chance: a half is "1 time in 2". */
function oneIn(chance: number): string {
  return `1 time in ${String(Math.max(2, Math.round(1 / chance)))}`;
}

/**
 * What can be said of luck, for a skill whose questions can be got right without knowing. Nothing where chance
 * has no part in them (a robot's plan), and nothing where there are no first tries without help to speak of.
 */
export function luckInWords(evidence: SkillEvidence): string | null {
  if (evidence.luck === null || evidence.chance <= 0 || evidence.independentSuccesses === 0) {
    return null;
  }
  const each = `Its questions can be got right by luck, about ${oneIn(evidence.chance)}`;
  if (evidence.heldByLuck) {
    return `${each}, and the latest first tries could still be that. More of the same will tell.`;
  }
  if (
    evidence.status !== 'provisionally-independent' &&
    evidence.status !== 'consistently-independent'
  ) {
    return null;
  }
  const inHundred = evidence.luck * 100;
  const often =
    inHundred < 1
      ? 'less than 1 time in 100'
      : `about ${String(Math.round(inHundred))} ${Math.round(inHundred) === 1 ? 'time' : 'times'} in 100`;
  return `${each}; first tries as good as the latest would come by luck alone ${often}.`;
}
