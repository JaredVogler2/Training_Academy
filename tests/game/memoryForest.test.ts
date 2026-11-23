import { describe, expect, it } from 'vitest';
import type { Stimulus } from '@/engine';
import type { ChooseSituation, Script, ScriptEvent } from '@/game/lesson/script';
import {
  LOOK_AT_LEAST,
  LOOK_FOR_EACH,
  chooseScript,
  lookingTime,
  thingsIn,
} from '@/game/worlds/memory-forest/script';

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
