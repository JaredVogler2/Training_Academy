import type { Challenge, ContentPack, Lesson } from '@/engine';

/**
 * Checks on authored content that a schema cannot express: references, the prerequisite graph, and whether each
 * challenge is actually *correct* (the marked answer is the one and only right one).
 *
 * The schema says a pack is well-formed; this says it is safe to teach with. It runs in the unit tests
 * (tests/content), so a pack with an error cannot be merged; it is not shipped to the browser.
 */

export interface LintIssue {
  severity: 'error' | 'warning';
  code: string;
  /** Where in the pack, for a person to find it. */
  where: string;
  message: string;
}

/** The tag a quantity distractor should carry, from how far it is from the target. */
export function quantityMisconception(target: number, chosen: number): string {
  const difference = chosen - target;
  if (difference === 1) return 'one-more';
  if (difference === -1) return 'one-fewer';
  return difference > 0 ? 'many-more' : 'many-fewer';
}

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

function lintChallenge(
  challenge: Challenge,
  lesson: Lesson,
  strings: Record<string, string>,
  report: (code: string, message: string, severity?: LintIssue['severity']) => void,
): void {
  if (!challenge.id.startsWith(`${lesson.id}.`)) {
    report('challenge-id-prefix', `id must start with "${lesson.id}."`);
  }
  if (!lesson.skillIds.includes(challenge.skillId)) {
    report('challenge-skill', `skill ${challenge.skillId} is not one of the lesson's skills`);
  }

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

  // The marked answer must be the only correct choice.
  const target = challenge.prompt.stimulus;
  const matching = challenge.choices.filter((choice) => choice.stimulus.count === target.count);
  if (matching.length !== 1) {
    report(
      'quantity-answer-count',
      `${matching.length} choices show ${target.count}; exactly one must`,
    );
  } else if (matching[0]?.id !== challenge.answer) {
    report(
      'quantity-answer-wrong',
      `"${challenge.answer}" is marked correct but "${matching[0]?.id}" is the group of ${target.count}`,
    );
  }
  for (const count of duplicates(challenge.choices.map((choice) => choice.stimulus.count))) {
    report('quantity-duplicate-choice', `two choices both show ${count}`);
  }
  for (const choice of matching) {
    if (
      choice.stimulus.item === target.item &&
      choice.stimulus.arrangement === target.arrangement
    ) {
      report(
        'quantity-picture-match',
        `"${choice.id}" is the same picture as the prompt, so it can be matched without attending to amount`,
      );
    }
  }
  for (const choice of challenge.choices) {
    if (choice.id === challenge.answer) continue;
    const expected = quantityMisconception(target.count, choice.stimulus.count);
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
        `distractor "${choice.id}" is tagged "${actual}" but shows ${choice.stimulus.count} against ${target.count} ("${expected}")`,
      );
    }
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

  const keys = [
    challenge.prompt.instruction,
    challenge.feedback.correct,
    challenge.feedback.incorrect,
    ...challenge.hints.map((hint) => hint.caption),
  ];
  for (const key of keys) {
    if (!(key in strings)) report('string-missing', `string "${key}" is not defined`);
  }
}

function lintLesson(
  lesson: Lesson,
  pack: ContentPack,
  issues: LintIssue[],
  usedStrings: Set<string>,
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
  const planned = [...demo, ...guided, ...independent.pool];
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
  if (lesson.successCriteria.independentFirstTryCorrect > independent.count) {
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
    lintChallenge(challenge, lesson, pack.strings.en, (code, message, severity = 'error') =>
      issues.push({ severity, code, where: `challenge ${challenge.id}`, message }),
    );
    usedStrings.add(challenge.prompt.instruction);
    usedStrings.add(challenge.feedback.correct);
    usedStrings.add(challenge.feedback.incorrect);
    for (const hint of challenge.hints) usedStrings.add(hint.caption);
  }
}

/**
 * Lint one pack. `knownSkillIds` lists skills defined in other packs, so prerequisites may cross worlds.
 */
export function lintPack(pack: ContentPack, knownSkillIds: readonly string[] = []): LintIssue[] {
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
  for (const lesson of pack.lessons) lintLesson(lesson, pack, issues, usedStrings);
  for (const key of Object.keys(pack.strings.en)) {
    if (!usedStrings.has(key)) report('string-unused', `string ${key}`, 'never used', 'warning');
  }
  return issues;
}
