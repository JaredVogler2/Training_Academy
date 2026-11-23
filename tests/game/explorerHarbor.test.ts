import { describe, expect, it } from 'vitest';
import {
  PLAINLY_FARTHER,
  PLAINLY_NEARER,
  WELL_ASHORE,
  WELL_OUT,
  islandsOf,
  onTheMap,
  plainly,
  pointOf,
  reach,
  standing,
} from '@/content/explorer-harbor/maps';
import storybook from '@/content/explorer-harbor/storybook.json';
import type { MakeChallenge, Stimulus } from '@/engine';
import type { ChooseSituation, MakeSituation, Script, ScriptEvent } from '@/game/lesson/script';
import { STORY_PICTURES, isStoryPicture } from '@/game/worlds/explorer-harbor/pictures';
import {
  TELL_TIME,
  chooseScript,
  makeScript,
  panelLine,
  toldSoFar,
} from '@/game/worlds/explorer-harbor/script';

describe('the storybook and its drawings', () => {
  it('have exactly the same pictures in them', () => {
    expect([...STORY_PICTURES].sort()).toEqual(Object.keys(storybook.pictures).sort());
    expect(isStoryPicture('seed1')).toBe(true);
    expect(isStoryPicture('toString')).toBe(false);
  });

  it('tell every story in three pictures, each with a line of its own', () => {
    for (const [name, story] of Object.entries(storybook.stories)) {
      expect(story.panels, name).toHaveLength(3);
      expect(story.told, name).toHaveLength(3);
      expect(new Set(story.told).size, name).toBe(3);
      for (const panel of story.panels) expect(isStoryPicture(panel), panel).toBe(true);
    }
  });

  it('never shows what did it in the picture of how things were afterwards', () => {
    // A change is asked about by its cause: a picture of "after" that had the cause in it would give it away.
    // This cannot be seen from data; what can is that no picture is both a cause and an "after".
    const causes = Object.values(storybook.changes).map((change) => change.cause);
    for (const change of Object.values(storybook.changes)) {
      expect(causes, change.after).not.toContain(change.after);
      expect(causes, change.before).not.toContain(change.before);
    }
  });
});

describe('the maths of a map', () => {
  const island = { x: 50, y: 32, rx: 20, ry: 12 };

  it('reads islands and places from the numbers a map is written in', () => {
    expect(islandsOf([50, 32, 20, 12, 10, 10, 5, 4])).toEqual([
      island,
      { x: 10, y: 10, rx: 5, ry: 4 },
    ]);
    expect(islandsOf('nothing')).toEqual([]);
    expect(pointOf([3, 4])).toEqual({ x: 3, y: 4 });
    expect(pointOf([3])).toBeNull();
  });

  it('measures how far out from the middle of an island a point is', () => {
    expect(reach(island, { x: 50, y: 32 })).toBe(0);
    expect(reach(island, { x: 70, y: 32 })).toBe(1);
    expect(reach(island, { x: 50, y: 20 })).toBe(1);
    expect(reach(island, { x: 90, y: 32 })).toBe(2);
  });

  it('says land only well inside a shore, water only well clear of every shore, and otherwise neither', () => {
    expect(standing([island], { x: 50, y: 32 })).toBe('land');
    expect(standing([island], { x: 50 + 20 * WELL_ASHORE, y: 32 })).toBe('land');
    expect(standing([island], { x: 50 + 20 * (WELL_ASHORE + 0.05), y: 32 })).toBe('unclear');
    expect(standing([island], { x: 70, y: 32 })).toBe('unclear');
    expect(standing([island], { x: 50 + 20 * (WELL_OUT - 0.05), y: 32 })).toBe('unclear');
    expect(standing([island], { x: 50 + 20 * WELL_OUT, y: 32 })).toBe('water');
    // Clear of one island is not clear of them all.
    expect(standing([island, { x: 85, y: 32, rx: 8, ry: 8 }], { x: 84, y: 32 })).toBe('land');
    expect(standing([], { x: 5, y: 5 })).toBe('water');
  });

  it('calls a place the nearest or the farthest only when it is so by a good deal', () => {
    const boat = { x: 10, y: 10 };
    const at = (far: number) => ({ x: 10 + far, y: 10 });
    expect(plainly('near', boat, [at(40), at(20), at(60)])).toBe(1);
    expect(plainly('near', boat, [at(40 * PLAINLY_NEARER), at(40), at(60)])).toBe(0);
    expect(plainly('near', boat, [at(40 * PLAINLY_NEARER + 1), at(40), at(60)])).toBeNull();
    expect(plainly('far', boat, [at(20), at(40), at(40 * PLAINLY_FARTHER)])).toBe(2);
    expect(plainly('far', boat, [at(20), at(40), at(40 * PLAINLY_FARTHER - 1)])).toBeNull();
    expect(plainly('near', boat, [at(20)])).toBeNull();
  });

  it('keeps places off the very edge of a map', () => {
    expect(onTheMap({ x: 50, y: 32 })).toBe(true);
    expect(onTheMap({ x: 4, y: 32 })).toBe(false);
    expect(onTheMap({ x: 50, y: 60 })).toBe(false);
  });
});

const egg = storybook.stories.egg;
const picture = (id: string) => ({ id, stimulus: { type: 'picture', id } as Stimulus });

const beats = (script: Script): string[] =>
  script.moments.flatMap((moment) => {
    const { beat } = moment;
    if (!beat) return [];
    if (beat.show === 'name') return [`name:${beat.which}`];
    return [beat.show === 'do' ? `do:${String(beat.parts)}` : beat.show];
  });
const said = (script: Script): string[] =>
  script.moments.flatMap((moment) => (moment.sound?.kind === 'say' ? [moment.sound.key] : []));

describe('a story to put in order', () => {
  const challenge = {
    id: 'story',
    kind: 'make',
    skillId: 'skill',
    variant: 'v',
    prompt: { instruction: 'instruction' },
    task: {
      type: 'order',
      cards: egg.panels.map((id) => ({ id, label: id, stimulus: { type: 'picture', id } })),
      solution: egg.panels,
    },
    hints: [],
    feedback: { correct: 'correct', incorrect: 'incorrect' },
  } as unknown as MakeChallenge;

  const situation = (
    event: ScriptEvent,
    stage: MakeSituation['stage'] = 'independent',
  ): MakeSituation => ({
    stage,
    event,
    again: false,
    parts: 3,
    sequence: [],
    lines: {
      instruction: 'instruction',
      feedback: event === 'correct' ? 'correct' : null,
      hint: null,
    },
    seconds: () => 0,
  });

  it('is told as it is put in place, in the demonstration', () => {
    const script = makeScript(situation('new', 'demo'), challenge)!;
    expect(beats(script)).toEqual(['do:0', 'do:1', 'do:2', 'do:3', 'same']);
    expect(said(script)).toEqual(['lesson.watch', 'instruction', ...egg.panels.map(panelLine)]);
    // Each picture is dwelt on for as long as its line would take, even where the line cannot be heard.
    expect(script.length).toBeGreaterThanOrEqual(3 * TELL_TIME);
  });

  it('is simply asked for, on a child’s turn', () => {
    const script = makeScript(situation('new'), challenge)!;
    expect(beats(script)).toEqual(['rest']);
    expect(said(script)).toEqual(['instruction']);
  });

  it('is said to be right once it is in order, and then told back from the beginning', () => {
    const script = makeScript(situation('correct'), challenge)!;
    expect(beats(script)).toEqual(['same', ...egg.panels.map((id) => `name:${id}`), 'same']);
    expect(said(script)).toEqual(['correct', ...egg.panels.map(panelLine)]);
  });

  it('leaves everything else to the board', () => {
    expect(said(makeScript(situation('incorrect'), challenge)!)).toEqual([]);
    const other = {
      ...challenge,
      task: { ...challenge.task, type: 'echo' },
    } as unknown as MakeChallenge;
    expect(makeScript(situation('new'), other)).toBeNull();
  });
});

describe('a question with pictures to choose from', () => {
  const story: Stimulus = {
    type: 'scene',
    scene: 'strip',
    of: { kind: 'story', parts: egg.panels, gap: 2 },
  };
  const change: Stimulus = {
    type: 'scene',
    scene: 'strip',
    of: { kind: 'change', parts: ['snow2', 'sun', 'snow3'], gap: 1 },
  };

  const situation = (
    event: ScriptEvent,
    prompt: Stimulus,
    extra: Partial<ChooseSituation> = {},
  ): ChooseSituation => ({
    stage: 'independent',
    event,
    prompt,
    glance: false,
    again: false,
    choices: [picture('egg3'), picture('fly3')],
    answer: null,
    tried: null,
    revealed: false,
    lines: { instruction: 'instruction', feedback: null, hint: null, correct: 'correct' },
    seconds: () => 0,
    ...extra,
  });

  it('knows which pictures of a story are on show', () => {
    expect(toldSoFar(story)).toEqual(egg.panels.slice(0, 2));
    expect(toldSoFar(change)).toEqual([]);
    expect(toldSoFar({ type: 'picture', id: 'sun' })).toEqual([]);
  });

  it('tells a story as far as it goes, and then asks how it ends', () => {
    const script = chooseScript(situation('new', story));
    expect(said(script)).toEqual([...egg.panels.slice(0, 2).map(panelLine), 'instruction']);
    expect(beats(script)).toEqual(['ask', 'rest']);
  });

  it('ends the story with its own last line when the ending is found', () => {
    const script = chooseScript(
      situation('correct', story, {
        answer: picture('egg3'),
        lines: { instruction: 'instruction', feedback: 'feedback', hint: null },
      }),
    );
    expect(said(script)).toEqual([panelLine('egg3'), 'feedback']);
    expect(beats(script)).toEqual(['name:egg3', 'same']);
  });

  it('says what the answer is in a demonstration: the ending of a story, or what is right about a change', () => {
    const ending = chooseScript(
      situation('new', story, { stage: 'demo', answer: picture('egg3') }),
    );
    expect(said(ending)).toEqual([
      'lesson.watch',
      ...egg.panels.slice(0, 2).map(panelLine),
      'instruction',
      panelLine('egg3'),
    ]);
    const cause = chooseScript(situation('new', change, { stage: 'demo', answer: picture('sun') }));
    expect(said(cause)).toEqual(['lesson.watch', 'instruction', 'correct']);
    expect(beats(cause)).toEqual(['ask', 'name:sun', 'same']);
  });

  it('says a wrong answer is wrong and leaves the question open', () => {
    const script = chooseScript(
      situation('incorrect', change, {
        lines: { instruction: 'instruction', feedback: 'feedback', hint: null },
      }),
    );
    expect(said(script)).toEqual(['feedback']);
    expect(beats(script)).toEqual(['rest']);
  });

  it('points at the answer only when the help asked for is to be shown it', () => {
    const lines = { instruction: 'instruction', feedback: null, hint: 'hint' };
    const shown = chooseScript(situation('hint-reveal', change, { answer: picture('sun'), lines }));
    expect(beats(shown)).toEqual(['name:sun', 'rest']);
    const helped = chooseScript(situation('hint-model', change, { answer: picture('sun'), lines }));
    expect(beats(helped)).toEqual(['rest']);
  });
});
