import type { Observation, Profile, Seen, WorldId } from '@/engine/schema';
import { lessonsOf, type WorldInfo } from './worlds';

/**
 * Where to begin. A grown-up who knows the child may say what they have seen them do, and choose where "Play"
 * begins in a world, so that a child who already counts is not walked through "the same amount" for the sake of
 * order.
 *
 * It is the grown-up's word and nothing more. It writes nothing into what the child has shown: every skill still
 * begins at "not yet observed" and stays there until the child shows it in the game. It locks nothing: every
 * activity is on its world's page, before the beginning as well as after it.
 */

/** Where the game would suggest beginning, for something a grown-up has seen. */
export interface Suggestion {
  world: WorldId;
  /** The first activity that asks for more than what was seen. */
  lesson: string;
}

/**
 * What each thing that was seen suggests. Only what is *about* the thing seen is passed over: a child who counts
 * five things has no need of "one for each, up to five", and is not thereby taken past anything else. Knowing a
 * letter by its shape suggests nothing: its sound is another matter, and the letter activities teach the sound.
 */
const SUGGESTS: Readonly<Partial<Record<Observation, Suggestion>>> = {
  'counts-to-five': { world: 'number-garden', lesson: 'ng-give-02' },
  'first-sounds': { world: 'reading-cove', lesson: 'rc-letters-01' },
  'letter-sounds': { world: 'reading-cove', lesson: 'rc-blend-01' },
};

/** An activity in which each thing can be watched for, where the game has one. */
export const WATCH_IN: Readonly<Partial<Record<Observation, Suggestion>>> = {
  'counts-to-five': { world: 'number-garden', lesson: 'ng-give-01' },
  'first-sounds': { world: 'reading-cove', lesson: 'rc-first-01' },
  'letter-shapes': { world: 'reading-cove', lesson: 'rc-letters-01' },
  'letter-sounds': { world: 'reading-cove', lesson: 'rc-letters-01' },
};

/**
 * Where the game would suggest "Play" begins in each world, from what has been seen: for each world, the
 * furthest on of what is suggested. A world nothing bears on is left out.
 */
export function suggestedStarts(
  observed: Readonly<Partial<Record<Observation, Seen>>>,
  worlds: readonly WorldInfo[],
): Partial<Record<WorldId, string>> {
  const starts: Partial<Record<WorldId, string>> = {};
  for (const [what, seen] of Object.entries(observed)) {
    const suggestion = SUGGESTS[what as Observation];
    if (seen !== 'seen' || !suggestion) continue;
    const world = worlds.find((each) => each.id === suggestion.world);
    const order = world ? lessonsOf(world) : [];
    const here = order.indexOf(suggestion.lesson);
    const sofar = order.indexOf(starts[suggestion.world] ?? '');
    if (here > sofar) starts[suggestion.world] = suggestion.lesson;
  }
  return starts;
}

/** Where "Play" begins in a world for this player, if a grown-up has chosen; otherwise at the beginning. */
export function startOf(profile: Profile | null, world: WorldId): string | undefined {
  return profile?.settings.startAt?.[world];
}

type Settings = Profile['settings'];

/**
 * The suggestions worth making: those that would begin a world further on than where it begins now. A grown-up
 * who has already chosen a place as far on, or further, is not asked again.
 */
export function suggestionsFor(settings: Settings, worlds: readonly WorldInfo[]): Suggestion[] {
  const suggested = suggestedStarts(settings.observed ?? {}, worlds);
  return worlds.flatMap((world) => {
    const lesson = suggested[world.id];
    if (lesson === undefined) return [];
    const order = lessonsOf(world);
    const now = Math.max(0, order.indexOf(settings.startAt?.[world.id] ?? ''));
    return order.indexOf(lesson) > now ? [{ world: world.id, lesson }] : [];
  });
}

/** What an activity's lesson is to a grown-up: the activity it belongs to, and which part of it. */
export function placeOfLesson(
  world: WorldInfo,
  lesson: string,
): { title: string; part: number; parts: number } | null {
  for (const activity of world.activities) {
    const at = activity.lessons.indexOf(lesson);
    if (at >= 0) return { title: activity.title, part: at + 1, parts: activity.lessons.length };
  }
  return null;
}

/** What is left of a record once whatever was unsaid (`null`) is taken out: nothing at all, where nothing is. */
function said<Key extends string, Value>(
  record: Readonly<Partial<Record<Key, Value | null>>>,
): Partial<Record<Key, Value>> | undefined {
  const kept = Object.entries(record).filter(([, value]) => value !== null && value !== undefined);
  return kept.length > 0 ? (Object.fromEntries(kept) as Partial<Record<Key, Value>>) : undefined;
}

/**
 * A player's settings with one thing a grown-up has seen (or, with `null`, no longer says anything about). What
 * is not said is not written down at all: "not yet observed" is the absence of a word, never a word of its own.
 */
export function withObserved(settings: Settings, what: Observation, seen: Seen | null): Settings {
  const { observed: before, ...rest } = settings;
  const observed = said<Observation, Seen>({ ...before, [what]: seen });
  return observed ? { ...rest, observed } : rest;
}

/**
 * A player's settings with what a grown-up says was tried away from the screen: the activity (by its first
 * lesson) and the day they said it, or (`null`) that they no longer say so.
 */
export function withTried(settings: Settings, lesson: string, day: string | null): Settings {
  const { tried: before, ...rest } = settings;
  const tried: Record<string, string> = {};
  for (const [key, value] of Object.entries(before ?? {})) {
    if (key !== lesson) tried[key] = value;
  }
  if (day !== null) tried[lesson] = day;
  // What is not said is not written down at all, as with everything else a grown-up says.
  return Object.keys(tried).length > 0 ? { ...rest, tried } : rest;
}

/** The day a grown-up said an activity's thing-to-try was tried, if they have. */
export function triedOn(profile: Profile | null, lesson: string): string | undefined {
  return profile?.settings.tried?.[lesson];
}

/** A player's settings with where "Play" begins in one world: a lesson, or (`null`) the beginning. */
export function withStart(settings: Settings, world: WorldId, lesson: string | null): Settings {
  const { startAt: before, ...rest } = settings;
  const startAt = said<WorldId, string>({ ...before, [world]: lesson });
  return startAt ? { ...rest, startAt } : rest;
}
