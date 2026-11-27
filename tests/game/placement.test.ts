import { describe, expect, it } from 'vitest';
import { OBSERVATIONS, type Profile } from '@/engine';
import {
  WATCH_IN,
  placeOfLesson,
  startOf,
  suggestedStarts,
  suggestionsFor,
  triedOn,
  withObserved,
  withLeftOut,
  withStart,
  withTried,
} from '@/game/placement';
import { WORLDS, lessonsOf, worldById } from '@/game/worlds';

/**
 * Where to begin: what a grown-up has said they have seen, and where "Play" begins because of it. It is their
 * word: these are the rules for keeping it, and none of them touches what the child has shown.
 */

const NOTHING: Profile['settings'] = { sessionMinutes: null };
const numberGarden = worldById('number-garden');
const readingCove = worldById('reading-cove');

describe('what the game suggests', () => {
  it('is nothing, for someone of whom nothing has been seen', () => {
    expect(suggestedStarts({}, WORLDS)).toEqual({});
    expect(suggestionsFor(NOTHING, WORLDS)).toEqual([]);
  });

  it('is nothing for what has been looked for and not yet seen', () => {
    const observed = Object.fromEntries(OBSERVATIONS.map((what) => [what, 'not-yet'] as const));
    expect(suggestedStarts(observed, WORLDS)).toEqual({});
  });

  it('passes over counting to five for a child who counts five things', () => {
    const starts = suggestedStarts({ 'counts-to-five': 'seen' }, WORLDS);
    expect(starts).toEqual({ 'number-garden': 'ng-give-02' });
    const order = lessonsOf(numberGarden);
    // The activity it begins at is the one after "counting to five".
    expect(order[order.indexOf('ng-give-02') - 1]).toBe('ng-give-01');
  });

  it('begins the letters for a child who hears first sounds, and blending for one who knows their sounds', () => {
    expect(suggestedStarts({ 'first-sounds': 'seen' }, WORLDS)).toEqual({
      'reading-cove': 'rc-letters-01',
    });
    expect(suggestedStarts({ 'letter-sounds': 'seen' }, WORLDS)).toEqual({
      'reading-cove': 'rc-blend-01',
    });
  });

  it('takes the furthest on, whichever was said first', () => {
    const order = lessonsOf(readingCove);
    expect(order.indexOf('rc-blend-01')).toBeGreaterThan(order.indexOf('rc-letters-01'));
    expect(suggestedStarts({ 'first-sounds': 'seen', 'letter-sounds': 'seen' }, WORLDS)).toEqual({
      'reading-cove': 'rc-blend-01',
    });
    expect(suggestedStarts({ 'letter-sounds': 'seen', 'first-sounds': 'seen' }, WORLDS)).toEqual({
      'reading-cove': 'rc-blend-01',
    });
  });

  it('makes nothing of knowing a letter by its shape: its sound is another matter', () => {
    expect(suggestedStarts({ 'letter-shapes': 'seen' }, WORLDS)).toEqual({});
    expect(suggestedStarts({ taps: 'seen', listens: 'seen' }, WORLDS)).toEqual({});
  });

  it('names only activities there are, and one to watch each thing in that comes no later', () => {
    const everything = Object.fromEntries(OBSERVATIONS.map((what) => [what, 'seen'] as const));
    for (const [world, lesson] of Object.entries(suggestedStarts(everything, WORLDS))) {
      expect(lessonsOf(worldById(world as never)), lesson).toContain(lesson);
    }
    for (const [what, watch] of Object.entries(WATCH_IN)) {
      const order = lessonsOf(worldById(watch.world));
      expect(order, what).toContain(watch.lesson);
      const start = suggestedStarts({ [what]: 'seen' }, WORLDS)[watch.world];
      // What is watched to find a thing out is not what the thing, once seen, would begin at.
      if (start !== undefined)
        expect(order.indexOf(watch.lesson)).toBeLessThan(order.indexOf(start));
    }
  });
});

describe('a suggestion worth making', () => {
  const seen = withObserved(NOTHING, 'counts-to-five', 'seen');

  it('is one that would begin a world further on than it begins now', () => {
    expect(suggestionsFor(seen, WORLDS)).toEqual([
      { world: 'number-garden', lesson: 'ng-give-02' },
    ]);
  });

  it('is not made again once it has been taken', () => {
    const taken = withStart(seen, 'number-garden', 'ng-give-02');
    expect(suggestionsFor(taken, WORLDS)).toEqual([]);
  });

  it('is not made to a grown-up who has already chosen somewhere further on', () => {
    const order = lessonsOf(numberGarden);
    const further = withStart(seen, 'number-garden', order.at(-1) ?? '');
    expect(suggestionsFor(further, WORLDS)).toEqual([]);
    // But is, to one who chose somewhere before it.
    const before = withStart(seen, 'number-garden', order[1] ?? '');
    expect(suggestionsFor(before, WORLDS)).toHaveLength(1);
  });
});

describe('what a grown-up says', () => {
  it('is written down, one thing at a time, and the rest left as it was', () => {
    const one = withObserved(NOTHING, 'taps', 'seen');
    const two = withObserved(one, 'listens', 'not-yet');
    expect(one).toEqual({ sessionMinutes: null, observed: { taps: 'seen' } });
    expect(two.observed).toEqual({ taps: 'seen', listens: 'not-yet' });
    // What was given is not changed.
    expect(NOTHING).toEqual({ sessionMinutes: null });
    expect(one.observed).toEqual({ taps: 'seen' });
  });

  it('is not written at all where nothing is said: "not yet observed" is no word of its own', () => {
    const said = withObserved(NOTHING, 'taps', 'seen');
    const unsaid = withObserved(said, 'taps', null);
    expect(unsaid).toEqual({ sessionMinutes: null });
    expect('observed' in unsaid).toBe(false);
    expect(withObserved(NOTHING, 'taps', null)).toEqual({ sessionMinutes: null });
  });

  it('keeps where Play begins world by world, and forgets a world that is put back to the beginning', () => {
    const one = withStart(NOTHING, 'number-garden', 'ng-give-02');
    const two = withStart(one, 'reading-cove', 'rc-letters-01');
    expect(two.startAt).toEqual({
      'number-garden': 'ng-give-02',
      'reading-cove': 'rc-letters-01',
    });
    const back = withStart(two, 'number-garden', null);
    expect(back.startAt).toEqual({ 'reading-cove': 'rc-letters-01' });
    expect('startAt' in withStart(back, 'reading-cove', null)).toBe(false);
  });

  it('keeps what was tried away from the screen by activity, with the day it was said', () => {
    const one = withTried(NOTHING, 'ii-bridge-01', '2026-11-26');
    const two = withTried(one, 'ii-float-01', '2026-11-27');
    expect(one).toEqual({ sessionMinutes: null, tried: { 'ii-bridge-01': '2026-11-26' } });
    expect(two.tried).toEqual({ 'ii-bridge-01': '2026-11-26', 'ii-float-01': '2026-11-27' });
    // Said again on a later day, it is the later day that is kept.
    expect(withTried(two, 'ii-bridge-01', '2026-12-01').tried).toEqual({
      'ii-bridge-01': '2026-12-01',
      'ii-float-01': '2026-11-27',
    });
    // Taken back, it is not written at all; and the last one taken back leaves no word behind.
    const back = withTried(two, 'ii-bridge-01', null);
    expect(back.tried).toEqual({ 'ii-float-01': '2026-11-27' });
    expect('tried' in withTried(back, 'ii-float-01', null)).toBe(false);
    expect(withTried(NOTHING, 'ii-bridge-01', null)).toEqual({ sessionMinutes: null });
    // What was given is not changed.
    expect(one.tried).toEqual({ 'ii-bridge-01': '2026-11-26' });
  });

  it('says of a player what was tried, and of nobody, nothing', () => {
    const settings = withTried(NOTHING, 'ii-bridge-01', '2026-11-26');
    const profile = { settings } as Profile;
    expect(triedOn(profile, 'ii-bridge-01')).toBe('2026-11-26');
    expect(triedOn(profile, 'ii-ramp-01')).toBeUndefined();
    expect(triedOn(null, 'ii-bridge-01')).toBeUndefined();
  });

  it('keeps what was tried apart from everything else a grown-up says', () => {
    const settings = withTried(
      withStart(
        withObserved({ sessionMinutes: 15, howTo: 'seen' }, 'taps', 'seen'),
        'number-garden',
        'ng-give-02',
      ),
      'ii-bridge-01',
      '2026-11-26',
    );
    expect(settings).toEqual({
      sessionMinutes: 15,
      howTo: 'seen',
      observed: { taps: 'seen' },
      startAt: { 'number-garden': 'ng-give-02' },
      tried: { 'ii-bridge-01': '2026-11-26' },
    });
    // And saying it moves nothing: where Play begins is as it was.
    expect(withTried(settings, 'ii-bridge-01', null)).toEqual({
      sessionMinutes: 15,
      howTo: 'seen',
      observed: { taps: 'seen' },
      startAt: { 'number-garden': 'ng-give-02' },
    });
  });

  it('keeps the two apart, and everything else that is in the settings', () => {
    const settings = withStart(
      withObserved({ sessionMinutes: 15, howTo: 'seen' }, 'taps', 'seen'),
      'number-garden',
      'ng-give-02',
    );
    expect(settings).toEqual({
      sessionMinutes: 15,
      howTo: 'seen',
      observed: { taps: 'seen' },
      startAt: { 'number-garden': 'ng-give-02' },
    });
  });
});

describe('where Play begins for a player', () => {
  const player = (settings: Profile['settings']): Profile => ({
    schemaVersion: 1,
    id: 'p',
    name: 'Robin',
    avatar: 'leaf',
    createdAt: 0,
    updatedAt: 0,
    settings,
  });

  it('is where a grown-up chose, in the world they chose it for, and nowhere else', () => {
    const robin = player(withStart(NOTHING, 'number-garden', 'ng-give-02'));
    expect(startOf(robin, 'number-garden')).toBe('ng-give-02');
    expect(startOf(robin, 'reading-cove')).toBeUndefined();
    expect(startOf(player(NOTHING), 'number-garden')).toBeUndefined();
    expect(startOf(null, 'number-garden')).toBeUndefined();
  });
});

describe('what an activity is called for a grown-up', () => {
  it('is the activity it belongs to, and which part of it', () => {
    expect(placeOfLesson(numberGarden, 'ng-give-02')).toEqual({
      title: 'Counting to five, then ten',
      part: 2,
      parts: 2,
    });
    expect(placeOfLesson(numberGarden, 'ng-glance-01')).toMatchObject({ part: 1, parts: 1 });
    expect(placeOfLesson(numberGarden, 'rc-letters-01')).toBeNull();
  });

  it('is known for every activity of every world', () => {
    for (const world of WORLDS) {
      for (const lesson of lessonsOf(world)) {
        expect(placeOfLesson(world, lesson), lesson).not.toBeNull();
      }
    }
  });
});

describe('worlds left out of where Glim points', () => {
  it('keeps each world once, and writes nothing when none is left out', () => {
    const one = withLeftOut(NOTHING, 'reading-cove', true);
    const again = withLeftOut(one, 'reading-cove', true);
    const two = withLeftOut(again, 'robot-ridge', true);
    expect(two.leftOut).toEqual(['reading-cove', 'robot-ridge']);
    const back = withLeftOut(two, 'reading-cove', false);
    expect(back.leftOut).toEqual(['robot-ridge']);
    const none = withLeftOut(back, 'robot-ridge', false);
    expect(none).toEqual(NOTHING);
    expect('leftOut' in none).toBe(false);
    // Putting back a world that was never left out changes nothing.
    expect(withLeftOut(NOTHING, 'music-lab', false)).toEqual(NOTHING);
  });

  it('touches no other setting', () => {
    const started = withStart(NOTHING, 'number-garden', 'ng-give-02');
    const out = withLeftOut(started, 'number-garden', true);
    expect(out.startAt).toEqual(started.startAt);
    expect(withLeftOut(out, 'number-garden', false)).toEqual(started);
  });
});
