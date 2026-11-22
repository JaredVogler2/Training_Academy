import * as v from 'valibot';

/**
 * Every shape the game stores or authors, as runtime-checked schemas. The TypeScript types are inferred from them,
 * so what the compiler believes and what the validator accepts cannot drift apart.
 *
 * Two families:
 *   - authored content (ContentPack → Skill, Lesson, Challenge): strict objects, so a typo in a content file fails
 *     validation instead of being silently dropped;
 *   - learner records (Profile, LessonSession, Attempt): what is written to the device.
 */

/** Version of the content-pack file format. */
export const CONTENT_SCHEMA_VERSION = 1;
/** Version of the learner-record shapes below. Bump together with a migration in src/storage/migrations.ts. */
export const RECORD_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------------------------------------------------

export const WORLD_IDS = [
  'reading-cove',
  'number-garden',
  'robot-ridge',
  'memory-forest',
  'inventor-island',
  'explorer-harbor',
] as const;
export type WorldId = (typeof WORLD_IDS)[number];

export const STRANDS = [
  'phonics',
  'number-sense',
  'coding',
  'memory',
  'engineering',
  'language-and-world',
] as const;
export type Strand = (typeof STRANDS)[number];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** `strand.topic.skill`: a dotted taxonomy that stays stable when lessons are rewritten. */
const SKILL_ID = /^[a-z]+(?:\.[a-z0-9]+(?:-[a-z0-9]+)*){1,4}$/;
/** `lesson-id.local-name`: a challenge belongs to exactly one lesson. */
const CHALLENGE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STRING_KEY = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const slug = (what: string) =>
  v.pipe(v.string(), v.regex(SLUG, `${what} must be a lowercase slug`));
const text = (max: number) => v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(max));
const positiveInt = v.pipe(v.number(), v.integer(), v.minValue(1));
const nonNegativeInt = v.pipe(v.number(), v.integer(), v.minValue(0));
/** Milliseconds since the Unix epoch, supplied by the caller: the engine never reads a clock. */
const timestamp = v.pipe(v.number(), v.integer(), v.minValue(0));
/** Opaque record id (profiles, sessions, attempts). */
const recordId = v.pipe(v.string(), v.minLength(1), v.maxLength(120), v.regex(/^[A-Za-z0-9:_-]+$/));

export const WorldIdSchema = v.picklist(WORLD_IDS);
export const SkillIdSchema = v.pipe(
  v.string(),
  v.regex(SKILL_ID, 'skill id must look like strand.topic.skill'),
);
/** Lesson ids are slugs so they can appear in a URL as they are. */
export const LessonIdSchema = slug('lesson id');
export const ChallengeIdSchema = v.pipe(
  v.string(),
  v.regex(CHALLENGE_ID, 'challenge id must look like lesson-id.local-name'),
);
export const ChoiceIdSchema = slug('choice id');
const StringKeySchema = v.pipe(v.string(), v.regex(STRING_KEY, 'string key'));

// ---------------------------------------------------------------------------------------------------------------------
// Authored content
// ---------------------------------------------------------------------------------------------------------------------

export const ITEM_KINDS = ['ladybug', 'flower', 'apple', 'shell'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const ARRANGEMENTS = ['row', 'cluster'] as const;
export type Arrangement = (typeof ARRANGEMENTS)[number];

/** A set of identical things, shown as pictures. No numeral is ever part of it. */
const QuantityStimulusSchema = v.strictObject({
  type: v.literal('quantity'),
  item: v.picklist(ITEM_KINDS),
  count: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10)),
  arrangement: v.picklist(ARRANGEMENTS),
});

/** What a renderer is asked to show. Later worlds add their own members (sounds, pictures, programs…). */
export const StimulusSchema = v.variant('type', [QuantityStimulusSchema]);
export type Stimulus = v.InferOutput<typeof StimulusSchema>;

const ChoiceSchema = v.strictObject({
  id: ChoiceIdSchema,
  stimulus: StimulusSchema,
  /** Read by screen readers and by the grown-up caption; never needed by the child. */
  label: text(80),
});
export type Choice = v.InferOutput<typeof ChoiceSchema>;

/**
 * One rung of a challenge's hint ladder. Asking for any rung marks the next answer as assisted.
 *   model      re-teach the idea without giving the answer away
 *   eliminate  take wrong choices off the table
 *   reveal     show the answer; the child still gets to tap it
 */
const HintSchema = v.variant('type', [
  v.strictObject({ type: v.literal('model'), caption: StringKeySchema }),
  v.strictObject({
    type: v.literal('eliminate'),
    remove: v.pipe(v.array(ChoiceIdSchema), v.minLength(1)),
    caption: StringKeySchema,
  }),
  v.strictObject({ type: v.literal('reveal'), caption: StringKeySchema }),
]);
export type Hint = v.InferOutput<typeof HintSchema>;

const ChooseOneChallengeSchema = v.strictObject({
  id: ChallengeIdSchema,
  kind: v.literal('choose-one'),
  skillId: SkillIdSchema,
  /** Presentation variant. Evidence of independence needs success on more than one. */
  variant: slug('variant'),
  prompt: v.strictObject({
    instruction: StringKeySchema,
    stimulus: StimulusSchema,
  }),
  choices: v.pipe(v.array(ChoiceSchema), v.minLength(2), v.maxLength(4)),
  answer: ChoiceIdSchema,
  hints: v.pipe(v.array(HintSchema), v.minLength(1), v.maxLength(4)),
  /** Why each distractor is tempting, for the grown-up report and for later adaptivity. */
  misconceptions: v.optional(v.record(ChoiceIdSchema, slug('misconception'))),
  feedback: v.strictObject({
    correct: StringKeySchema,
    incorrect: StringKeySchema,
  }),
});

export const ChallengeSchema = v.variant('kind', [ChooseOneChallengeSchema]);
export type Challenge = v.InferOutput<typeof ChallengeSchema>;

export const SkillSchema = v.strictObject({
  id: SkillIdSchema,
  world: WorldIdSchema,
  strand: v.picklist(STRANDS),
  /** Grown-up facing. */
  title: text(80),
  /** Grown-up facing: what a child who has this skill can be seen to do. */
  objective: text(300),
  prerequisites: v.array(SkillIdSchema),
});
export type Skill = v.InferOutput<typeof SkillSchema>;

export const LessonSchema = v.strictObject({
  id: LessonIdSchema,
  /** Bump when the lesson's challenges or plan change; saved sessions of an older version are not resumed. */
  version: positiveInt,
  world: WorldIdSchema,
  title: text(80),
  summary: text(300),
  skillIds: v.pipe(v.array(SkillIdSchema), v.minLength(1)),
  estimatedMinutes: v.pipe(v.number(), v.minValue(1), v.maxValue(5)),
  plan: v.strictObject({
    /** Worked examples the guide shows first. Nothing is asked and nothing is recorded. */
    demo: v.pipe(v.array(ChallengeIdSchema), v.minLength(1)),
    /** Supported practice, in authored order. */
    guided: v.pipe(v.array(ChallengeIdSchema), v.minLength(1)),
    /** Unsupported probes: `count` are drawn from `pool` per session; the rest are kept back for re-probes. */
    independent: v.strictObject({
      pool: v.pipe(v.array(ChallengeIdSchema), v.minLength(1)),
      count: positiveInt,
      maxReprobes: nonNegativeInt,
    }),
  }),
  successCriteria: v.strictObject({
    /** First-try, unhinted, unassisted correct answers in the independent stage. */
    independentFirstTryCorrect: positiveInt,
  }),
  challenges: v.pipe(v.array(ChallengeSchema), v.minLength(1)),
});
export type Lesson = v.InferOutput<typeof LessonSchema>;

export const ContentPackSchema = v.strictObject({
  format: v.literal('training-academy.content-pack'),
  schemaVersion: v.literal(CONTENT_SCHEMA_VERSION),
  id: slug('pack id'),
  world: WorldIdSchema,
  /** Bump on every authored change. Recorded on each attempt. */
  contentVersion: positiveInt,
  strings: v.strictObject({
    en: v.record(StringKeySchema, text(200)),
  }),
  skills: v.array(SkillSchema),
  lessons: v.array(LessonSchema),
});
export type ContentPack = v.InferOutput<typeof ContentPackSchema>;

// ---------------------------------------------------------------------------------------------------------------------
// Learner records
// ---------------------------------------------------------------------------------------------------------------------

export const AVATAR_IDS = ['sun', 'moon', 'leaf', 'shell', 'star', 'drop'] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export const SESSION_MINUTE_OPTIONS = [10, 15, 20] as const;

/**
 * A local player. A nickname and a picture: no real name is asked for, no birth date, nothing that leaves the device.
 */
export const ProfileSchema = v.object({
  schemaVersion: v.literal(RECORD_SCHEMA_VERSION),
  id: recordId,
  name: text(24),
  avatar: v.picklist(AVATAR_IDS),
  createdAt: timestamp,
  updatedAt: timestamp,
  settings: v.object({
    /** A suggested session length the grown-up may choose; `null` means no suggestion. */
    sessionMinutes: v.nullable(v.picklist(SESSION_MINUTE_OPTIONS)),
  }),
});
export type Profile = v.InferOutput<typeof ProfileSchema>;

export const STAGES = ['demo', 'guided', 'independent'] as const;
export type Stage = (typeof STAGES)[number];

/** Longest response time that is recorded; anything slower is a child who walked away, not a slow answer. */
export const MAX_DURATION_MS = 10 * 60 * 1000;

/**
 * One response to one presentation of a challenge: the minimal event the learning record is built from.
 * Demonstrations, views and hint requests on their own never produce one.
 */
export const AttemptSchema = v.object({
  schemaVersion: v.literal(RECORD_SCHEMA_VERSION),
  /** `${sessionId}:${seq}` — writing the same attempt twice is harmless. */
  id: recordId,
  profileId: recordId,
  sessionId: recordId,
  seq: nonNegativeInt,
  lessonId: LessonIdSchema,
  lessonVersion: positiveInt,
  contentVersion: positiveInt,
  challengeId: ChallengeIdSchema,
  skillId: SkillIdSchema,
  variant: slug('variant'),
  stage: v.picklist(['guided', 'independent']),
  /** 0 for the first response to this presentation; retries count up. */
  tryIndex: nonNegativeInt,
  /** How many hint rungs had been shown when the response was given. */
  hintLevel: nonNegativeInt,
  assistance: v.picklist(['none', 'hint', 'adult']),
  outcome: v.picklist(['correct', 'incorrect']),
  response: ChoiceIdSchema,
  misconception: v.optional(slug('misconception')),
  at: timestamp,
  /** The local calendar day of `at`, as the device saw it. */
  day: v.pipe(v.string(), v.regex(DAY)),
  durationMs: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(MAX_DURATION_MS)),
});
export type Attempt = v.InferOutput<typeof AttemptSchema>;

const StepSchema = v.object({
  stage: v.picklist(STAGES),
  challengeId: ChallengeIdSchema,
  /** Set when this step re-probes a skill after an assisted answer, with a different challenge. */
  reprobeOf: v.optional(ChallengeIdSchema),
});
export type Step = v.InferOutput<typeof StepSchema>;

/** One sitting of one lesson, resumable after a refresh. */
export const LessonSessionSchema = v.object({
  schemaVersion: v.literal(RECORD_SCHEMA_VERSION),
  id: recordId,
  profileId: recordId,
  lessonId: LessonIdSchema,
  lessonVersion: positiveInt,
  contentVersion: positiveInt,
  /** Everything "random" about the session derives from this. */
  seed: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(0xffffffff)),
  status: v.picklist(['active', 'completed']),
  startedAt: timestamp,
  updatedAt: timestamp,
  completedAt: v.nullable(timestamp),
  steps: v.pipe(v.array(StepSchema), v.minLength(1)),
  /** Independent challenges not drawn for this session, kept for re-probes. */
  reserve: v.array(ChallengeIdSchema),
  cursor: nonNegativeInt,
  presentation: v.object({
    tryIndex: nonNegativeInt,
    hintLevel: nonNegativeInt,
    eliminated: v.array(ChoiceIdSchema),
    revealed: v.boolean(),
  }),
  nextSeq: nonNegativeInt,
  reprobesUsed: nonNegativeInt,
  tally: v.object({
    /** Independent-stage challenges finished so far. */
    independentProbes: nonNegativeInt,
    /** …of which were answered correctly at the first try with no hint and no adult help. */
    independentFirstTryCorrect: nonNegativeInt,
    /** Guided or independent challenges that needed a retry, a hint or adult help. */
    assistedSolves: nonNegativeInt,
  }),
});
export type LessonSession = v.InferOutput<typeof LessonSessionSchema>;

// ---------------------------------------------------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------------------------------------------------

export type ParseResult<T> = { ok: true; value: T } | { ok: false; issues: string[] };

type AnySchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

/** Validate unknown data. Never throws; issues are short, path-prefixed sentences. */
export function parseWith<S extends AnySchema>(
  schema: S,
  data: unknown,
): ParseResult<v.InferOutput<S>> {
  const result = v.safeParse(schema, data);
  if (result.success) return { ok: true, value: result.output };
  return {
    ok: false,
    issues: result.issues.map((issue) => {
      const path = v.getDotPath(issue);
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}

export const parseContentPack = (data: unknown) => parseWith(ContentPackSchema, data);
export const parseProfile = (data: unknown) => parseWith(ProfileSchema, data);
export const parseAttempt = (data: unknown) => parseWith(AttemptSchema, data);
export const parseLessonSession = (data: unknown) => parseWith(LessonSessionSchema, data);
