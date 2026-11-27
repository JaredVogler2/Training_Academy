import * as v from 'valibot';
import { chanceOf } from './chance';
import {
  LessonIdSchema,
  SkillIdSchema,
  WORLD_IDS,
  WorldIdSchema,
  parseWith,
  type ContentPack,
  type Hint,
  type WorldId,
} from './schema';

/**
 * The concept graph: what is taught, what each thing builds on, and which activity teaches it.
 *
 * It is made from the content packs and from nothing else (`npm run content` writes `src/content/concepts.json`),
 * so it cannot say anything the packs do not. It holds only what is needed to decide what to offer next: the order
 * of the activities in each world, the skills each one teaches and asks alone, and what each skill builds on. A
 * page that needs it does not need a single lesson fetched.
 *
 * `conceptsOf` gives the whole of a concept for a grown-up to read (its objective, its examples, its hints, the
 * mistakes its questions can tell apart), from a pack that has been fetched.
 */

export const GRAPH_FORMAT = 'training-academy.concept-graph';
export const GRAPH_SCHEMA_VERSION = 1;

const count = v.pipe(v.number(), v.integer(), v.minValue(0));

const GraphLessonSchema = v.strictObject({
  world: WorldIdSchema,
  /** Every skill the activity has a question for. */
  skills: v.pipe(v.array(SkillIdSchema), v.minLength(1)),
  /**
   * The skills it can be relied on to ask alone: those with a question among the ones drawn for every sitting.
   * (A question asked only at the very end, or only when a sitting follows another, is not one of them.)
   */
  asks: v.array(SkillIdSchema),
});

const GraphSkillSchema = v.strictObject({
  world: WorldIdSchema,
  /** What it builds on. */
  needs: v.array(SkillIdSchema),
  /** The activities that have a question for it, in the order they are met. */
  lessons: v.pipe(v.array(LessonIdSchema), v.minLength(1)),
  /** How many different presentations its questions have. Fewer than two can never show it independent. */
  variants: count,
  /**
   * How likely an answer given without looking is to be right, for the easiest to guess of the questions it is
   * asked alone: a half where there are two pictures to choose from, none for a robot's plan. To four places.
   */
  chance: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

export const ConceptGraphSchema = v.strictObject({
  about: v.string(),
  format: v.literal(GRAPH_FORMAT),
  schemaVersion: v.literal(GRAPH_SCHEMA_VERSION),
  /** The version of each world's content it was made from: it is a new graph whenever any of them changes. */
  packs: v.record(WorldIdSchema, v.pipe(v.number(), v.integer(), v.minValue(1))),
  /** The worlds in the order they are met, each with its activities in the order they are met. */
  worlds: v.array(v.strictObject({ id: WorldIdSchema, lessons: v.array(LessonIdSchema) })),
  lessons: v.record(LessonIdSchema, GraphLessonSchema),
  skills: v.record(SkillIdSchema, GraphSkillSchema),
});
export type ConceptGraph = v.InferOutput<typeof ConceptGraphSchema>;
export type GraphLesson = v.InferOutput<typeof GraphLessonSchema>;
export type GraphSkill = v.InferOutput<typeof GraphSkillSchema>;

export const parseConceptGraph = (data: unknown) => parseWith(ConceptGraphSchema, data);

/** A graph with nothing in it: what there is to go by before the real one has been fetched, or if it cannot be. */
export const EMPTY_GRAPH: ConceptGraph = {
  about: '',
  format: GRAPH_FORMAT,
  schemaVersion: GRAPH_SCHEMA_VERSION,
  packs: {},
  worlds: [],
  lessons: {},
  skills: {},
};

/** The skills of a lesson's questions that are asked alone in every sitting, in the order they are first met. */
function askedAlone(lesson: ContentPack['lessons'][number]): string[] {
  const pool = new Set(lesson.plan.independent.pool);
  const asked: string[] = [];
  for (const challenge of lesson.challenges) {
    if (pool.has(challenge.id) && !asked.includes(challenge.skillId)) asked.push(challenge.skillId);
  }
  return asked;
}

/**
 * The graph of some packs. The worlds come out in the order the game meets them, whatever order the packs are
 * given in; a world with no pack is left out.
 */
export function graphOf(packs: readonly ContentPack[], about = ''): ConceptGraph {
  const ordered = WORLD_IDS.flatMap((world) => packs.find((pack) => pack.world === world) ?? []);
  const graph: ConceptGraph = {
    about,
    format: GRAPH_FORMAT,
    schemaVersion: GRAPH_SCHEMA_VERSION,
    packs: {},
    worlds: [],
    lessons: {},
    skills: {},
  };
  for (const pack of ordered) {
    graph.packs[pack.world] = pack.contentVersion;
    graph.worlds.push({ id: pack.world, lessons: pack.lessons.map((lesson) => lesson.id) });
    const taughtIn = new Map<string, string[]>();
    const presentations = new Map<string, Set<string>>();
    // The chance of a lucky answer to each skill's questions: those drawn for every sitting, and those asked
    // only at times (the last of an activity, the first of the next), for a skill that has none of the others.
    const drawn = new Map<string, number>();
    const attimes = new Map<string, number>();
    for (const lesson of pack.lessons) {
      const skills: string[] = [];
      const { plan } = lesson;
      for (const challenge of lesson.challenges) {
        if (!skills.includes(challenge.skillId)) skills.push(challenge.skillId);
        const variants = presentations.get(challenge.skillId) ?? new Set<string>();
        variants.add(challenge.variant);
        presentations.set(challenge.skillId, variants);
        if (plan.demo.includes(challenge.id) || plan.guided.includes(challenge.id)) continue;
        const kept = plan.independent.pool.includes(challenge.id) ? drawn : attimes;
        kept.set(
          challenge.skillId,
          Math.max(kept.get(challenge.skillId) ?? 0, chanceOf(challenge)),
        );
      }
      for (const skill of skills) taughtIn.set(skill, [...(taughtIn.get(skill) ?? []), lesson.id]);
      graph.lessons[lesson.id] = { world: pack.world, skills, asks: askedAlone(lesson) };
    }
    for (const skill of pack.skills) {
      const lessons = taughtIn.get(skill.id);
      // A skill that no question is for is not in the graph: there is nothing to offer for it.
      if (!lessons) continue;
      graph.skills[skill.id] = {
        world: pack.world,
        needs: [...skill.prerequisites],
        lessons,
        variants: presentations.get(skill.id)?.size ?? 0,
        chance: Math.round((drawn.get(skill.id) ?? attimes.get(skill.id) ?? 0) * 10_000) / 10_000,
      };
    }
  }
  return graph;
}

// ---------------------------------------------------------------------------------------------------------------------
// The audit: what must hold for nothing to be out of reach
// ---------------------------------------------------------------------------------------------------------------------

export type GraphFault =
  /** A skill builds on one that is not in the graph. */
  | { fault: 'unknown-need'; skill: string; needs: string }
  /** A skill builds on itself, directly or by way of others. */
  | { fault: 'circular'; skill: string }
  /** What a skill builds on is first taught after it, or in another world: it could not be met first. */
  | { fault: 'needs-something-later'; skill: string; needs: string }
  /** What a skill builds on is never asked alone anywhere, so the record could never say it was in place. */
  | { fault: 'need-never-asked-alone'; skill: string; needs: string }
  /** An activity teaches a skill that is not in the graph, or belongs to another world. */
  | { fault: 'unknown-skill'; lesson: string; skill: string }
  /** An activity asks nothing alone. */
  | { fault: 'asks-nothing'; lesson: string }
  /** An activity is not in its world's order, or is there twice, or the order names one that does not exist. */
  | { fault: 'out-of-order'; lesson: string };

/**
 * Everything wrong with a graph that would put something out of a child's reach, or leave the game unable to say
 * whether what a thing builds on is in place. An empty list is what the build and the tests require.
 */
export function auditGraph(graph: ConceptGraph): GraphFault[] {
  const faults: GraphFault[] = [];
  const position = new Map<string, number>();
  for (const world of graph.worlds) {
    world.lessons.forEach((id, index) => {
      const lesson = graph.lessons[id];
      if (!lesson || lesson.world !== world.id || position.has(id)) {
        faults.push({ fault: 'out-of-order', lesson: id });
        return;
      }
      position.set(id, index);
    });
  }
  for (const [id, lesson] of Object.entries(graph.lessons)) {
    if (!position.has(id)) faults.push({ fault: 'out-of-order', lesson: id });
    if (lesson.asks.length === 0) faults.push({ fault: 'asks-nothing', lesson: id });
    for (const skill of [...lesson.skills, ...lesson.asks]) {
      const known = graph.skills[skill];
      if (!known || known.world !== lesson.world || !lesson.skills.includes(skill)) {
        faults.push({ fault: 'unknown-skill', lesson: id, skill });
      }
    }
  }

  const firstMet = (skill: GraphSkill): number =>
    Math.min(...skill.lessons.map((id) => position.get(id) ?? Number.POSITIVE_INFINITY));
  const askedAloneSomewhere = new Set(
    Object.values(graph.lessons).flatMap((lesson) => lesson.asks),
  );

  for (const [id, skill] of Object.entries(graph.skills)) {
    for (const need of skill.needs) {
      const needed = graph.skills[need];
      if (!needed) {
        faults.push({ fault: 'unknown-need', skill: id, needs: need });
        continue;
      }
      // Met first, or met together in the same activity: never after.
      if (needed.world !== skill.world || firstMet(needed) > firstMet(skill)) {
        faults.push({ fault: 'needs-something-later', skill: id, needs: need });
      }
      // What is built on from another activity has to be something the record can come to show.
      const together = skill.lessons.every((lesson) => needed.lessons.includes(lesson));
      if (!together && !askedAloneSomewhere.has(need)) {
        faults.push({ fault: 'need-never-asked-alone', skill: id, needs: need });
      }
    }
    // Following what a skill builds on must never lead back to it.
    const seen = new Set<string>();
    const stack = [...skill.needs];
    while (stack.length > 0) {
      const next = stack.pop();
      if (next === undefined || seen.has(next)) continue;
      if (next === id) {
        faults.push({ fault: 'circular', skill: id });
        break;
      }
      seen.add(next);
      stack.push(...(graph.skills[next]?.needs ?? []));
    }
  }
  return faults;
}

// ---------------------------------------------------------------------------------------------------------------------
// A concept in full, for a grown-up to read
// ---------------------------------------------------------------------------------------------------------------------

export interface Concept {
  skillId: string;
  world: WorldId;
  /** Grown-up facing: what it is called. */
  title: string;
  /** Grown-up facing: what a child who has it can be seen to do. It is also what to look for away from the screen. */
  objective: string;
  /** What it builds on, by skill. */
  prerequisites: string[];
  /** The activities that teach it, in the order they are met. */
  lessons: string[];
  /** Its different presentations, in the order they are first met. */
  variants: string[];
  /** One question for each of its first three presentations: what it looks like in practice. */
  examples: { challengeId: string; variant: string; instruction: string }[];
  /** How its questions are used: shown as examples, practised with the guide, asked alone, and asked only at times. */
  questions: { shown: number; guided: number; alone: number; attimes: number };
  /**
   * How a sitting is made from them, for each activity: how many of the questions asked alone are drawn, from how
   * many, and how many more may be asked, each a different question, after one that needed help.
   */
  sittings: { lesson: string; drawn: number; from: number; again: number }[];
  /** The mistakes its questions can tell apart, by the name each is recorded under. */
  misconceptions: string[];
  /** The rungs of help its questions offer, in the order they are offered. */
  hintLadder: Hint['type'][];
}

/** Every concept of a pack, in the order its skills are listed. A skill no question is for is left out. */
export function conceptsOf(pack: ContentPack): Concept[] {
  return pack.skills.flatMap((skill): Concept[] => {
    const concept: Concept = {
      skillId: skill.id,
      world: skill.world,
      title: skill.title,
      objective: skill.objective,
      prerequisites: [...skill.prerequisites],
      lessons: [],
      variants: [],
      examples: [],
      questions: { shown: 0, guided: 0, alone: 0, attimes: 0 },
      sittings: [],
      misconceptions: [],
      hintLadder: [],
    };
    for (const lesson of pack.lessons) {
      const own = lesson.challenges.filter((challenge) => challenge.skillId === skill.id);
      if (own.length === 0) continue;
      concept.lessons.push(lesson.id);
      const { plan } = lesson;
      const pool = own.filter((challenge) => plan.independent.pool.includes(challenge.id));
      for (const challenge of own) {
        if (!concept.variants.includes(challenge.variant)) {
          concept.variants.push(challenge.variant);
          if (concept.examples.length < 3) {
            concept.examples.push({
              challengeId: challenge.id,
              variant: challenge.variant,
              instruction: challenge.prompt.instruction,
            });
          }
        }
        if (plan.demo.includes(challenge.id)) concept.questions.shown += 1;
        else if (plan.guided.includes(challenge.id)) concept.questions.guided += 1;
        else if (plan.independent.pool.includes(challenge.id)) concept.questions.alone += 1;
        else concept.questions.attimes += 1;
        if (challenge.kind === 'choose-one') {
          for (const name of Object.values(challenge.misconceptions ?? {})) {
            if (!concept.misconceptions.includes(name)) concept.misconceptions.push(name);
          }
        }
        // The ladder is the longest any of its questions has; the rungs of a shorter one are among them.
        if (challenge.hints.length > concept.hintLadder.length) {
          concept.hintLadder = challenge.hints.map((hint) => hint.type);
        }
      }
      if (pool.length > 0) {
        concept.sittings.push({
          lesson: lesson.id,
          drawn: Math.min(plan.independent.count, plan.independent.pool.length),
          from: plan.independent.pool.length,
          again: plan.independent.maxReprobes,
        });
      }
    }
    return concept.lessons.length > 0 ? [concept] : [];
  });
}
