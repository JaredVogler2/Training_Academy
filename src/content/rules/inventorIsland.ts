import {
  CONTROLS,
  OUTCOMES,
  setupProblem,
  startingDesign,
  testDesign,
  testSetup,
  type ChooseOneChallenge,
  type MakeChallenge,
  type Setup,
  type Stimulus,
} from '@/engine';
import type { Report, WorldRules } from './types';

/**
 * Inventor Island's answers are what happens when a thing is tested, so its rules test the thing.
 *
 *   a guess   the set-up shown is one the models know; every choice is that same set-up afterwards, each a
 *             different way it could turn out; and the one marked right is what the model says happens
 *   a mend    what is handed to the child is a whole set-up the models know, it does not work as it stands, and
 *             the picture beside the task is a picture of it
 *
 * (That the design shown as the answer works, and that at least one design does not, is checked for every pack:
 * see src/content/lint.ts.)
 */

type Scene = Extract<Stimulus, { type: 'scene' }>;

/** A scene's set-up, without the word for how it turned out. */
function setupOf(scene: Scene): Setup {
  const setup: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(scene.of)) {
    if (key !== 'shown' && (typeof value === 'string' || typeof value === 'number')) {
      setup[key] = value;
    }
  }
  return setup;
}

const sameSetup = (a: Setup, b: Setup): boolean => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
};

/** The tag for a guess that did not come true: what the child thought would happen. */
export function guessMisconception(shown: string): string {
  return `predicted-${shown}`;
}

function lintGuess(challenge: ChooseOneChallenge, asked: Scene, report: Report): void {
  const bench = asked.scene;
  const setup = setupOf(asked);
  if ('shown' in asked.of)
    report('guess-given-away', 'the set-up shown already says how it turns out');
  const problem = setupProblem(bench, setup);
  if (problem !== null) {
    report('setup-malformed', `the ${bench} shown cannot be tested: ${problem}`);
    return;
  }
  const happens = testSetup(bench, setup)?.outcome;
  const possible = OUTCOMES[bench] ?? [];

  const shown: string[] = [];
  for (const choice of challenge.choices) {
    const picture = choice.stimulus;
    if (
      picture.type !== 'scene' ||
      picture.scene !== bench ||
      !sameSetup(setupOf(picture), setup)
    ) {
      report(
        'guess-choice-setup',
        `choice "${choice.id}" is not the set-up that was shown, afterwards`,
      );
      return;
    }
    const outcome = String(picture.of.shown ?? '');
    if (!possible.includes(outcome)) {
      report(
        'guess-outcome-unknown',
        `choice "${choice.id}" shows "${outcome}", which a ${bench} cannot do`,
      );
      return;
    }
    if (shown.includes(outcome)) {
      report('guess-outcome-duplicate', `two choices both show "${outcome}"`);
    }
    shown.push(outcome);
  }

  const marked = challenge.choices.findIndex((choice) => choice.id === challenge.answer);
  if (shown[marked] !== happens) {
    report(
      'guess-answer-wrong',
      `"${challenge.answer}" is marked right and shows "${String(shown[marked])}", but tested it is "${String(happens)}"`,
    );
  }
  challenge.choices.forEach((choice, index) => {
    if (choice.id === challenge.answer) return;
    const expected = guessMisconception(shown[index] ?? '');
    const actual = challenge.misconceptions?.[choice.id];
    if (actual === undefined) {
      report(
        'misconception-missing',
        `distractor "${choice.id}" has no misconception tag`,
        'warning',
      );
    } else if (actual !== expected) {
      report(
        'misconception-wrong',
        `distractor "${choice.id}" is tagged "${actual}", not "${expected}"`,
      );
    }
  });
}

function lintMend(challenge: MakeChallenge, report: Report): void {
  const { task } = challenge;
  if (task.type !== 'design') {
    report('inventor-island-task', `Inventor Island has no rule for a "${task.type}" task`);
    return;
  }
  const parts = CONTROLS[task.model] ?? {};
  for (const control of task.controls) {
    const known = parts[control.id];
    if (!known) {
      report('design-control-unknown', `a ${task.model} has no "${control.id}" to change`);
      return;
    }
    for (const option of control.options) {
      if (!known.includes(option)) {
        report('design-option-unknown', `"${option}" is not something a ${control.id} can be`);
        return;
      }
    }
  }

  // What the child is handed is a whole set-up: every part is either fixed or has a value to start from.
  const problem = setupProblem(task.model, task.given);
  if (problem !== null) {
    report(
      'setup-malformed',
      `the ${task.model} to mend cannot be tested as it stands: ${problem}`,
    );
    return;
  }
  const start = startingDesign(task);
  task.controls.forEach((control, index) => {
    if (task.given[control.id] !== start[index]) {
      report(
        'design-start-unbuildable',
        `the ${control.id} it starts with is not one the child could choose`,
      );
    }
  });
  if (testDesign(task, start)?.works) {
    report('design-start-works', 'there is nothing to mend: it works as it is handed over');
  }

  const beside = challenge.prompt.stimulus;
  if (
    beside?.type !== 'scene' ||
    beside.scene !== task.model ||
    'shown' in beside.of ||
    !sameSetup(setupOf(beside), task.given)
  ) {
    report(
      'design-picture',
      'the picture beside the task is not a picture of what is to be mended',
    );
  }
}

export const inventorIslandRules: WorldRules = (challenge, _lesson, report) => {
  if (challenge.kind === 'make') {
    lintMend(challenge, report);
    return;
  }
  const asked = challenge.prompt.stimulus;
  if (asked.type === 'scene') lintGuess(challenge, asked, report);
  else report('inventor-island-question', 'Inventor Island has no rule for this kind of question');
};
