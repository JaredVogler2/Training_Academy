import * as v from 'valibot';
import { TUNE_SHAPES } from './music';

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
  'music-lab',
] as const;
export type WorldId = (typeof WORLD_IDS)[number];

export const STRANDS = [
  'phonics',
  'number-sense',
  'coding',
  'memory',
  'engineering',
  'language-and-world',
  'music',
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

/**
 * Things to count, and friends to give them to. Each is one plain shape, with no spots, petals or other parts a
 * child might count instead.
 */
export const ITEM_KINDS = ['apple', 'leaf', 'snail', 'acorn', 'bird', 'mouse', 'frog'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/**
 * How a set is laid out.
 *   row      lines of up to three (four, when there are more than six)
 *   cluster  the pattern a die or a domino would show
 *   scatter  no pattern: wherever they fell
 *   frame    lines of five, the way two hands hold ten
 */
export const ARRANGEMENTS = ['row', 'cluster', 'scatter', 'frame'] as const;
export type Arrangement = (typeof ARRANGEMENTS)[number];

/** A set of identical things, shown as pictures. No numeral is ever part of it. */
const QuantityStimulusSchema = v.strictObject({
  type: v.literal('quantity'),
  item: v.picklist(ITEM_KINDS),
  count: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10)),
  arrangement: v.picklist(ARRANGEMENTS),
  /** Drawn smaller or larger than usual, so that how much room a set takes is not a clue to how many it holds. */
  size: v.optional(v.picklist(['small', 'big'])),
});
export type QuantityStimulus = v.InferOutput<typeof QuantityStimulusSchema>;

/** One thing from the picture kit (src/art): a sun, a sock. The kit decides how it is drawn and what it is called. */
const PictureStimulusSchema = v.strictObject({
  type: v.literal('picture'),
  id: slug('picture id'),
});

/** Something to listen to: a recorded clip, shown as a thing to tap that plays it. */
const SoundStimulusSchema = v.strictObject({
  type: v.literal('sound'),
  /** The clip's key in the voice manifest. */
  clip: StringKeySchema,
});

/** A letter, or the two letters that together write one sound, on a tile. */
const LetterStimulusSchema = v.strictObject({
  type: v.literal('letter'),
  letters: v.pipe(v.string(), v.regex(/^[a-z]{1,2}$/, 'one or two lowercase letters')),
});

/** A written word, one tile for each sound in it. */
const WordStimulusSchema = v.strictObject({
  type: v.literal('word'),
  /** The picture the word names; the kit knows how it is spelt, sound by sound. */
  id: slug('picture id'),
});

/** A picture that stands for the question being asked ("which has more?"), drawn by the world it belongs to. */
const SignStimulusSchema = v.strictObject({
  type: v.literal('sign'),
  id: slug('sign id'),
});

const SceneValueSchema = v.union([
  v.string(),
  v.number(),
  v.boolean(),
  v.array(v.union([v.string(), v.number()])),
]);

/**
 * A picture only one world knows how to draw: a robot's grid, a bridge over a stream, a map. The engine carries it
 * and never looks inside; the world's own module checks what is in it (and the content tests check every one).
 */
const SceneStimulusSchema = v.strictObject({
  type: v.literal('scene'),
  scene: slug('scene'),
  of: v.record(v.pipe(v.string(), v.regex(/^[a-z][A-Za-z0-9]*$/)), SceneValueSchema),
});
export type SceneStimulus = v.InferOutput<typeof SceneStimulusSchema>;

/** What a renderer is asked to show. */
export const StimulusSchema = v.variant('type', [
  QuantityStimulusSchema,
  PictureStimulusSchema,
  SoundStimulusSchema,
  LetterStimulusSchema,
  WordStimulusSchema,
  SignStimulusSchema,
  SceneStimulusSchema,
]);
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
 *   eliminate  take wrong choices off the table (a question with choices)
 *   step       show the first part, or parts, of what is to be made (a thing to make)
 *   reveal     show the answer; the child still gets to give it
 */
const HintSchema = v.variant('type', [
  v.strictObject({ type: v.literal('model'), caption: StringKeySchema }),
  v.strictObject({
    type: v.literal('eliminate'),
    remove: v.pipe(v.array(ChoiceIdSchema), v.minLength(1)),
    caption: StringKeySchema,
  }),
  v.strictObject({
    type: v.literal('step'),
    /** How many more parts of the answer this rung gives. */
    count: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(6)),
    caption: StringKeySchema,
  }),
  v.strictObject({ type: v.literal('reveal'), caption: StringKeySchema }),
]);
export type Hint = v.InferOutput<typeof HintSchema>;

const FeedbackSchema = v.strictObject({
  correct: StringKeySchema,
  incorrect: StringKeySchema,
});

const ChooseOneChallengeSchema = v.strictObject({
  id: ChallengeIdSchema,
  kind: v.literal('choose-one'),
  skillId: SkillIdSchema,
  /** Presentation variant. Evidence of independence needs success on more than one. */
  variant: slug('variant'),
  prompt: v.strictObject({
    instruction: StringKeySchema,
    stimulus: StimulusSchema,
    /**
     * Shown for a moment and then covered, so that it has to be taken in at a glance or held in mind. Nothing is
     * timed against the child: the choices wait as long as they like, and it can be shown again for the asking.
     */
    glance: v.optional(v.boolean()),
    /**
     * What is put in its place once it has been covered: the part of it that the question is about ("what did the
     * cat have?" shows the cat). Only for something that is glanced at.
     */
    cue: v.optional(StimulusSchema),
    /** What is asked once it has been covered ("which of these was there?"). Only for something glanced at. */
    ask: v.optional(StringKeySchema),
  }),
  choices: v.pipe(v.array(ChoiceSchema), v.minLength(2), v.maxLength(4)),
  answer: ChoiceIdSchema,
  hints: v.pipe(v.array(HintSchema), v.minLength(1), v.maxLength(4)),
  /** Why each distractor is tempting, for the grown-up report and for later adaptivity. */
  misconceptions: v.optional(v.record(ChoiceIdSchema, slug('misconception'))),
  feedback: FeedbackSchema,
});
export type ChooseOneChallenge = v.InferOutput<typeof ChooseOneChallengeSchema>;

// A thing to make. Where a question with choices is answered by picking, these are answered by doing: giving out so
// many, putting things in order, picking out the ones that belong, turning cards over. Each is judged by a rule
// (src/engine/tasks.ts), never by comparing with one stored string, and every one has an answer that can be shown.

/** An id that can be joined to others with "-" to write an answer down. */
const TOKEN = /^[a-z0-9]+$/;
const token = (what: string) =>
  v.pipe(v.string(), v.regex(TOKEN, `${what} must be lowercase letters and digits only`));

const CardSchema = v.strictObject({
  id: token('card id'),
  stimulus: StimulusSchema,
  label: text(80),
});
export type Card = v.InferOutput<typeof CardSchema>;

/** Give out exactly as many as are wanted: one for each of the friends shown. */
const GiveTaskSchema = v.strictObject({
  type: v.literal('give'),
  /** The friends who each want one. How many of them there are is the answer. */
  want: QuantityStimulusSchema,
  /** What is given out. */
  item: v.picklist(ITEM_KINDS),
  /** How many there are to give from: always more than are wanted. */
  pile: v.pipe(v.number(), v.integer(), v.minValue(2), v.maxValue(12)),
  /** A place is marked for each one wanted, so that giving is matching one to one. */
  places: v.boolean(),
});

/** Put every card in its place: first, next, last. */
const OrderTaskSchema = v.strictObject({
  type: v.literal('order'),
  cards: v.pipe(v.array(CardSchema), v.minLength(2), v.maxLength(5)),
  solution: v.pipe(v.array(token('card id')), v.minLength(2), v.maxLength(5)),
});

/** Do again what was just shown: the same things, in the same order. */
const EchoTaskSchema = v.strictObject({
  type: v.literal('echo'),
  cards: v.pipe(v.array(CardSchema), v.minLength(2), v.maxLength(6)),
  solution: v.pipe(v.array(token('card id')), v.minLength(1), v.maxLength(6)),
});

/** Pick out every card that belongs, and none that does not. */
const SelectTaskSchema = v.strictObject({
  type: v.literal('select'),
  cards: v.pipe(v.array(CardSchema), v.minLength(3), v.maxLength(9)),
  solution: v.pipe(v.array(token('card id')), v.minLength(1), v.maxLength(6)),
  /** What is looked at first and then put away: the things to remember. Left out when nothing is hidden. */
  study: v.optional(v.pipe(v.array(token('card id')), v.minLength(1), v.maxLength(6))),
  /** What is asked once they have been put away ("which ones did you see?"). Needed exactly when there is a study. */
  ask: v.optional(StringKeySchema),
});

/** Turn the cards over two at a time until every pair has been found. */
const PairsTaskSchema = v.strictObject({
  type: v.literal('pairs'),
  /** One of each; the board holds two. */
  cards: v.pipe(v.array(CardSchema), v.minLength(2), v.maxLength(6)),
  /** Turns (two cards each) within which finding them all shows remembering, not luck. */
  par: positiveInt,
  /** The cards lie face up: matching by looking, to learn how the game goes before anything is hidden. */
  open: v.optional(v.boolean()),
});

/** A square of a robot's grid: [column, row], counted from the top left, from nought. */
const CellSchema = v.tuple([
  v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(5)),
  v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(4)),
]);

export const FACINGS = ['north', 'east', 'south', 'west'] as const;
export type Facing = (typeof FACINGS)[number];

/** What a robot can be told to do: one step forward, or a quarter turn where it stands. */
export const COMMANDS = ['forward', 'left', 'right'] as const;
export type Command = (typeof COMMANDS)[number];

/**
 * A program as it is written down: commands by their first letter, joined with "-", and in front of them, where
 * the whole program is to be done more than once, how many times ("x3-f-l"). See src/engine/robot.ts.
 */
const ProgramTextSchema = v.pipe(
  v.string(),
  v.regex(/^(?:x[2-4]-)?[flr](?:-[flr])*$/, 'a program is commands f, l and r, joined by "-"'),
);

/** Tell a robot how to get to where it is going: build a program, run it, mend it. */
const ProgramTaskSchema = v.strictObject({
  type: v.literal('program'),
  grid: v.strictObject({
    columns: v.pipe(v.number(), v.integer(), v.minValue(2), v.maxValue(6)),
    rows: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(5)),
  }),
  start: v.strictObject({ at: CellSchema, facing: v.picklist(FACINGS) }),
  goal: CellSchema,
  /** Squares the robot cannot enter. */
  rocks: v.pipe(v.array(CellSchema), v.maxLength(12)),
  /** The commands there are to use. */
  commands: v.pipe(v.array(v.picklist(COMMANDS)), v.minLength(1), v.maxLength(3)),
  /** How many commands a program may hold. */
  slots: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(8)),
  /** The most times the whole program may be done over; 1 where there is no doing it again. */
  repeats: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(4)),
  /** Each command is carried out as it is tapped, with nothing to build first: for meeting the commands. */
  live: v.boolean(),
  /** A program to start from that has a mistake in it, for finding and mending. */
  given: v.optional(ProgramTextSchema),
  /** A program that gets there: the one shown when the answer is shown. Any program that gets there is right. */
  solution: ProgramTextSchema,
});

export const WORKBENCHES = ['bridge', 'ramp', 'balance', 'boat'] as const;
export type Workbench = (typeof WORKBENCHES)[number];

/**
 * Make a thing that works: choose a value for each part that can be changed, test it, and change it. What happens
 * is said by a small model of the thing (src/engine/models.ts), the same every time. Any design that works is right.
 */
const DesignTaskSchema = v.strictObject({
  type: v.literal('design'),
  /** Which workbench this is: which model says what happens. */
  model: v.picklist(WORKBENCHES),
  /** What is fixed in this challenge: how wide the gap is, who has to cross, what is already on the beam. */
  given: v.record(
    v.pipe(v.string(), v.regex(/^[a-z][A-Za-z0-9]*$/)),
    v.union([v.string(), v.number()]),
  ),
  /** What can be changed, in the order it is written down, each with the values it can take. */
  controls: v.pipe(
    v.array(
      v.strictObject({
        id: token('control id'),
        options: v.pipe(v.array(token('option')), v.minLength(2), v.maxLength(5)),
      }),
    ),
    v.minLength(1),
    v.maxLength(3),
  ),
  /** A design that works, one value for each control: the one shown when the answer is shown. */
  solution: v.pipe(v.array(token('option')), v.minLength(1), v.maxLength(3)),
});

/** A note by its name on a keyboard: a white key and its octave ("c4" is middle C). See src/engine/music.ts. */
const NoteSchema = v.pipe(
  v.string(),
  v.regex(/^[a-g][2-6]$/, 'a note is a letter a–g and an octave 2–6'),
);

/**
 * Tap along with a slow, steady beat. A few beats are listened to first; then so many are to be tapped. What is
 * judged is rough tempo — most of the beats met, give or take a generous margin (src/engine/music.ts) — never
 * precision.
 */
const BeatTaskSchema = v.strictObject({
  type: v.literal('beat'),
  /** Beats in a minute. Slow: a child's tapping settles at about this pace. */
  tempo: v.pipe(v.number(), v.integer(), v.minValue(50), v.maxValue(100)),
  /** How many beats are heard first, before any is to be tapped. */
  lead: v.pipe(v.number(), v.integer(), v.minValue(2), v.maxValue(4)),
  /** How many beats are to be tapped. */
  beats: v.pipe(v.number(), v.integer(), v.minValue(4), v.maxValue(12)),
  /** How many of them have to be met for the tapping to count as in time. */
  need: v.pipe(v.number(), v.integer(), v.minValue(2), v.maxValue(12)),
});

/**
 * Make up a short tune that has the shape asked for: going up, coming home. There are many right tunes, and any
 * of them is right; the one written here is shown when an answer is shown.
 */
const TuneTaskSchema = v.strictObject({
  type: v.literal('tune'),
  /** The bars there are to play, lowest first. */
  notes: v.pipe(v.array(NoteSchema), v.minLength(3), v.maxLength(8)),
  /** How many notes the tune is to have. */
  length: v.pipe(v.number(), v.integer(), v.minValue(3), v.maxValue(6)),
  shape: v.picklist(TUNE_SHAPES),
  solution: v.pipe(v.array(NoteSchema), v.minLength(3), v.maxLength(6)),
});

export const TaskSchema = v.variant('type', [
  GiveTaskSchema,
  OrderTaskSchema,
  EchoTaskSchema,
  SelectTaskSchema,
  PairsTaskSchema,
  ProgramTaskSchema,
  DesignTaskSchema,
  BeatTaskSchema,
  TuneTaskSchema,
]);
export type Task = v.InferOutput<typeof TaskSchema>;
export type ProgramTask = v.InferOutput<typeof ProgramTaskSchema>;
export type DesignTask = v.InferOutput<typeof DesignTaskSchema>;
export type BeatTask = v.InferOutput<typeof BeatTaskSchema>;
export type TuneTask = v.InferOutput<typeof TuneTaskSchema>;

const MakeChallengeSchema = v.strictObject({
  id: ChallengeIdSchema,
  kind: v.literal('make'),
  skillId: SkillIdSchema,
  variant: slug('variant'),
  prompt: v.strictObject({
    instruction: StringKeySchema,
    /** A picture that goes with the task, where it has one. */
    stimulus: v.optional(StimulusSchema),
  }),
  task: TaskSchema,
  hints: v.pipe(v.array(HintSchema), v.minLength(1), v.maxLength(4)),
  /** Wrong tries after which the answer is shown, so that nobody is ever stuck. */
  maxTries: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(5))),
  feedback: FeedbackSchema,
});
export type MakeChallenge = v.InferOutput<typeof MakeChallengeSchema>;

export const ChallengeSchema = v.variant('kind', [ChooseOneChallengeSchema, MakeChallengeSchema]);
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
  /** True when the activity is about listening, and so cannot be done with the sound off. */
  needsSound: v.optional(v.boolean()),
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
    /**
     * Asked last of all, in this order, after everything else: for a question about something from the start of
     * the activity (what was shown first, remembered across the whole sitting). Answered alone, like the probes.
     */
    closing: v.optional(v.pipe(v.array(ChallengeIdSchema), v.minLength(1), v.maxLength(2))),
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
