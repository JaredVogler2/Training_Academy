import type { DesignTask } from './schema';

/**
 * Small models of real things, for the workbenches of Inventor Island: what happens when a design is tested. Each is
 * a pure function of what is fixed and what was chosen, so that the same design always does the same thing — a
 * child who changes one part sees what that one change did.
 *
 * They are models, and simple ones: right about which way a change pushes (thicker holds more, steeper rolls
 * further), not about how much. docs/CURRICULUM.md says what each leaves out.
 */

export interface TestResult {
  /** The design does what it was meant to. */
  works: boolean;
  /** What happened, in a word the workbench can draw and the record can keep: "held", "sagged". */
  outcome: string;
}

export type Model = (
  given: Readonly<Record<string, string | number>>,
  choice: Readonly<Record<string, string>>,
) => TestResult;

const HEIGHTS: Readonly<Record<string, number>> = { low: 1, mid: 2, high: 3 };

/**
 * A ball let go at the top of a ramp rolls down it and on along the ground, and stops. The higher the ramp, the
 * further it goes; on rough ground it goes half as far as on smooth. The ground is marked off in equal lengths,
 * and the ball has to stop on the one with the basket.
 *
 *   given    surface: "smooth" or "rough";  target: which length the basket is on (1 is nearest the ramp)
 *   choice   height: "low", "mid" or "high"
 */
const ramp: Model = (given, choice) => {
  const height = HEIGHTS[choice.height ?? ''] ?? 0;
  const reach = height * (given.surface === 'rough' ? 1 : 2);
  const target = Number(given.target);
  if (reach === target) return { works: true, outcome: 'landed' };
  return { works: false, outcome: reach < target ? 'rolled-short' : 'rolled-past' };
};

/** The models, by workbench. A workbench with no model yet cannot be tested: asking is a fault in the caller. */
export const MODELS: Partial<Record<DesignTask['model'], Model>> = { ramp };

/** The design as the controls name it: one chosen option for each. `null` if the choice is not one the task offers. */
export function readDesign(
  task: DesignTask,
  options: readonly string[],
): Record<string, string> | null {
  if (options.length !== task.controls.length) return null;
  const choice: Record<string, string> = {};
  for (const [index, control] of task.controls.entries()) {
    const option = options[index];
    if (option === undefined || !control.options.includes(option)) return null;
    choice[control.id] = option;
  }
  return choice;
}

/** Test a design. `null` if the choice is not one the task offers, or the workbench has no model. */
export function testDesign(task: DesignTask, options: readonly string[]): TestResult | null {
  const choice = readDesign(task, options);
  const model = MODELS[task.model];
  if (!choice || !model) return null;
  return model(task.given, choice);
}
