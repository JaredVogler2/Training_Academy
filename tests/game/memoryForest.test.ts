import { describe, expect, it } from 'vitest';
import type { Stimulus } from '@/engine';
import type { ChooseSituation, Script, ScriptEvent } from '@/game/lesson/script';

import {
  LOOK_AT_LEAST,
  LOOK_FOR_EACH,
  WAY_TIME,
  chooseScript,
  lookingAs,
  lookingTime,
  recallScript,
  thingsIn,
  type RecallSituation,
} from '@/game/worlds/memory-forest/script';
import { describe as inWords, memoryText } from '@/game/worlds/memory-forest/text';
import { WAY_LINES } from '../../scripts/content/memory-forest.mjs';

const things: Stimulus = { type: 'scene', scene: 'things', of: { ids: ['cat', 'sun', 'hat'] } };
const pairs: Stimulus = {
  type: 'scene',
  scene: 'pairs',
  of: { owners: ['cat', 'fox'], things: ['hat', 'drum'] },
};
const picture = (id: string) => ({ id, stimulus: { type: 'picture', id } as Stimulus });

function situation(event: ScriptEvent, extra: Partial<ChooseSituation> = {}): ChooseSituation {
  return {
    stage: 'independent',
    event,
    prompt: things,
    glance: true,
    again: false,
    choices: [picture('cat'), picture('moon')],
    answer: null,
    tried: null,
    revealed: false,
    lines: { instruction: 'look', feedback: 'feedback', hint: 'hint', ask: 'ask' },
    seconds: () => 0,
    ...extra,
  };
}

/** What is seen, in order: a thing shown twice running is one thing seen. */
const shows = (script: Script): string[] =>
  script.moments
    .flatMap((moment) => (moment.beat ? [moment.beat.show] : []))
    .filter((show, index, all) => show !== all[index - 1]);
const said = (script: Script): string[] =>
  script.moments.flatMap((moment) => (moment.sound?.kind === 'say' ? [moment.sound.key] : []));

describe('how long things are left in view', () => {
  it('is longer the more there is to take in', () => {
    expect(thingsIn(things)).toBe(3);
    expect(thingsIn(pairs)).toBe(4);
    expect(lookingTime(things)).toBe(LOOK_AT_LEAST + 3 * LOOK_FOR_EACH);
    expect(lookingTime(pairs)).toBeGreaterThan(lookingTime(things));
    // Never a flash: even two things are in view for well over three seconds.
    expect(LOOK_AT_LEAST + 2 * LOOK_FOR_EACH).toBeGreaterThanOrEqual(3000);
  });
});

describe('things looked at and then hidden', () => {
  it('are uncovered, covered, and only then asked about', () => {
    const script = chooseScript(situation('new'));
    expect(shows(script)).toEqual(['glance', 'rest']);
    expect(said(script)).toEqual(['look', 'ask']);
    const covered = script.moments.find((moment) => moment.beat?.show === 'rest')!;
    const asked = script.moments.find(
      (moment) => moment.sound?.kind === 'say' && moment.sound.key === 'ask',
    )!;
    expect(asked.at).toBeGreaterThan(covered.at);
    expect(script.length).toBeGreaterThanOrEqual(lookingTime(things));
  });

  it('are not uncovered again for the asking: another look is help', () => {
    const script = chooseScript(situation('new', { again: true }));
    expect(shows(script)).not.toContain('glance');
    expect(said(script)).toEqual(['look', 'ask']);
  });

  it('are uncovered once more when help is asked for', () => {
    expect(shows(chooseScript(situation('hint-model')))).toEqual(['glance', 'rest']);
  });

  it('stay covered after a wrong answer', () => {
    expect(shows(chooseScript(situation('incorrect')))).toEqual(['rest']);
  });

  it('in a demonstration are looked at, covered, asked about and answered', () => {
    const script = chooseScript(situation('new', { stage: 'demo', answer: picture('cat') }));
    expect(shows(script)).toEqual(['glance', 'rest', 'name', 'same']);
    expect(said(script)).toEqual(['lesson.watch', 'look', 'ask']);
  });
});

describe('a question with nothing to look at first', () => {
  it('is simply put', () => {
    const script = chooseScript(
      situation('new', { glance: false, prompt: { type: 'sign', id: 'earlier' } }),
    );
    expect(shows(script)).toEqual(['ask', 'rest']);
  });
});

describe('things looked at in a way of the child’s own choosing', () => {
  const groups: Stimulus = {
    type: 'scene',
    scene: 'groups',
    of: { ids: ['fox', 'ram', 'cup', 'pan'] },
  };
  const recall = (event: ScriptEvent, extra: Partial<RecallSituation> = {}): RecallSituation => ({
    stage: 'independent',
    event,
    again: false,
    ways: ['groups', 'story', 'places'],
    put: false,
    scene: groups,
    lines: { instruction: 'look', ask: 'ask', feedback: 'feedback', hint: 'hint' },
    seconds: () => 0,
    ...extra,
  });
  /** Each thing a script shows or says, in order: "way:story", "say look", "do 1". */
  const told = (script: Script): string[] =>
    script.moments.flatMap((moment) => {
      const { beat, sound } = moment;
      if (sound?.kind === 'say') return [`say ${sound.key}`];
      if (!beat) return [];
      if (beat.show === 'name') return [beat.which];
      return [beat.show === 'do' ? `do ${String(beat.parts)}` : beat.show];
    });

  it('is shown by Glim looking each way and naming it, the way that is kept last; then putting away, and answering', () => {
    const script = recallScript(recall('new', { stage: 'demo' }));
    expect(told(script)).toEqual([
      'say lesson.watch',
      'say look',
      'way:story',
      'say mf.ways.story',
      'way:places',
      'say mf.ways.places',
      'way:groups',
      'say mf.ways.groups',
      'do 0',
      'say ask',
      'do 1',
      'same',
    ]);
    expect(script.settled).toEqual({ show: 'same' });
    // Each way is looked at for as long as the others, and the whole of it is short: nothing is said here.
    const looks = script.moments.filter((moment) => moment.beat?.show === 'name');
    expect((looks[1]?.at ?? 0) - (looks[0]?.at ?? 0)).toBe(WAY_TIME);
    expect((looks[2]?.at ?? 0) - (looks[1]?.at ?? 0)).toBe(WAY_TIME);
    expect(script.length).toBeLessThan(8000);
  });

  it('gives each line its time where it is heard, so that no way is named over the one before', () => {
    const heard = recallScript(
      recall('new', { stage: 'demo', seconds: (key) => (key.startsWith('mf.ways.') ? 2 : 0) }),
    );
    const looks = heard.moments.filter((moment) => moment.beat?.show === 'name');
    expect((looks[1]?.at ?? 0) - (looks[0]?.at ?? 0)).toBeGreaterThanOrEqual(2000 + WAY_TIME);
  });

  it('for a child, says what is wanted and shows nothing: the looking is theirs to do', () => {
    expect(told(recallScript(recall('new')))).toEqual(['say look', 'rest']);
  });

  it('says the question again, not how to look, once the things have been put away', () => {
    expect(told(recallScript(recall('new', { put: true, again: true })))).toEqual([
      'say ask',
      'rest',
    ]);
  });

  it('gives another look only as help, for as long as there are things to take in, and covers them again', () => {
    const script = recallScript(recall('hint-model', { put: true }));
    expect(told(script)).toEqual(['say hint', 'glance', 'rest']);
    const [look, rest] = script.moments.filter((moment) => moment.beat !== undefined);
    expect((rest?.at ?? 0) - (look?.at ?? 0)).toBe(lookingTime(groups));
    expect(script.settled).toEqual({ show: 'rest' });
  });

  it('uncovers nothing after a wrong answer, or for help that only says which it was', () => {
    expect(told(recallScript(recall('incorrect', { put: true })))).toEqual([
      'say feedback',
      'rest',
    ]);
    expect(told(recallScript(recall('hint-reveal', { put: true })))).toEqual(['say hint', 'rest']);
  });

  it('lights what went together when the answer is right', () => {
    const script = recallScript(recall('correct', { put: true }));
    expect(told(script)).toEqual(['same', 'say feedback']);
    expect(script.settled).toEqual({ show: 'same' });
  });

  it('calls each way by the words the voice was given, which are the words on the board', () => {
    for (const way of ['groups', 'story', 'places'] as const) {
      expect(WAY_LINES[memoryText.wayLine(way) as keyof typeof WAY_LINES]).toBe(
        memoryText.wayWords(way),
      );
      expect(lookingAs(way)).toBe(`way:${way}`);
      expect(memoryText.wayButton(way)).toMatch(/^Look at them /);
    }
    expect(Object.keys(WAY_LINES)).toHaveLength(3);
  });

  it('counts four things in two groups as four, and four things at four places as eight', () => {
    expect(thingsIn(groups)).toBe(4);
    expect(
      thingsIn({
        type: 'scene',
        scene: 'places',
        of: { owners: ['log', 'nest', 'hut', 'mat'], things: ['fox', 'cup', 'ram', 'pan'] },
      }),
    ).toBe(8);
  });

  it('says in words what is in two groups, and what the sign for last time means', () => {
    expect(inWords(groups)).toBe('To remember: fox and ram together, and cup and pan together');
    expect(inWords({ type: 'sign', id: 'last-time' })).toBe(
      'Think back to the last time you played this',
    );
    expect(inWords({ type: 'sign', id: 'earlier' })).toBe('Think back to the very start');
  });
});
