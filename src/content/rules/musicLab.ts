import {
  isNote,
  pitchOf,
  type ChooseOneChallenge,
  type Lesson,
  type MakeChallenge,
  type Stimulus,
} from '@/engine';
import type { Report, WorldRules } from './types';

/**
 * The Music Lab's answers are about what is heard, so its rules listen to the notes.
 *
 *   high and low            one note each; none the same; the one marked is the highest (or the lowest); and where
 *                           a child answers alone, the singers all look alike, so that only listening will do
 *   the same, or different  two things to hear, as long as each other; "the same" is right exactly when they are
 *   the same tune again     one of the little ones plays exactly what the big one played, and it is the one marked
 *   play it back            chime bars in order, lowest first, each called by its own note
 *   a beat, a tune          the picture that goes with the task is a picture of that task
 *   bars to tap             never more than five at once: a sixth would make each too narrow on a small phone
 *
 * And everywhere: a note is one a small speaker can play, and an activity whose questions can only be heard says
 * that it needs sound.
 */

/** Below middle C a phone's speaker gives almost nothing; above this a pipe is shrill. */
const LOWEST = pitchOf('c4') ?? 60;
const HIGHEST = pitchOf('e6') ?? 88;
/** The least two notes may differ and still be asked about as high and low: a tone. */
const LEAST_GAP = 2;
/** The most bars there may be to tap in an activity: a sixth, on a screen 320 points wide, leaves each under 56. */
const MOST_BARS = 5;

const VOICES = ['pipe', 'bar', 'drum'];

function listOf(value: unknown): (string | number)[] {
  return Array.isArray(value)
    ? value.filter(
        (each): each is string | number => typeof each === 'string' || typeof each === 'number',
      )
    : [];
}

/** What someone plays: written down so that two can be compared, and how many notes or knocks long it is. */
interface Played {
  written: string;
  long: number;
}

/** What a phrase is made of: null where it is not a proper phrase. */
function played(voice: unknown, notes: unknown, steps: unknown, report: Report): Played | null {
  if (typeof voice !== 'string' || !VOICES.includes(voice)) {
    report('music-voice', `"${String(voice)}" is not something the Music Lab plays on`);
    return null;
  }
  if (voice === 'drum') {
    const knocks = listOf(steps);
    if (notes !== undefined) report('music-drum-notes', 'a drum has knocks, not notes');
    if (
      knocks.length < 2 ||
      knocks.length > 5 ||
      !knocks.every((step) => step === 1 || step === 2)
    ) {
      report(
        'music-drum-steps',
        'a drum pattern is two to five knocks, each short (1) or long (2)',
      );
      return null;
    }
    return { written: `drum:${knocks.join('')}`, long: knocks.length };
  }
  const tune = listOf(notes);
  if (steps !== undefined) report('music-tune-steps', 'a tune here is even notes: it has no steps');
  if (tune.length < 1 || tune.length > 4) {
    report('music-tune-length', 'a tune is one to four notes');
    return null;
  }
  for (const note of tune) {
    const pitch = typeof note === 'string' && isNote(note) ? pitchOf(note) : null;
    if (pitch === null) {
      report('music-note', `"${String(note)}" is not a note`);
      return null;
    }
    if (pitch < LOWEST || pitch > HIGHEST) {
      report('music-note-range', `${String(note)} is outside what a small speaker plays well`);
    }
  }
  return { written: `${voice}:${tune.join('-')}`, long: tune.length };
}

/** The phrase one player has, where the picture is of one player. */
function phraseOf(stimulus: Stimulus, report: Report): Played | null {
  if (stimulus.type !== 'scene') return null;
  if (stimulus.scene === 'bar') return played('bar', [stimulus.of.note ?? ''], undefined, report);
  if (stimulus.scene !== 'phrase') return null;
  return played(stimulus.of.voice, stimulus.of.notes, stimulus.of.steps, report);
}

/** The one note a picture plays, as a pitch, where it plays exactly one. */
function singleNote(stimulus: Stimulus): number | null {
  if (stimulus.type !== 'scene') return null;
  const notes =
    stimulus.scene === 'bar'
      ? [stimulus.of.note]
      : stimulus.scene === 'phrase'
        ? listOf(stimulus.of.notes)
        : [];
  const [only] = notes;
  return notes.length === 1 && typeof only === 'string' ? pitchOf(only) : null;
}

function lintHighLow(
  challenge: ChooseOneChallenge,
  asked: 'high' | 'low',
  lesson: Lesson,
  report: Report,
): void {
  for (const choice of challenge.choices) phraseOf(choice.stimulus, report);
  const pitches = challenge.choices.map((choice) => singleNote(choice.stimulus));
  if (pitches.includes(null)) {
    report('music-high-low-choice', 'each choice is one note, on a bar or sung by a bird');
    return;
  }
  const heights = pitches as number[];
  if (new Set(heights).size !== heights.length) {
    report('music-high-low-same', 'two choices are the same note: neither is higher');
    return;
  }
  const wanted = asked === 'high' ? Math.max(...heights) : Math.min(...heights);
  const right = challenge.choices[heights.indexOf(wanted)];
  if (right?.id !== challenge.answer) {
    report(
      'music-high-low-answer',
      `"${challenge.answer}" is marked correct but "${right?.id ?? ''}" is the ${asked} one`,
    );
  }
  const nearest = Math.min(
    ...heights.filter((height) => height !== wanted).map((height) => Math.abs(height - wanted)),
  );
  if (nearest < LEAST_GAP) {
    report('music-high-low-gap', 'the notes are less than a tone apart: too close to ask about');
  }
  // Alone, there must be nothing to see: a small bar is a high bar.
  const looks = new Set(
    challenge.choices.map((choice) =>
      choice.stimulus.type === 'scene' ? choice.stimulus.scene : '',
    ),
  );
  if (looks.size > 1)
    report('music-high-low-looks', 'the choices are not all the same kind of thing');
  if (lesson.plan.independent.pool.includes(challenge.id) && looks.has('bar')) {
    report(
      'music-high-low-seen',
      'answered alone, the notes must come from things that look alike: a small bar gives it away',
    );
  }
}

function lintPair(challenge: ChooseOneChallenge, report: Report): void {
  const { stimulus } = challenge.prompt;
  if (stimulus.type !== 'scene') return;
  const { voice, first, second, firstSteps, secondSteps } = stimulus.of;
  const one = played(voice, first, firstSteps, report);
  const two = played(voice, second, secondSteps, report);
  const ids = challenge.choices.map((choice) => choice.id).sort();
  const signs = challenge.choices.every(
    (choice) => choice.stimulus.type === 'sign' && choice.stimulus.id === choice.id,
  );
  if (ids.join() !== 'different,same' || !signs) {
    report(
      'music-same-choices',
      'the choices are exactly "same" and "different", each with its sign',
    );
    return;
  }
  if (one === null || two === null) return;
  if (one.long !== two.long) {
    report('music-same-length', 'the two are not as long as each other: counting would answer it');
  }
  const right = one.written === two.written ? 'same' : 'different';
  if (challenge.answer !== right) {
    report('music-same-answer', `"${challenge.answer}" is marked correct but they are ${right}`);
  }
}

function lintAgain(challenge: ChooseOneChallenge, report: Report): void {
  const { stimulus } = challenge.prompt;
  if (stimulus.type !== 'scene') return;
  if (stimulus.of.big !== true) {
    report('music-again-leader', 'the one whose tune is to be found again is the big one');
  }
  const wanted = phraseOf(stimulus, report);
  const offered = challenge.choices.map((choice) => {
    if (choice.stimulus.type === 'scene' && choice.stimulus.of.big !== undefined) {
      report('music-again-leader', `choice "${choice.id}" is drawn big: only the leader is`);
    }
    return phraseOf(choice.stimulus, report);
  });
  if (wanted === null || offered.includes(null)) {
    report(
      'music-again-choice',
      'the leader and every choice have a tune, or a pattern, of their own',
    );
    return;
  }
  const written = offered.map((each) => each?.written ?? '');
  if (new Set(written).size !== written.length) {
    report('music-again-twice', 'two of the choices play the same thing');
  }
  const right = challenge.choices.filter((_, index) => written[index] === wanted.written);
  if (right.length !== 1) {
    report('music-again-count', `${right.length} choices repeat the leader; exactly one must`);
  } else if (right[0]?.id !== challenge.answer) {
    report(
      'music-again-answer',
      `"${challenge.answer}" is marked correct but "${right[0]?.id ?? ''}" is the one that repeats`,
    );
  }
  if (offered.some((each) => each?.long !== wanted.long)) {
    report('music-again-length', 'a choice is longer or shorter than what the leader plays');
  }
}

function lintChoices(challenge: ChooseOneChallenge, lesson: Lesson, report: Report): void {
  // Every one of these questions is put by ear.
  if (lesson.needsSound !== true) {
    report(
      'music-needs-sound',
      'a question that can only be heard is in a lesson that does not say so',
    );
  }
  const { stimulus } = challenge.prompt;
  if (stimulus.type === 'sign' && (stimulus.id === 'high' || stimulus.id === 'low')) {
    lintHighLow(challenge, stimulus.id, lesson, report);
  } else if (stimulus.type === 'scene' && stimulus.scene === 'pair') {
    lintPair(challenge, report);
  } else if (stimulus.type === 'scene' && stimulus.scene === 'phrase') {
    lintAgain(challenge, report);
  } else {
    report('music-lab-question', 'the Music Lab has no rule for this kind of question');
  }
}

function lintMake(challenge: MakeChallenge, report: Report): void {
  const { task, prompt } = challenge;
  switch (task.type) {
    case 'echo': {
      let before = -Infinity;
      for (const card of task.cards) {
        const note =
          card.stimulus.type === 'scene' && card.stimulus.scene === 'bar'
            ? card.stimulus.of.note
            : null;
        if (note !== card.id || !isNote(card.id)) {
          report('music-bar', `card "${card.id}" is not the chime bar of that note`);
          continue;
        }
        const pitch = pitchOf(card.id) ?? 0;
        if (pitch < LOWEST || pitch > HIGHEST) {
          report('music-note-range', `${card.id} is outside what a small speaker plays well`);
        }
        if (pitch <= before) report('music-bars-order', 'the bars must stand lowest first');
        before = pitch;
      }
      if (task.solution.length < 2 || task.solution.length > 4) {
        report('music-echo-length', 'two to four notes are played back');
      }
      if (task.cards.length > MOST_BARS) {
        report('music-bars-many', `more than ${MOST_BARS} bars: each would be too narrow to tap`);
      }
      return;
    }
    case 'beat': {
      const picture = prompt.stimulus;
      const matches =
        picture?.type === 'scene' &&
        picture.scene === 'beat' &&
        picture.of.tempo === task.tempo &&
        picture.of.beats === task.beats;
      if (!matches) report('music-beat-picture', 'the picture is not of this beat');
      return;
    }
    case 'tune': {
      const picture = prompt.stimulus;
      if (picture?.type !== 'sign' || picture.id !== task.shape) {
        report('music-tune-picture', 'the sign is not the sign of the shape asked for');
      }
      for (const note of task.notes) {
        const pitch = pitchOf(note) ?? 0;
        if (pitch < LOWEST || pitch > HIGHEST) {
          report('music-note-range', `${note} is outside what a small speaker plays well`);
        }
      }
      if (task.shape === 'twice' && task.length % 2 !== 0) {
        report('music-tune-twice', 'a tune said twice has an even number of notes');
      }
      if (task.notes.length > MOST_BARS) {
        report('music-bars-many', `more than ${MOST_BARS} bars: each would be too narrow to tap`);
      }
      return;
    }
    case 'give':
    case 'order':
    case 'select':
    case 'pairs':
    case 'program':
    case 'design':
      report('music-lab-task', `the Music Lab has no rule for a "${task.type}" task`);
  }
}

export const musicLabRules: WorldRules = (challenge, lesson, report) => {
  if (challenge.kind === 'choose-one') lintChoices(challenge, lesson, report);
  else lintMake(challenge, report);
};
