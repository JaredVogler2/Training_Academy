import lexiconFile from '@/art/lexicon.json';
import type { ChooseOneChallenge, Lesson, MakeChallenge, RecallTask, Stimulus } from '@/engine';
import type { Report, WorldRules } from './types';

/**
 * Memory Forest's answers are about what was shown, so its rules compare what is asked with what was there.
 *
 *   things looked at and hidden       one choice was among them, and it is the answer; the others never were
 *   pairs, or things at places        the cue is one of those shown, and the answer is what went with it
 *   a question about the very start   the answer was in the first demonstration, and the others were not
 *   things to pick out again          what is looked at is exactly what is to be picked out
 *   looked at in a chosen way         every way shows the same things, asks about one of them by something that
 *                                     was shown with it, and offers the right one, one that went with something
 *                                     else, and one that was never there
 *   asked for again with no hint      straight after such a question, and for exactly the things looked at there
 *   kept for next time                looked at first; and asked for later on the same cards, for the same things
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

const sameThings = (a: readonly string[], b: readonly string[]) =>
  [...a].sort().join() === [...b].sort().join();

/** Things looked at in a way of the child's choosing: each way has to be a fair question about the same things. */
function lintRecall(task: RecallTask, report: Report): void {
  const { study } = task;
  known(study, report);
  if (task.ways.length !== 3) {
    report('memory-ways', 'the three ways to look are in groups, as a story, and at places');
  }
  if (new Set(task.ways.map((way) => way.answer)).size !== task.ways.length) {
    report('memory-way-answers', 'two ways ask for the same thing: choosing would change nothing');
  }
  for (const { way, scene, cue, choices, answer } of task.ways) {
    const ids = listOf(scene.of.ids);
    const owners = listOf(scene.of.owners);
    const things = listOf(scene.of.things);
    known([...ids, ...owners, ...things], report);
    const asked = pictureId(cue);
    // What went with what is asked about, as this way lays the things out.
    let wanted: string | undefined;
    let shown: string[];
    if (way === 'groups') {
      shown = ids;
      // Two and two: each thing goes with the one beside it.
      const at = asked === null ? -1 : ids.indexOf(asked);
      wanted = at < 0 ? undefined : ids[at % 2 === 0 ? at + 1 : at - 1];
      if (scene.scene !== 'groups' || ids.length !== 4) {
        report('memory-way-scene', 'in groups, four things are shown two and two');
      }
    } else {
      // A story is who has what; places are what was where. Either way, one of each pair is asked about.
      shown = way === 'story' ? [...owners, ...things] : things;
      const at = asked === null ? -1 : owners.indexOf(asked);
      wanted = at < 0 ? undefined : things[at];
      const all = [...owners, ...things];
      if (
        scene.scene !== (way === 'story' ? 'pairs' : 'places') ||
        owners.length < 2 ||
        owners.length !== things.length ||
        new Set(all).size !== all.length
      ) {
        report(
          'memory-way-scene',
          `as ${way === 'story' ? 'a story' : 'places'}, the things are shown in pairs, none twice`,
        );
      }
    }
    if (!sameThings(shown, study)) {
      report('memory-way-things', `the way "${way}" does not show exactly the things to remember`);
    }
    if (wanted === undefined) {
      report('memory-cue', `the way "${way}" asks about something it did not show`);
    } else if (wanted !== answer) {
      report(
        'memory-answer-wrong',
        `the way "${way}" has "${answer}" for its answer, and "${wanted}" went with what is asked about`,
      );
    }
    const others = choices.filter((id) => id !== answer);
    if (!others.some((id) => study.includes(id)) || !others.some((id) => !study.includes(id))) {
      report(
        'memory-way-choices',
        `the way "${way}" must offer one thing that went with something else and one that was never there`,
      );
    }
  }
}

function lintMake(challenge: MakeChallenge, lesson: Lesson, report: Report): void {
  const { task } = challenge;
  if (
    task.type !== 'pairs' &&
    task.type !== 'echo' &&
    task.type !== 'select' &&
    task.type !== 'recall'
  ) {
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
  if (task.type === 'recall') {
    lintRecall(task, report);
    return;
  }
  if (task.type !== 'select') return;

  const { plan } = lesson;
  const taskOf = (id: string | undefined) => {
    const found = lesson.challenges.find((each) => each.id === id);
    return found?.kind === 'make' ? found.task : undefined;
  };
  if (task.recalled === 'just-now') {
    // Asked for again with no hint: it follows the question with one, and is about the same things.
    const first = Object.keys(plan.then ?? {}).find((id) => plan.then?.[id] === challenge.id);
    const before = taskOf(first);
    if (before?.type !== 'recall' || !sameThings(before.study, task.solution)) {
      report(
        'memory-follow',
        'things asked for again with no hint are exactly the ones looked at in the question before',
      );
    }
    return;
  }
  if (task.recalled === 'last-time') {
    // Asked for at the start of the next sitting: the same cards, and the things that were kept.
    const kept = Object.keys(plan.keep?.recall ?? {}).find((id) => {
      const back = plan.keep?.recall[id];
      return back?.sameDay === challenge.id || back?.laterDay === challenge.id;
    });
    const before = taskOf(kept);
    if (
      before?.type !== 'select' ||
      !sameThings(before.solution, task.solution) ||
      !sameThings(
        before.cards.map((card) => card.id),
        task.cards.map((card) => card.id),
      )
    ) {
      report(
        'memory-back',
        'things asked for from last time are the ones that were kept, on the same cards',
      );
    }
    return;
  }
  // Looked at now, and then picked out: what is looked at is what is asked for. That is so of a thing to keep too.
  const study = [...(task.study ?? [])].sort();
  if (study.join() !== [...task.solution].sort().join()) {
    report('memory-study', 'what is looked at is not exactly what is to be picked out again');
  }
}

export const memoryForestRules: WorldRules = (challenge, lesson, report) => {
  if (challenge.kind === 'choose-one') lintChoices(challenge, lesson, report);
  else lintMake(challenge, lesson, report);
};
