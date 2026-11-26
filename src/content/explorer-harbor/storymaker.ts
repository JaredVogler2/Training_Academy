import file from './storymaker.json';

/**
 * A story to make, in Explorer Harbor's room: what there is to choose from at each turn of it, and the lines it
 * is told with. Pure reading of `storymaker.json`; the pictures are in the game, and the content generator
 * (plain JavaScript, which cannot import this) builds the same lines from the same file, which a test holds it to.
 *
 * A story is five choices: who it is about, where it happens, what they want (a beginning: the file calls it a
 * seed), what goes wrong, and how it comes right. The first three make the first page, the fourth the second and
 * the fifth the third. Every beginning has two things that can go wrong, and each of those two ways of coming
 * right: no choice leads nowhere, and none is better than another.
 */

export interface Ending {
  name: string;
  so: string;
}
export interface Trouble {
  name: string;
  but: string;
  endings: Readonly<Record<string, Ending>>;
}
export interface Seed {
  name: string;
  want: string;
  troubles: Readonly<Record<string, Trouble>>;
}
export interface Setting {
  name: string;
  went: string;
  seeds: readonly string[];
}
export interface Character {
  name: string;
}

export const CHARACTERS: Readonly<Record<string, Character>> = file.characters;
export const SETTINGS: Readonly<Record<string, Setting>> = file.settings;
export const SEEDS: Readonly<Record<string, Seed>> = file.seeds;
const ASKS = file.asks;

/** A story as far as it has been chosen. */
export interface Story {
  who?: string;
  where?: string;
  seed?: string;
  trouble?: string;
  ending?: string;
}
/** A story with nothing left to choose. */
export type WholeStory = Required<Story>;

/** What is chosen at each turn, in the order it is chosen. */
export const TURNS = ['who', 'where', 'seed', 'trouble', 'ending'] as const;
export type Turn = (typeof TURNS)[number];

/** The turn that comes next in a story, or `null` when it is whole. */
export function nextTurn(story: Story): Turn | null {
  return TURNS.find((turn) => story[turn] === undefined) ?? null;
}

/** What there is to choose from at the next turn of a story: ids, in the order they are offered. */
export function choicesAt(story: Story): string[] {
  switch (nextTurn(story)) {
    case 'who':
      return Object.keys(CHARACTERS);
    case 'where':
      return Object.keys(SETTINGS);
    case 'seed':
      return [...(SETTINGS[story.where ?? '']?.seeds ?? [])];
    case 'trouble':
      return Object.keys(SEEDS[story.seed ?? '']?.troubles ?? {});
    case 'ending':
      return Object.keys(SEEDS[story.seed ?? '']?.troubles[story.trouble ?? '']?.endings ?? {});
    case null:
      return [];
  }
}

/** What a choice is called, for someone who cannot see its picture. */
export function nameOf(turn: Turn, story: Story, id: string): string {
  switch (turn) {
    case 'who':
      return CHARACTERS[id]?.name ?? '';
    case 'where':
      return SETTINGS[id]?.name ?? '';
    case 'seed':
      return SEEDS[id]?.name ?? '';
    case 'trouble':
      return SEEDS[story.seed ?? '']?.troubles[id]?.name ?? '';
    case 'ending':
      return SEEDS[story.seed ?? '']?.troubles[story.trouble ?? '']?.endings[id]?.name ?? '';
  }
}

/** The key of a line of the voice. */
export const KEYS = {
  who: 'eh.make.who',
  where: 'eh.make.where',
  want: (who: string) => `eh.make.want.${who}`,
  trouble: 'eh.make.trouble',
  ending: 'eh.make.ending',
  told: 'eh.make.told',
  whole: 'eh.make.whole',
  went: (who: string, where: string) => `eh.make.went.${who}.${where}`,
  wanted: (who: string, seed: string) => `eh.make.wanted.${who}.${seed}`,
  but: (seed: string, trouble: string) => `eh.make.but.${seed}.${trouble}`,
  so: (seed: string, trouble: string, ending: string) => `eh.make.so.${seed}.${trouble}.${ending}`,
  happy: (who: string) => `eh.make.happy.${who}`,
} as const;

/** The line that asks for the next choice of a story. */
export function askOf(story: Story): string | null {
  switch (nextTurn(story)) {
    case 'who':
      return KEYS.who;
    case 'where':
      return KEYS.where;
    case 'seed':
      return KEYS.want(story.who ?? '');
    case 'trouble':
      return KEYS.trouble;
    case 'ending':
      return KEYS.ending;
    case null:
      return null;
  }
}

/** How many pages a story has so far: one when the beginning is chosen, two with the trouble, three when whole. */
export function pagesOf(story: Story): number {
  if (story.seed === undefined) return 0;
  if (story.trouble === undefined) return 1;
  return story.ending === undefined ? 2 : 3;
}

/** The lines a page of a story is told with, in order. Page 1 is the first. */
export function pageLines(story: Story, page: number): string[] {
  const { who = '', where = '', seed = '', trouble = '', ending = '' } = story;
  if (page === 1 && pagesOf(story) >= 1) return [KEYS.went(who, where), KEYS.wanted(who, seed)];
  if (page === 2 && pagesOf(story) >= 2) return [KEYS.but(seed, trouble)];
  if (page === 3 && pagesOf(story) >= 3) return [KEYS.so(seed, trouble, ending), KEYS.happy(who)];
  return [];
}

/** Every line there is to say in the room, by key: what the voice is made from. */
export function everyLine(): Record<string, string> {
  const lines: Record<string, string> = {
    [KEYS.who]: ASKS.who,
    [KEYS.where]: ASKS.where,
    [KEYS.trouble]: ASKS.trouble,
    [KEYS.ending]: ASKS.ending,
    [KEYS.told]: ASKS.told,
    [KEYS.whole]: ASKS.whole,
  };
  for (const [who, { name }] of Object.entries(CHARACTERS)) {
    lines[KEYS.want(who)] = ASKS.want.replace('{name}', name);
    lines[KEYS.happy(who)] = ASKS.happy.replace('{name}', name);
    for (const [where, setting] of Object.entries(SETTINGS)) {
      lines[KEYS.went(who, where)] = `One day, ${name} ${setting.went}.`;
    }
    for (const [seed, { want }] of Object.entries(SEEDS)) {
      lines[KEYS.wanted(who, seed)] = `${name} ${want}.`;
    }
  }
  for (const [seed, { troubles }] of Object.entries(SEEDS)) {
    for (const [trouble, { but, endings }] of Object.entries(troubles)) {
      lines[KEYS.but(seed, trouble)] = but;
      for (const [ending, { so }] of Object.entries(endings)) {
        lines[KEYS.so(seed, trouble, ending)] = so;
      }
    }
  }
  return lines;
}

/** Every whole story there is: each way through, for each of those it can be about. */
export function everyStory(): WholeStory[] {
  const stories: WholeStory[] = [];
  const grow = (story: Story) => {
    const turn = nextTurn(story);
    if (turn === null) {
      stories.push(story as WholeStory);
      return;
    }
    for (const id of choicesAt(story)) grow({ ...story, [turn]: id });
  };
  grow({});
  return stories;
}

/** The whole of a story in words, as it is told: for a screen reader, and for the tests. */
export function inWords(story: Story): string[] {
  const lines = everyLine();
  return [1, 2, 3].flatMap((page) => pageLines(story, page)).map((key) => lines[key] ?? '');
}
