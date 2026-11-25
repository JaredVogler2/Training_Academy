// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import musicLabPack from '@/content/packs/music-lab.v1.json';
import {
  parseContentPack,
  pitchOf,
  type BeatTask,
  type ContentPack,
  type MakeChallenge,
  type Stimulus,
} from '@/engine';
import type { ChooseSituation, MakeSituation, Script, ScriptEvent } from '@/game/lesson/script';
import musicLab, { describe as describePicture } from '@/game/worlds/music-lab';
import {
  BETWEEN_MS,
  STEP_MS,
  barLength,
  lengthOf,
  phrasesOf,
} from '@/game/worlds/music-lab/phrases';
import {
  BAR_TIME,
  beatScript,
  chooseScript,
  makeScript,
  periodOf,
  tuneScript,
} from '@/game/worlds/music-lab/script';
import { musicText, noteWord } from '@/game/worlds/music-lab/text';

afterEach(cleanup);

function pack(): ContentPack {
  const parsed = parseContentPack(musicLabPack);
  if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
  return parsed.value;
}

const bird = (...notes: string[]): Stimulus => ({
  type: 'scene',
  scene: 'phrase',
  of: { voice: 'pipe', notes },
});
const bigBird = (...notes: string[]): Stimulus => ({
  type: 'scene',
  scene: 'phrase',
  of: { voice: 'pipe', notes, big: true },
});
const drum = (...steps: number[]): Stimulus => ({
  type: 'scene',
  scene: 'phrase',
  of: { voice: 'drum', steps },
});
const bar = (note: string): Stimulus => ({ type: 'scene', scene: 'bar', of: { note } });
const pair = (first: string[], second: string[]): Stimulus => ({
  type: 'scene',
  scene: 'pair',
  of: { voice: 'pipe', first, second },
});
const sign = (id: string): Stimulus => ({ type: 'sign', id });

function choosing(event: ScriptEvent, extra: Partial<ChooseSituation> = {}): ChooseSituation {
  return {
    stage: 'independent',
    event,
    prompt: sign('high'),
    glance: false,
    again: false,
    choices: [
      { id: 'a', stimulus: bird('e4') },
      { id: 'b', stimulus: bird('e5') },
    ],
    answer: null,
    tried: null,
    revealed: false,
    lines: { instruction: 'instruction', feedback: 'feedback', hint: 'hint', correct: 'correct' },
    seconds: () => 0,
    ...extra,
  };
}

function making(event: ScriptEvent, extra: Partial<MakeSituation> = {}): MakeSituation {
  return {
    stage: 'independent',
    event,
    again: false,
    parts: 3,
    sequence: [],
    lines: { instruction: 'instruction', feedback: 'feedback', hint: 'hint' },
    seconds: () => 0,
    ...extra,
  };
}

/** Every note a script plays, in order, as "timbre:pitch". */
const tones = (script: Script): string[] =>
  script.moments.flatMap((moment) =>
    moment.sound?.kind === 'tone' ? [`${moment.sound.timbre}:${String(moment.sound.pitch)}`] : [],
  );
/** Who is lifted, in order. */
const lifted = (script: Script): string[] =>
  script.moments.flatMap((moment) =>
    moment.beat?.show === 'name'
      ? [
          moment.beat.part === undefined
            ? moment.beat.which
            : `${moment.beat.which}#${String(moment.beat.part)}`,
        ]
      : [],
  );
const said = (script: Script): string[] =>
  script.moments.flatMap((moment) => (moment.sound?.kind === 'say' ? [moment.sound.key] : []));

describe('what the pictures play', () => {
  it('is one phrase for one player, and two for two', () => {
    expect(phrasesOf(bar('c4'))).toEqual([
      { voice: 'bar', strokes: [{ timbre: 'bar', pitch: 'c4', lasts: 2 * STEP_MS }] },
    ]);
    expect(phrasesOf(bird('c5', 'e5'))[0]?.strokes.map((stroke) => stroke.pitch)).toEqual([
      'c5',
      'e5',
    ]);
    expect(phrasesOf(pair(['c5'], ['e5']))).toHaveLength(2);
    expect(phrasesOf(sign('high'))).toEqual([]);
    expect(phrasesOf({ type: 'picture', id: 'cat' })).toEqual([]);
  });

  it('gives a drum long and short knocks, and a tune even notes', () => {
    const [knocks] = phrasesOf(drum(2, 1, 1));
    expect(knocks?.strokes.map((stroke) => stroke.lasts)).toEqual([2 * STEP_MS, STEP_MS, STEP_MS]);
    expect(knocks?.strokes.every((stroke) => stroke.timbre === 'drum')).toBe(true);
    expect(lengthOf(knocks!)).toBe(4 * STEP_MS);
    const [tune] = phrasesOf(bird('c5', 'e5', 'g5'));
    expect(lengthOf(tune!)).toBe(6 * STEP_MS);
  });

  it('draws a low bar long and a high bar short, in step with its pitch', () => {
    const notes = ['c4', 'd4', 'e4', 'g4', 'a4', 'c5', 'e5', 'c6'];
    const lengths = notes.map(barLength);
    for (const [index, length] of lengths.entries()) {
      const before = lengths[index - 1];
      if (before !== undefined) expect(length).toBeLessThan(before);
    }
    expect(barLength('c4')).toBe(1);
    expect(barLength('c6')).toBeGreaterThan(0.4);
  });
});

describe('a question put by ear', () => {
  it('plays each one there is to choose from, in the order they stand, lifting each as it plays', () => {
    const script = chooseScript(choosing('new'));
    expect(said(script)).toEqual(['instruction']);
    expect(lifted(script)).toEqual(['a', 'b']);
    expect(tones(script)).toEqual(['pipe:e4', 'pipe:e5']);
    expect(script.settled).toEqual({ show: 'rest' });
  });

  it('is the question itself, so it is played even for someone who has asked for less movement', () => {
    for (const event of ['new', 'incorrect', 'hint-model', 'hint-reveal', 'correct'] as const) {
      expect(chooseScript(choosing(event)).essential, event).toBe(true);
    }
  });

  it('plays the whole question again for the asking: hearing it is not help', () => {
    const first = chooseScript(choosing('new'));
    const again = chooseScript(choosing('new', { again: true }));
    expect(tones(again)).toEqual(tones(first));
    expect(lifted(again)).toEqual(lifted(first));
  });

  it('leaves a breath between one player and the next, and plays nothing over anything else', () => {
    const script = chooseScript(choosing('new'));
    const at = script.moments.filter((moment) => moment.sound?.kind === 'tone').map((m) => m.at);
    expect((at[1] ?? 0) - (at[0] ?? 0)).toBe(2 * STEP_MS + BETWEEN_MS);
  });

  it('plays two that are compared one after the other, saying which of the two it is', () => {
    const script = chooseScript(
      choosing('new', {
        prompt: pair(['c5', 'e5'], ['c5', 'g5']),
        choices: [
          { id: 'same', stimulus: sign('same') },
          { id: 'different', stimulus: sign('different') },
        ],
      }),
    );
    expect(lifted(script)).toEqual(['prompt#0', 'prompt#1']);
    expect(tones(script)).toEqual(['pipe:c5', 'pipe:e5', 'pipe:c5', 'pipe:g5']);
  });

  it('plays the leader first and then every little one, for a tune to be found again', () => {
    const script = chooseScript(
      choosing('new', {
        prompt: bigBird('g5', 'e5'),
        choices: [
          { id: 'a', stimulus: bird('e5', 'g5') },
          { id: 'b', stimulus: bird('g5', 'e5') },
        ],
      }),
    );
    expect(lifted(script)).toEqual(['prompt', 'a', 'b']);
    expect(tones(script)).toEqual([
      'pipe:g5',
      'pipe:e5',
      'pipe:e5',
      'pipe:g5',
      'pipe:g5',
      'pipe:e5',
    ]);
  });

  it('after a wrong answer says so and plays what is left again', () => {
    const script = chooseScript(
      choosing('incorrect', { choices: [{ id: 'b', stimulus: bird('e5') }] }),
    );
    expect(said(script)).toEqual(['feedback']);
    expect(lifted(script)).toEqual(['b']);
    expect(script.settled).toEqual({ show: 'rest' });
  });

  it('shows the answer in a demonstration by playing it once more, and says what it is', () => {
    const script = chooseScript(
      choosing('new', { stage: 'demo', answer: { id: 'b', stimulus: bird('e5') } }),
    );
    expect(said(script)).toEqual(['lesson.watch', 'instruction', 'correct']);
    expect(lifted(script)).toEqual(['a', 'b', 'b']);
    expect(script.settled).toEqual({ show: 'same' });
  });

  it('points to the answer when it is shown as help, and plays it', () => {
    const script = chooseScript(
      choosing('hint-reveal', { answer: { id: 'b', stimulus: bird('e5') } }),
    );
    expect(said(script)).toEqual(['hint']);
    expect(lifted(script)).toEqual(['b']);
    expect(tones(script)).toEqual(['pipe:e5']);
    // A sign makes no sound: it is simply pointed to.
    const signed = chooseScript(
      choosing('hint-reveal', {
        prompt: pair(['c5'], ['c5']),
        answer: { id: 'same', stimulus: sign('same') },
      }),
    );
    expect(lifted(signed)).toEqual(['same']);
    expect(tones(signed)).toEqual([]);
  });

  it('waits for its words: nothing is played over the instruction', () => {
    const script = chooseScript(choosing('new', { seconds: () => 2 }));
    const firstTone = script.moments.find((moment) => moment.sound?.kind === 'tone');
    expect(firstTone?.at).toBeGreaterThanOrEqual(2000);
  });
});

describe('notes to play back', () => {
  const challenge = pack()
    .lessons.find((lesson) => lesson.id === 'ml-echo-01')!
    .challenges.find((each) => each.id === 'ml-echo-01.three-a') as MakeChallenge;
  const sequence = ['g4', 'c4', 'e4'];

  it('are each played on their own bar, which is lit while it sounds', () => {
    const script = makeScript(making('new', { sequence }), challenge)!;
    expect(tones(script)).toEqual(['bar:g4', 'bar:c4', 'bar:e4']);
    expect(lifted(script)).toEqual(sequence);
    expect(script.essential).toBe(true);
  });

  it('are not played again just for the asking: hearing them twice is help', () => {
    const script = makeScript(making('new', { sequence, again: true }), challenge)!;
    expect(tones(script)).toEqual([]);
    expect(said(script)).toEqual(['instruction']);
  });

  it('are played again after a wrong try, and when help is asked for', () => {
    for (const event of ['incorrect', 'hint-model'] as const) {
      expect(tones(makeScript(making(event, { sequence }), challenge)!), event).toEqual([
        'bar:g4',
        'bar:c4',
        'bar:e4',
      ]);
    }
  });

  it('are shown and then played by Glim in a demonstration', () => {
    const script = makeScript(making('new', { stage: 'demo', sequence }), challenge)!;
    // Once to listen to, once more as Glim plays them back.
    expect(tones(script)).toEqual(['bar:g4', 'bar:c4', 'bar:e4', 'bar:g4', 'bar:c4', 'bar:e4']);
    const done = script.moments.flatMap((moment) =>
      moment.beat?.show === 'do' ? [moment.beat.parts] : [],
    );
    expect(done).toEqual([0, 1, 2, 3]);
  });

  it('leave anything that is not notes to play back to its own board', () => {
    const tune = pack()
      .lessons.find((lesson) => lesson.id === 'ml-tune-01')!
      .challenges.find((each) => each.kind === 'make') as MakeChallenge;
    expect(makeScript(making('new'), tune)).toBeNull();
  });
});

describe('a beat', () => {
  const task: BeatTask = { type: 'beat', tempo: 60, lead: 4, beats: 4, need: 3 };

  it('is a second from beat to beat at sixty to the minute', () => {
    expect(periodOf(task)).toBe(1000);
    expect(periodOf({ ...task, tempo: 80 })).toBe(750);
  });

  it('is clicked evenly in a demonstration, and struck on the drum once the listening is over', () => {
    const script = beatScript(making('new', { stage: 'demo' }), task);
    const clicks = script.moments.filter(
      (moment) => moment.sound?.kind === 'tone' && moment.sound.timbre === 'tick',
    );
    const strikes = script.moments.filter(
      (moment) => moment.sound?.kind === 'tone' && moment.sound.timbre === 'drum',
    );
    expect(clicks).toHaveLength(8);
    expect(strikes).toHaveLength(4);
    for (const [index, click] of clicks.entries()) {
      const before = clicks[index - 1];
      if (before) expect(click.at - before.at).toBe(1000);
    }
    // The drum falls exactly on the fifth click and each one after.
    expect(strikes.map((strike) => strike.at)).toEqual(clicks.slice(4).map((click) => click.at));
    const sounded = script.moments.flatMap((moment) =>
      moment.beat?.show === 'do' ? [moment.beat.parts] : [],
    );
    expect(sounded).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('is only words when it is the child’s turn: the board keeps the beat itself', () => {
    const script = beatScript(making('new'), task);
    expect(tones(script)).toEqual([]);
    expect(said(script)).toEqual(['instruction']);
    expect(said(beatScript(making('incorrect'), task))).toEqual(['feedback']);
    expect(said(beatScript(making('hint-reveal'), task))).toEqual(['hint']);
  });
});

describe('a tune to make up', () => {
  it('is made note by note in a demonstration, and then played through', () => {
    const script = tuneScript(making('new', { stage: 'demo' }), ['c4', 'e4', 'g4'], []);
    expect(tones(script)).toEqual(['bar:c4', 'bar:e4', 'bar:g4', 'bar:c4', 'bar:e4', 'bar:g4']);
    expect(lifted(script)).toEqual(['0', '1', '2']);
  });

  it('is the child’s own tune that is played back when it is right, not the one written down', () => {
    const script = tuneScript(making('correct'), ['c4', 'e4', 'g4'], ['d4', 'g4', 'a4']);
    expect(said(script)).toEqual(['feedback']);
    expect(tones(script)).toEqual(['bar:d4', 'bar:g4', 'bar:a4']);
    const at = script.moments.filter((moment) => moment.sound?.kind === 'tone').map((m) => m.at);
    expect((at[1] ?? 0) - (at[0] ?? 0)).toBe(BAR_TIME);
  });

  it('is left alone after a wrong try: the words say what to change', () => {
    const script = tuneScript(making('incorrect'), ['c4', 'e4', 'g4'], []);
    expect(tones(script)).toEqual([]);
    expect(said(script)).toEqual(['feedback']);
  });
});

describe('the Music Lab’s pictures', () => {
  const { Picture } = musicLab;
  const everything = (): Stimulus[] => {
    const all: Stimulus[] = [];
    for (const lesson of pack().lessons) {
      for (const challenge of lesson.challenges) {
        if (challenge.prompt.stimulus) all.push(challenge.prompt.stimulus);
        if (challenge.kind === 'choose-one') {
          all.push(...challenge.choices.map((choice) => choice.stimulus));
        } else if (challenge.task.type === 'echo') {
          all.push(...challenge.task.cards.map((card) => card.stimulus));
        }
      }
    }
    return all;
  };

  it('can draw everything the pack asks for, and say what each is', () => {
    const all = everything();
    expect(all.length).toBeGreaterThan(150);
    for (const stimulus of all) {
      const { container } = render(<Picture stimulus={stimulus} />);
      expect(container.querySelector('svg'), JSON.stringify(stimulus)).not.toBeNull();
      expect(describePicture(stimulus).length, JSON.stringify(stimulus)).toBeGreaterThan(3);
      cleanup();
    }
  });

  it('never say in words what someone sings: that is the thing to be listened for', () => {
    for (const stimulus of everything()) {
      if (stimulus.type !== 'scene' || stimulus.scene === 'bar' || stimulus.scene === 'beat')
        continue;
      const words = describePicture(stimulus);
      expect(words, words).not.toMatch(/\b(high|low) [A-G]\b|\b[A-G]\b,/);
    }
    expect(describePicture(bird('c5', 'e5'))).toBe('A little bird');
    expect(describePicture(bigBird('c5', 'e5'))).toBe('The big bird');
    expect(describePicture(drum(1, 2))).toBe('A little drum');
  });

  it('draw every bird that is not the leader exactly alike, whatever it sings', () => {
    const one = render(<Picture stimulus={bird('e4')} />).container.innerHTML;
    cleanup();
    const other = render(<Picture stimulus={bird('e5')} />).container.innerHTML;
    cleanup();
    expect(other).toBe(one);
    const leader = render(<Picture stimulus={bigBird('e5')} />).container.innerHTML;
    expect(leader).not.toBe(one);
  });

  it('show which of two is playing, and only that one', () => {
    const { container } = render(<Picture stimulus={pair(['c5'], ['e5'])} sounding part={1} />);
    const parts = [...container.querySelectorAll('[data-part]')];
    expect(parts.map((part) => part.getAttribute('data-sounding'))).toEqual(['false', 'true']);
  });

  it('name a bar by its note, and draw it as long as the note is low', () => {
    expect(describePicture(bar('c4'))).toBe('Chime bar: C');
    expect(describePicture(bar('c5'))).toBe('Chime bar: high C');
    expect(noteWord('e6')).toBe('very high E');
    const tall = (note: string) => {
      const { container } = render(<Picture stimulus={bar(note)} />);
      const height = Number(container.querySelector('rect')?.getAttribute('height'));
      cleanup();
      return height;
    };
    expect(tall('c4')).toBeGreaterThan(tall('g4'));
    expect(tall('g4')).toBeGreaterThan(tall('c6'));
  });

  it('give a bar its own note to play when it is tapped, and nothing else a note', () => {
    expect(musicLab.toneOf?.(bar('g4'))).toEqual({ timbre: 'bar', pitch: 'g4' });
    expect(musicLab.toneOf?.(bird('g4'))).toBeNull();
    expect(musicLab.toneOf?.(sign('high'))).toBeNull();
    expect(pitchOf('g4')).toBe(67);
  });

  it('have words for every sign there is to ask with', () => {
    for (const id of ['high', 'low', 'same', 'different', 'up', 'down', 'hill', 'twice', 'home']) {
      expect(describePicture(sign(id)).length, id).toBeGreaterThan(3);
      const { container } = render(<Picture stimulus={sign(id)} />);
      expect(container.querySelector(`[data-sign="${id}"]`), id).not.toBeNull();
      cleanup();
    }
    expect(musicText.strip(4, 8)).toBe('The beat: 4 beats to listen to, then 8 to tap');
  });
});
