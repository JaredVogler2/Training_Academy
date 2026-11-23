import lexiconFile from '@/art/lexicon.json';
import type { ChooseOneChallenge, Lesson, MakeChallenge, Stimulus } from '@/engine';
import type { Report, WorldRules } from './types';

/**
 * Memory Forest's answers are about what was shown, so its rules compare what is asked with what was there.
 *
 *   things looked at and hidden       one choice was among them, and it is the answer; the others never were
 *   pairs, or things at places        the cue is one of those shown, and the answer is what went with it
 *   a question about the very start   the answer was in the first demonstration, and the others were not
 *   things to pick out again          what is looked at is exactly what is to be picked out
 *
 * And everywhere: what is to be remembered is glanced at and then covered, never left on show.
 */

const lexicon: Readonly<Record<string, unknown>> = lexiconFile.words;

const pictureId = (stimulus: Stimulus): string | null =>
  stimulus.type === 'picture' ? stimulus.id : null;

function listOf(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((each): each is string => typeof each === 'string')
    : [];
}

function known(ids: readonly string[], report: Report): void {
  for (const id of ids) {
    if (!(id in lexicon)) report('picture-unknown', `"${id}" is not a picture the kit has`);
  }
}

/** Exactly one choice is the thing wanted, and it is the one marked. */
function oneRight(challenge: ChooseOneChallenge, wanted: readonly string[], report: Report): void {
  const offered = challenge.choices.map((choice) => pictureId(choice.stimulus));
  if (offered.includes(null)) report('memory-choice', 'a choice is not a picture');
  if (new Set(offered).size !== offered.length)
    report('memory-choice-twice', 'a picture is offered twice');
  const right = challenge.choices.filter((choice) =>
    wanted.includes(pictureId(choice.stimulus) ?? ''),
  );
  if (right.length !== 1) {
    report('memory-answer-count', `${right.length} choices are right; exactly one must be`);
  } else if (right[0]?.id !== challenge.answer) {
    report(
      'memory-answer-wrong',
      `"${challenge.answer}" is marked correct but "${right[0]?.id}" is`,
    );
  }
}

/** The things shown in a lesson's first demonstration, where that is a glance at some things. */
function shownFirst(lesson: Lesson): string[] {
  const first = lesson.challenges.find((challenge) => challenge.id === lesson.plan.demo[0]);
  if (first?.kind !== 'choose-one' || first.prompt.stimulus.type !== 'scene') return [];
  return listOf(first.prompt.stimulus.of.ids);
}

function lintChoices(challenge: ChooseOneChallenge, lesson: Lesson, report: Report): void {
  const { stimulus, glance, cue, ask } = challenge.prompt;
  known(
    challenge.choices.flatMap((choice) => pictureId(choice.stimulus) ?? []),
    report,
  );

  if (stimulus.type === 'sign' && stimulus.id === 'earlier') {
    if (!(lesson.plan.closing ?? []).includes(challenge.id)) {
      report('memory-earlier', 'a question about the very start has to be asked at the very end');
    }
    const first = shownFirst(lesson);
    if (first.length === 0) report('memory-earlier', 'the lesson does not start by showing things');
    oneRight(challenge, first, report);
    return;
  }

  if (stimulus.type !== 'scene') {
    report('memory-forest-question', 'Memory Forest has no rule for this kind of question');
    return;
  }
  // What is to be remembered is looked at and then covered, and the question is put afterwards.
  if (glance !== true || ask === undefined) {
    report('memory-glance', 'things to remember are glanced at, covered, and then asked about');
  }

  if (stimulus.scene === 'things') {
    const ids = listOf(stimulus.of.ids);
    known(ids, report);
    if (ids.length < 2 || new Set(ids).size !== ids.length) {
      report('memory-scene', 'things to remember are two or more, all different');
    }
    if (cue !== undefined)
      report('memory-cue', 'nothing stands in for things that were simply there');
    oneRight(challenge, ids, report);
    return;
  }

  if (stimulus.scene === 'pairs' || stimulus.scene === 'places') {
    const owners = listOf(stimulus.of.owners);
    const things = listOf(stimulus.of.things);
    known([...owners, ...things], report);
    const all = [...owners, ...things];
    if (owners.length < 2 || owners.length !== things.length || new Set(all).size !== all.length) {
      report(
        'memory-scene',
        'pairs are two or more, each of two different things, none shown twice',
      );
      return;
    }
    const asked = cue === undefined ? null : pictureId(cue);
    const at = asked === null ? -1 : owners.indexOf(asked);
    if (at < 0) {
      report('memory-cue', 'what is asked about has to be one of those that were shown');
      return;
    }
    oneRight(challenge, [things[at] ?? ''], report);
    return;
  }

  report('memory-forest-question', `Memory Forest has no scene called "${stimulus.scene}"`);
}

function lintMake(challenge: MakeChallenge, report: Report): void {
  const { task } = challenge;
  if (task.type !== 'pairs' && task.type !== 'echo' && task.type !== 'select') {
    report('memory-forest-task', `Memory Forest has no rule for a "${task.type}" task`);
    return;
  }
  for (const card of task.cards) {
    if (pictureId(card.stimulus) !== card.id) {
      report('memory-card', `card "${card.id}" is not the picture of that name`);
    }
  }
  known(
    task.cards.map((card) => card.id),
    report,
  );
  if (task.type === 'select') {
    const study = [...(task.study ?? [])].sort();
    if (study.join() !== [...task.solution].sort().join()) {
      report('memory-study', 'what is looked at is not exactly what is to be picked out again');
    }
  }
}

export const memoryForestRules: WorldRules = (challenge, lesson, report) => {
  if (challenge.kind === 'choose-one') lintChoices(challenge, lesson, report);
  else lintMake(challenge, report);
};
