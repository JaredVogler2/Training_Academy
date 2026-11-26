import {
  comparePitch,
  fitsShape,
  fitsTask,
  parseProgram,
  quantityMisconception,
  runProgram,
  solutionOf,
  solutionParts,
  solveProgram,
  testDesign,
  type BeatTask,
  type Challenge,
  type ChooseOneChallenge,
  type ContentPack,
  type DesignTask,
  type Lesson,
  type MakeChallenge,
  type ProgramTask,
  type TuneTask,
} from '@/engine';
import { WORLD_RULES, type Report, type WorldRules } from './rules';

/**
 * Checks on authored content that a schema cannot express: references, the prerequisite graph, and whether each
 * challenge is actually *correct* (the marked answer is the one and only right one).
 *
 * The schema says a pack is well-formed; this says it is safe to teach with. What makes an answer right depends on
 * what is being taught, so each world brings its own rules for that (src/content/rules). It runs in the unit tests
 * (tests/content), so a pack with an error cannot be merged; it is not shipped to the browser.
 */

export interface LintIssue {
  severity: 'error' | 'warning';
  code: string;
  /** Where in the pack, for a person to find it. */
  where: string;
  message: string;
}

export type { Report } from './rules';

export { quantityMisconception };

function duplicates<T>(values: readonly T[]): T[] {
  const seen = new Set<T>();
  const repeated = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

function findCycle(graph: Map<string, readonly string[]>): string[] | null {
  const state = new Map<string, 'visiting' | 'done'>();
  const trail: string[] = [];
  const visit = (node: string): string[] | null => {
    if (state.get(node) === 'done') return null;
    if (state.get(node) === 'visiting') return [...trail.slice(trail.indexOf(node)), node];
    state.set(node, 'visiting');
    trail.push(node);
    for (const next of graph.get(node) ?? []) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    trail.pop();
    state.set(node, 'done');
    return null;
  };
  for (const node of graph.keys()) {
    const cycle = visit(node);
    if (cycle) return cycle;
  }
  return null;
}

/** A question with choices: the choices are told apart, the answer is one of them, the hints never remove it. */
function lintChoices(challenge: ChooseOneChallenge, report: Report): void {
  const choiceIds = challenge.choices.map((choice) => choice.id);
  for (const id of duplicates(choiceIds))
    report('choice-id-duplicate', `choice id "${id}" is used twice`);
  for (const label of duplicates(challenge.choices.map((choice) => choice.label))) {
    report('choice-label-duplicate', `two choices are both labelled "${label}"`);
  }
  if (!choiceIds.includes(challenge.answer)) {
    report('answer-missing', `answer "${challenge.answer}" is not one of the choices`);
  }
  const distractors = choiceIds.filter((id) => id !== challenge.answer);
  const { cue, ask, glance } = challenge.prompt;
  if ((cue !== undefined || ask !== undefined) && glance !== true) {
    report(
      'cue-without-glance',
      'a cue, or a question put afterwards, is for something that is covered, and this never is',
    );
  }
  for (const id of Object.keys(challenge.misconceptions ?? {})) {
    if (!distractors.includes(id)) {
      report(
        'misconception-target',
        `misconception is given for "${id}", which is not a distractor`,
      );
    }
  }

  // Hint ladder: never removes the answer, ends by revealing it, and does not reveal early.
  challenge.hints.forEach((hint, index) => {
    const last = index === challenge.hints.length - 1;
    if (hint.type === 'step') {
      report('hint-step-choices', `hint ${index + 1} gives a part of an answer that has no parts`);
    }
    if (hint.type === 'eliminate') {
      for (const id of hint.remove) {
        if (!distractors.includes(id)) {
          report(
            'hint-eliminate-target',
            `hint ${index + 1} removes "${id}", which is not a distractor`,
          );
        }
      }
      if (hint.remove.length >= distractors.length && !last) {
        report(
          'hint-eliminate-all',
          `hint ${index + 1} removes every distractor before the last rung`,
        );
      }
    }
    if (hint.type === 'reveal' && !last) {
      report('hint-reveal-early', `hint ${index + 1} reveals the answer before the last rung`);
    }
    if (last && hint.type !== 'reveal') {
      report('hint-ladder-end', 'the last hint must reveal the answer so a child is never stuck');
    }
  });
}

/** A robot's task: everything is on the grid, the answer shown gets there, and nothing shorter could be tapped out. */
function lintProgram(task: ProgramTask, report: Report): void {
  const { columns, rows } = task.grid;
  const on = ([column, row]: readonly [number, number]) => column < columns && row < rows;
  const same = (a: readonly [number, number], b: readonly [number, number]) =>
    a[0] === b[0] && a[1] === b[1];
  const water = task.water ?? [];
  const bridges = task.bridges ?? [];
  for (const cell of [task.start.at, task.goal, ...task.rocks, ...water, ...bridges]) {
    if (!on(cell)) report('program-off-grid', `[${cell.join(', ')}] is not on the grid`);
  }
  if (same(task.start.at, task.goal))
    report('program-no-journey', 'the robot starts where it is going');
  for (const rock of task.rocks) {
    if (same(rock, task.start.at) || same(rock, task.goal)) {
      report('program-rock', `a rock lies on ${same(rock, task.goal) ? 'the goal' : 'the start'}`);
    }
  }
  // Water and bridges: each square is one thing, and the robot neither starts on one nor is going to one.
  const laid: [string, readonly [number, number]][] = [
    ...task.rocks.map((cell): [string, readonly [number, number]] => ['a rock', cell]),
    ...water.map((cell): [string, readonly [number, number]] => ['water', cell]),
    ...bridges.map((cell): [string, readonly [number, number]] => ['a bridge', cell]),
  ];
  for (const [index, [what, cell]] of laid.entries()) {
    const before = laid.slice(0, index).find(([, other]) => same(other, cell));
    if (before) {
      report('program-square-twice', `[${cell.join(', ')}] is ${before[0]} and ${what} at once`);
    }
  }
  for (const cell of [...water, ...bridges]) {
    if (same(cell, task.start.at) || same(cell, task.goal)) {
      report(
        'program-in-the-river',
        `the robot ${same(cell, task.goal) ? 'is going to' : 'starts on'} water or a bridge`,
      );
    }
  }
  // A bridge may be up, and waiting is how that is met: the one is never there without the other.
  const waits = task.commands.includes('wait');
  if (bridges.length > 0 && !waits) {
    report('program-bridge-no-wait', 'there is a bridge and no way to wait for it');
  }
  if (bridges.length === 0 && waits) {
    report('program-wait-no-bridge', 'waiting is offered and there is nothing to wait for');
  }
  if ((task.whenRight?.length ?? 0) !== bridges.length) {
    report(
      'program-bridges-shown',
      'how the bridges stand for a program that works is not said once for each bridge',
    );
  }
  // A row that is changed from its end and run a step at a time is a plan: nothing else is drawn that way.
  if (
    task.stepwise === true &&
    (task.live || task.repeats > 1 || task.given !== undefined || bridges.length > 0)
  ) {
    report(
      'program-stepwise-plain',
      'a row run a step at a time is a plan made once: not live, not done over, not to mend, and with no bridge',
    );
  }
  const shown = parseProgram(task.solution);
  if (!shown || !fitsTask(task, shown)) {
    report(
      'program-solution-unbuildable',
      'the answer shown cannot be built from what the task offers',
    );
  } else if (runProgram(task, shown).outcome !== 'arrived') {
    report('program-solution-wrong', 'the answer shown does not get the robot there');
  } else {
    const shortest = solveProgram(task);
    if (shortest && shortest.commands.length < shown.commands.length) {
      report(
        'program-solution-long',
        'there is a shorter program than the answer shown',
        'warning',
      );
    }
  }
  if (task.given !== undefined) {
    const start = parseProgram(task.given);
    if (!start || !fitsTask(task, start)) {
      report(
        'program-given-unbuildable',
        'the program to mend cannot be built from what the task offers',
      );
    } else if (runProgram(task, start).outcome === 'arrived') {
      report('program-given-works', 'the program to mend has nothing wrong with it');
    }
  }
}

/** A workbench task: the design shown is one the controls allow, and it works. */
function lintDesign(task: DesignTask, report: Report): void {
  for (const id of duplicates(task.controls.map((control) => control.id))) {
    report('design-control-duplicate', `control "${id}" is there twice`);
  }
  const shown = testDesign(task, task.solution);
  if (!shown)
    report('design-solution-unbuildable', 'the design shown is not one the controls allow');
  else if (!shown.works)
    report('design-solution-wrong', `the design shown does not work: ${shown.outcome}`);
  // There has to be something to find out: at least one design that does not work.
  const all = task.controls.reduce<string[][]>(
    (designs, control) =>
      designs.flatMap((design) => control.options.map((option) => [...design, option])),
    [[]],
  );
  if (shown && all.every((design) => testDesign(task, design)?.works)) {
    report('design-nothing-to-find', 'every design works, so there is nothing to find out');
  }
}

/** A beat to tap: enough of it has to be met that tapping at any old time will not do. */
function lintBeat(task: BeatTask, report: Report): void {
  if (task.need > task.beats) {
    report('beat-need', `${task.need} beats have to be met and there are only ${task.beats}`);
  } else if (task.need * 2 <= task.beats) {
    report('beat-need', 'half the beats or fewer would do: tapping at half the pace would pass');
  }
}

/** A tune to make up: the bars are in order, the tune shown is one they allow, and it has the shape asked for. */
function lintTune(task: TuneTask, report: Report): void {
  for (const [index, note] of task.notes.entries()) {
    const before = task.notes[index - 1];
    if (before !== undefined && comparePitch(note, before) <= 0) {
      report('tune-notes', 'the bars must go from the lowest to the highest, with none twice');
    }
  }
  if (
    task.solution.length !== task.length ||
    !task.solution.every((note) => task.notes.includes(note))
  ) {
    report('tune-solution-unbuildable', 'the tune shown cannot be played on the bars there are');
    return;
  }
  const verdict = fitsShape(task.shape, task.solution, task.notes[0] ?? '');
  if (!verdict.fits) {
    report(
      'tune-solution-wrong',
      `the tune shown does not have the shape asked for: ${verdict.problem ?? ''}`,
    );
  }
}

/** A thing to make: its cards are told apart, its answer can be made from them, its hints lead to it. */
function lintTask(challenge: MakeChallenge, report: Report): void {
  const { task } = challenge;
  if (task.type === 'program') lintProgram(task, report);
  else if (task.type === 'design') lintDesign(task, report);
  else if (task.type === 'beat') lintBeat(task, report);
  else if (task.type === 'tune') lintTune(task, report);
  else if (task.type !== 'give') {
    const ids = task.cards.map((card) => card.id);
    for (const id of duplicates(ids)) report('card-id-duplicate', `card id "${id}" is used twice`);
    for (const label of duplicates(task.cards.map((card) => card.label))) {
      report('card-label-duplicate', `two cards are both labelled "${label}"`);
    }
    if (task.type !== 'pairs') {
      for (const id of task.solution) {
        if (!ids.includes(id)) report('solution-card', `the answer uses "${id}", which is no card`);
      }
    }
    if (task.type === 'order') {
      if (task.solution.length !== ids.length || duplicates(task.solution).length > 0) {
        report('order-solution', 'the answer must put every card in a place, once');
      }
    }
    if (task.type === 'select') {
      if (duplicates(task.solution).length > 0)
        report('select-solution', 'the answer lists a card twice');
      if (task.solution.length >= ids.length) {
        report('select-all', 'every card belongs, so there is nothing to tell apart');
      }
      for (const id of task.study ?? []) {
        if (!task.solution.includes(id)) {
          report('select-study', `"${id}" is shown to be remembered but is not part of the answer`);
        }
      }
      if ((task.study === undefined) !== (task.ask === undefined)) {
        report('select-ask', 'things to remember and the question about them go together');
      }
    }
    if (task.type === 'pairs' && task.par < ids.length) {
      report('pairs-par', `no one can find ${ids.length} pairs in ${task.par} turns`);
    }
  } else if (task.pile <= task.want.count) {
    report(
      'give-pile',
      `there are ${task.pile} to give and ${task.want.count} are wanted: giving them all would be right`,
    );
  }

  const parts = solutionParts(task).length;
  const showable = solutionOf(task) !== null;
  let given = 0;
  challenge.hints.forEach((hint, index) => {
    const last = index === challenge.hints.length - 1;
    if (hint.type === 'eliminate') {
      report('hint-eliminate-task', `hint ${index + 1} removes choices from a task that has none`);
    }
    if (hint.type === 'step') {
      given += hint.count;
      if (!showable)
        report(
          'hint-step-task',
          `hint ${index + 1} gives a part of an answer that cannot be shown`,
        );
      else if (given >= parts && !last) {
        report('hint-step-all', `hint ${index + 1} gives the whole answer before the last rung`);
      }
    }
    if (hint.type === 'reveal') {
      if (!showable)
        report('hint-reveal-task', `hint ${index + 1} reveals an answer that cannot be shown`);
      else if (!last) {
        report('hint-reveal-early', `hint ${index + 1} reveals the answer before the last rung`);
      }
    }
    if (last && showable && hint.type !== 'reveal') {
      report('hint-ladder-end', 'the last hint must reveal the answer so a child is never stuck');
    }
  });
}

function lintChallenge(
  challenge: Challenge,
  lesson: Lesson,
  pack: ContentPack,
  report: Report,
  worldRules: WorldRules | null,
): void {
  if (!challenge.id.startsWith(`${lesson.id}.`)) {
    report('challenge-id-prefix', `id must start with "${lesson.id}."`);
  }
  if (!lesson.skillIds.includes(challenge.skillId)) {
    report('challenge-skill', `skill ${challenge.skillId} is not one of the lesson's skills`);
  }

  if (challenge.kind === 'choose-one') lintChoices(challenge, report);
  else lintTask(challenge, report);

  // What makes the answer right is the world's own business.
  if (worldRules) worldRules(challenge, lesson, report, pack);
  else report('world-rules', `${pack.world} has no rules to check its answers with`);

  const strings = pack.strings.en;
  for (const key of stringsOf(challenge)) {
    if (!(key in strings)) report('string-missing', `string "${key}" is not defined`);
  }
}

/** Every line a challenge can show or say, by key. */
export function stringsOf(challenge: Challenge): string[] {
  const keys = [
    challenge.prompt.instruction,
    challenge.feedback.correct,
    challenge.feedback.incorrect,
    ...challenge.hints.map((hint) => hint.caption),
  ];
  if (challenge.kind === 'make' && challenge.task.type === 'select' && challenge.task.ask) {
    keys.push(challenge.task.ask);
  }
  if (challenge.kind === 'choose-one' && challenge.prompt.ask) keys.push(challenge.prompt.ask);
  return keys;
}

function lintLesson(
  lesson: Lesson,
  pack: ContentPack,
  issues: LintIssue[],
  usedStrings: Set<string>,
  worldRules: WorldRules | null,
): void {
  const where = `lesson ${lesson.id}`;
  const report = (code: string, message: string, severity: LintIssue['severity'] = 'error') =>
    issues.push({ severity, code, where, message });

  if (lesson.world !== pack.world)
    report('lesson-world', `world is ${lesson.world}, pack is ${pack.world}`);
  const skillIds = new Set(pack.skills.map((skill) => skill.id));
  for (const skillId of lesson.skillIds) {
    if (!skillIds.has(skillId))
      report('lesson-skill-unknown', `skill ${skillId} is not defined in the pack`);
  }

  const { demo, guided, independent } = lesson.plan;
  const closing = lesson.plan.closing ?? [];
  const planned = [...demo, ...guided, ...independent.pool, ...closing];
  const own = new Set(lesson.challenges.map((challenge) => challenge.id));
  for (const id of planned) {
    if (!own.has(id))
      report('plan-reference', `plan refers to ${id}, which the lesson does not define`);
  }
  for (const id of duplicates(planned)) {
    report('plan-duplicate', `${id} appears more than once in the plan`);
  }
  for (const id of own) {
    if (!planned.includes(id))
      report('challenge-orphan', `${id} is never used by the plan`, 'warning');
  }
  if (independent.count > independent.pool.length) {
    report('plan-count', `draws ${independent.count} from a pool of ${independent.pool.length}`);
  }
  if (lesson.successCriteria.independentFirstTryCorrect > independent.count + closing.length) {
    report(
      'success-criteria',
      'asks for more independent successes than there are independent steps',
    );
  }
  if (independent.maxReprobes > independent.pool.length - independent.count) {
    report('plan-reprobes', 'allows more re-probes than the pool can supply', 'warning');
  }

  // Evidence of independence needs more than one presentation, so a lesson must be able to offer more than one.
  const independentVariants = new Set(
    lesson.challenges
      .filter((challenge) => independent.pool.includes(challenge.id))
      .map((challenge) => challenge.variant),
  );
  if (independentVariants.size < 2) {
    report('plan-variants', 'the independent pool needs at least two different variants');
  }

  for (const challenge of lesson.challenges) {
    lintChallenge(
      challenge,
      lesson,
      pack,
      (code, message, severity = 'error') =>
        issues.push({ severity, code, where: `challenge ${challenge.id}`, message }),
      worldRules,
    );
    for (const key of stringsOf(challenge)) usedStrings.add(key);
  }
}

/**
 * Lint one pack. `knownSkillIds` lists skills defined in other packs, so prerequisites may cross worlds.
 * `worldRules` is the world's own check of its answers; left out, it is the one registered for the pack's world.
 */
export function lintPack(
  pack: ContentPack,
  knownSkillIds: readonly string[] = [],
  worldRules: WorldRules | null = WORLD_RULES[pack.world] ?? null,
): LintIssue[] {
  const issues: LintIssue[] = [];
  const report = (
    code: string,
    where: string,
    message: string,
    severity: LintIssue['severity'] = 'error',
  ) => issues.push({ severity, code, where, message });

  for (const id of duplicates(pack.skills.map((skill) => skill.id))) {
    report('skill-id-duplicate', `skill ${id}`, 'defined more than once');
  }
  for (const id of duplicates(pack.lessons.map((lesson) => lesson.id))) {
    report('lesson-id-duplicate', `lesson ${id}`, 'defined more than once');
  }
  const challengeIds = pack.lessons.flatMap((lesson) => lesson.challenges.map((c) => c.id));
  for (const id of duplicates(challengeIds)) {
    report('challenge-id-duplicate', `challenge ${id}`, 'defined more than once');
  }

  const allSkills = new Set([...knownSkillIds, ...pack.skills.map((skill) => skill.id)]);
  for (const skill of pack.skills) {
    const where = `skill ${skill.id}`;
    if (skill.world !== pack.world) {
      report('skill-world', where, `world is ${skill.world}, pack is ${pack.world}`);
    }
    for (const prerequisite of skill.prerequisites) {
      if (prerequisite === skill.id) report('skill-prerequisite-self', where, 'requires itself');
      else if (!allSkills.has(prerequisite)) {
        report(
          'skill-prerequisite-unknown',
          where,
          `requires ${prerequisite}, which is not defined`,
        );
      }
    }
    if (!pack.lessons.some((lesson) => lesson.skillIds.includes(skill.id))) {
      report('skill-untaught', where, 'no lesson teaches this skill', 'warning');
    }
  }
  const cycle = findCycle(new Map(pack.skills.map((skill) => [skill.id, skill.prerequisites])));
  if (cycle)
    report('skill-prerequisite-cycle', 'skills', `prerequisites loop: ${cycle.join(' → ')}`);

  const usedStrings = new Set<string>();
  for (const lesson of pack.lessons) lintLesson(lesson, pack, issues, usedStrings, worldRules);
  for (const key of Object.keys(pack.strings.en)) {
    if (!usedStrings.has(key)) report('string-unused', `string ${key}`, 'never used', 'warning');
  }
  return issues;
}
