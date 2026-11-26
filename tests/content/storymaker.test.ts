import { describe, expect, it } from 'vitest';
import {
  CHARACTERS,
  KEYS,
  SEEDS,
  SETTINGS,
  TURNS,
  askOf,
  choicesAt,
  everyLine,
  everyStory,
  inWords,
  nameOf,
  nextTurn,
  pageLines,
  pagesOf,
  type Story,
} from '@/content/explorer-harbor/storymaker';
import voiceLines from '@/voice/lines/explorer-harbor.json';

/**
 * The stories there are to make. What the brief asks of them is checked here by walking every way through:
 * six beginnings or more, every one of them branching, no way through that stops short of an ending, and a
 * line to tell every page of every one with. Nothing in a story is right or wrong, so nothing here asks which
 * choice is "the answer": there is none.
 */

const whole: Story = {
  who: 'fox',
  where: 'beach',
  seed: 'kite',
  trouble: 'no-wind',
  ending: 'run',
};

describe('a story to make', () => {
  it('is chosen in five turns: who, where, what they want, what goes wrong, how it comes right', () => {
    expect([...TURNS]).toEqual(['who', 'where', 'seed', 'trouble', 'ending']);
    expect(nextTurn({})).toBe('who');
    expect(nextTurn({ who: 'fox' })).toBe('where');
    expect(nextTurn({ who: 'fox', where: 'beach' })).toBe('seed');
    expect(nextTurn({ who: 'fox', where: 'beach', seed: 'kite' })).toBe('trouble');
    expect(nextTurn({ ...whole, ending: undefined })).toBe('ending');
    expect(nextTurn(whole)).toBeNull();
  });

  it('offers what belongs to what was chosen before: a beginning of that place, a trouble of that beginning', () => {
    expect(choicesAt({})).toEqual(Object.keys(CHARACTERS));
    expect(choicesAt({ who: 'bear' })).toEqual(Object.keys(SETTINGS));
    expect(choicesAt({ who: 'bear', where: 'forest' })).toEqual(['berries', 'stream']);
    expect(choicesAt({ who: 'bear', where: 'forest', seed: 'stream' })).toEqual(['broken', 'deep']);
    expect(choicesAt({ who: 'bear', where: 'forest', seed: 'stream', trouble: 'deep' })).toEqual([
      'along',
      'boat',
    ]);
    expect(choicesAt(whole)).toEqual([]);
    // Something that is not there to be chosen offers nothing after it, and does not fall over.
    expect(choicesAt({ who: 'fox', where: 'the moon' })).toEqual([]);
    expect(choicesAt({ who: 'fox', where: 'beach', seed: 'toString' })).toEqual([]);
  });

  it('has six beginnings, two to a place, and each belongs to one place only', () => {
    const offered = Object.values(SETTINGS).flatMap((setting) => setting.seeds);
    expect(Object.keys(SEEDS)).toHaveLength(6);
    expect([...offered].sort()).toEqual(Object.keys(SEEDS).sort());
    expect(new Set(offered).size).toBe(offered.length);
    for (const setting of Object.values(SETTINGS)) expect(setting.seeds).toHaveLength(2);
  });

  it('branches at every turn, and no way through it stops short: every choice leads to an ending', () => {
    for (const [id, seed] of Object.entries(SEEDS)) {
      const troubles = Object.entries(seed.troubles);
      expect(troubles.length, id).toBeGreaterThanOrEqual(2);
      for (const [name, trouble] of troubles) {
        expect(Object.keys(trouble.endings).length, `${id} ${name}`).toBeGreaterThanOrEqual(2);
      }
    }
    // Walked, not counted: from nothing chosen, every choice at every turn, to the end.
    const stories = everyStory();
    expect(stories).toHaveLength(3 * 6 * 2 * 2);
    for (const story of stories) {
      expect(nextTurn(story), JSON.stringify(story)).toBeNull();
      expect(pagesOf(story)).toBe(3);
    }
    // And they are all different stories.
    expect(new Set(stories.map((story) => inWords(story).join(' '))).size).toBe(stories.length);
  });

  it('has a page for the beginning, one for the trouble and one for the ending, as each is chosen', () => {
    expect(pagesOf({})).toBe(0);
    expect(pagesOf({ who: 'fox', where: 'beach' })).toBe(0);
    expect(pagesOf({ who: 'fox', where: 'beach', seed: 'kite' })).toBe(1);
    expect(pagesOf({ ...whole, ending: undefined })).toBe(2);
    expect(pagesOf(whole)).toBe(3);
    expect(pageLines(whole, 1)).toEqual(['eh.make.went.fox.beach', 'eh.make.wanted.fox.kite']);
    expect(pageLines(whole, 2)).toEqual(['eh.make.but.kite.no-wind']);
    expect(pageLines(whole, 3)).toEqual(['eh.make.so.kite.no-wind.run', 'eh.make.happy.fox']);
    // A page that has not been made yet has nothing to be told with.
    expect(pageLines({ who: 'fox', where: 'beach', seed: 'kite' }, 2)).toEqual([]);
    expect(pageLines(whole, 4)).toEqual([]);
  });

  it('is told in words that read as a story', () => {
    expect(inWords(whole)).toEqual([
      'One day, Fox went to the beach.',
      'Fox wanted to fly a kite.',
      'But the wind stopped, and the kite fell down.',
      'So it was time to run! Along the sand, as fast as the wind, and up went the kite.',
      'Fox was happy. The end.',
    ]);
  });

  it('asks for each choice in a line of its own, and for what they want by name', () => {
    expect(askOf({})).toBe(KEYS.who);
    expect(askOf({ who: 'rabbit' })).toBe(KEYS.where);
    expect(askOf({ who: 'rabbit', where: 'garden' })).toBe('eh.make.want.rabbit');
    expect(askOf({ who: 'rabbit', where: 'garden', seed: 'apple' })).toBe(KEYS.trouble);
    expect(askOf({ who: 'rabbit', where: 'garden', seed: 'apple', trouble: 'high' })).toBe(
      KEYS.ending,
    );
    expect(askOf(whole)).toBeNull();
    expect(everyLine()['eh.make.want.rabbit']).toBe('What does Rabbit want to do?');
  });

  it('names every choice for someone who cannot see its picture, and no two at one turn alike', () => {
    const walk = (story: Story) => {
      const turn = nextTurn(story);
      if (turn === null) return;
      const names = choicesAt(story).map((id) => nameOf(turn, story, id));
      for (const name of names) expect(name.length, JSON.stringify(story)).toBeGreaterThan(2);
      expect(new Set(names).size, JSON.stringify(story)).toBe(names.length);
      for (const id of choicesAt(story)) walk({ ...story, [turn]: id });
    };
    walk({});
    expect(nameOf('trouble', { seed: 'kite' }, 'tangle')).toBe('The string is in a tangle');
    expect(nameOf('ending', { seed: 'kite', trouble: 'tangle' }, 'crab')).toBe(
      'A crab snips the knots',
    );
    expect(nameOf('who', {}, 'nobody')).toBe('');
  });
});

describe('the lines a story is told with', () => {
  const lines = everyLine();

  it('are 75, one for every key a story can ask for', () => {
    expect(Object.keys(lines)).toHaveLength(75);
    const asked = new Set<string>();
    const walk = (story: Story) => {
      const ask = askOf(story);
      if (ask !== null) asked.add(ask);
      for (const page of [1, 2, 3]) for (const key of pageLines(story, page)) asked.add(key);
      const turn = nextTurn(story);
      if (turn !== null) for (const id of choicesAt(story)) walk({ ...story, [turn]: id });
    };
    walk({});
    asked.add(KEYS.told);
    asked.add(KEYS.whole);
    expect([...asked].sort()).toEqual(Object.keys(lines).sort());
  });

  it('are what the voice was made from, to the letter', () => {
    const made = Object.fromEntries(
      Object.entries(voiceLines.groups['explorer-harbor'].lines).filter(([key]) =>
        key.startsWith('eh.make.'),
      ),
    );
    expect(made).toEqual(lines);
  });

  it('are whole sentences, short enough to be said in a breath or two', () => {
    for (const [key, line] of Object.entries(lines)) {
      expect(line, key).toMatch(/^[A-Z].*[.!?]$/);
      expect(line, key).not.toMatch(/\s{2,}|\{|\}/);
      expect(line.length, key).toBeLessThanOrEqual(120);
    }
  });

  it('call nobody he or she: the three in the stories are a fox, a bear and a rabbit, and that is all', () => {
    for (const [key, line] of Object.entries(lines)) {
      expect(` ${line.toLowerCase()} `, key).not.toMatch(/[ ,.](he|she|his|her|hers|him)[ ,.!?]/);
    }
  });

  it('end every story well: the last page says so, whoever it is about', () => {
    for (const who of Object.keys(CHARACTERS)) {
      expect(lines[KEYS.happy(who)]).toBe(`${CHARACTERS[who]?.name ?? ''} was happy. The end.`);
    }
    // No ending is a telling-off, and none says a choice was wrong.
    for (const [key, line] of Object.entries(lines)) {
      if (!key.startsWith('eh.make.so.')) continue;
      expect(line.toLowerCase(), key).not.toMatch(/wrong|naughty|bad|silly|should not|failed/);
    }
  });
});
