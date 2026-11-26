// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CHARACTERS,
  SEEDS,
  SETTINGS,
  everyStory,
  type Story,
} from '@/content/explorer-harbor/storymaker';
import { ANIMAL_IDS, PLACE_IDS } from '@/game/worlds/explorer-harbor/storyParts';
import { SCENES, StoryPicture, sceneOf } from '@/game/worlds/explorer-harbor/storyScenes';

/**
 * The pictures of a made-up story. A story can be made 72 ways and each has three pages; none of those 216
 * pictures is drawn by hand as a whole. Each is put together from a place, one of three animals, and a scene
 * for what the page says. What is tried here is that every page of every story has its picture, that no two
 * things a child chooses between look alike, and that the one the story is about looks glad, then not, then
 * glad again, whatever was chosen. Whether the pictures are good to look at is for a person to say.
 */

const drawn = (story: Story, page: number) =>
  renderToStaticMarkup(<StoryPicture story={story} page={page} />);
const attribute = (markup: string, name: string): string | undefined =>
  new RegExp(`${name}="([^"]*)"`).exec(markup)?.[1];
/**
 * A picture as it is drawn, without what it is labelled as: two pictures are told apart here by what is in
 * them. (Told apart by their labels, a bear drawn as a fox was "different from the fox": it said bear.)
 */
const bare = (markup: string): string => markup.replace(/ data-[a-z-]+="[^"]*"/g, '');
const drawing = (story: Story, page: number): string => bare(drawn(story, page));

describe('what the pictures are put together from', () => {
  it('has a drawing for each of the three a story can be about, and each of the three places', () => {
    expect([...ANIMAL_IDS].sort()).toEqual(Object.keys(CHARACTERS).sort());
    expect([...PLACE_IDS].sort()).toEqual(Object.keys(SETTINGS).sort());
  });

  it('has a scene for every beginning, every trouble and every ending there is to choose, and no other', () => {
    expect(Object.keys(SCENES).sort()).toEqual(Object.keys(SEEDS).sort());
    for (const [seed, { troubles }] of Object.entries(SEEDS)) {
      expect(Object.keys(SCENES[seed]?.troubles ?? {}).sort(), seed).toEqual(
        Object.keys(troubles).sort(),
      );
      for (const [trouble, { endings }] of Object.entries(troubles)) {
        expect(
          Object.keys(SCENES[seed]?.troubles[trouble]?.endings ?? {}).sort(),
          `${seed} ${trouble}`,
        ).toEqual(Object.keys(endings).sort());
      }
    }
  });
});

describe('the pages of a story', () => {
  const stories = everyStory();

  it('each have a picture, with the one it is about in the place it happens: 216 pages', () => {
    let pages = 0;
    for (const story of stories) {
      for (const page of [1, 2, 3]) {
        const markup = drawn(story, page);
        expect(attribute(markup, 'data-drawn'), JSON.stringify(story)).toBe('true');
        expect(attribute(markup, 'data-animal')).toBe(story.who);
        expect(attribute(markup, 'data-place')).toBe(story.where);
        pages += 1;
      }
    }
    expect(pages).toBe(216);
  });

  it('show them glad at the beginning, not when it has gone wrong, and glad again at the end', () => {
    for (const story of stories) {
      const moods = [1, 2, 3].map((page) => attribute(drawn(story, page), 'data-mood'));
      expect(moods, JSON.stringify(story)).toEqual(['glad', 'sad', 'glad']);
    }
  });

  it('are all different pictures: every trouble from every other, and every ending', () => {
    // For one of the three; the other two differ from it only in who is drawn.
    const fox = stories.filter((story) => story.who === 'fox');
    const starts = new Set(fox.map((story) => drawing(story, 1)));
    const troubles = new Set(fox.map((story) => drawing(story, 2)));
    const endings = new Set(fox.map((story) => drawing(story, 3)));
    expect(starts.size).toBe(6);
    expect(troubles.size).toBe(12);
    expect(endings.size).toBe(24);
    // And no page of a story is the page before it over again.
    for (const story of stories) {
      expect(new Set([1, 2, 3].map((page) => drawing(story, page))).size).toBe(3);
    }
  });

  it('are different for each of the three it can be about', () => {
    const one = { where: 'beach', seed: 'kite', trouble: 'tangle', ending: 'crab' };
    const pictures = Object.keys(CHARACTERS).map((who) => drawing({ ...one, who }, 3));
    expect(new Set(pictures).size).toBe(3);
  });

  it('have nothing written in them', () => {
    for (const story of stories.slice(0, 24)) {
      for (const page of [1, 2, 3]) expect(drawn(story, page)).not.toMatch(/<text|<tspan/);
    }
  });

  it('are hidden from a screen reader: the words of the page are beside the picture', () => {
    expect(drawn(stories[0] ?? {}, 1)).toContain('aria-hidden="true"');
  });
});

describe('the first page, as it is put together', () => {
  it('is blank paper, then someone on it, then the place round them, then what they want', () => {
    const blank = drawn({}, 1);
    expect(attribute(blank, 'data-animal')).toBeUndefined();
    expect(attribute(blank, 'data-place')).toBeUndefined();

    const someone = drawn({ who: 'bear' }, 1);
    expect(attribute(someone, 'data-animal')).toBe('bear');
    expect(attribute(someone, 'data-place')).toBeUndefined();

    const somewhere = drawn({ who: 'bear', where: 'garden' }, 1);
    expect(attribute(somewhere, 'data-place')).toBe('garden');

    const wanting = drawn({ who: 'bear', where: 'garden', seed: 'apple' }, 1);
    expect(new Set([blank, someone, somewhere, wanting].map(bare)).size).toBe(4);
    expect(wanting.length).toBeGreaterThan(somewhere.length);
  });

  it('shows each of the three plainly different from the others, and each place', () => {
    const who = Object.keys(CHARACTERS).map((id) => drawing({ who: id }, 1));
    expect(new Set(who).size).toBe(3);
    const where = Object.keys(SETTINGS).map((id) => drawing({ who: 'fox', where: id }, 1));
    expect(new Set(where).size).toBe(3);
  });
});

describe('a page that has not been reached', () => {
  it('has no scene, and nobody is drawn on it', () => {
    const story: Story = { who: 'rabbit', where: 'forest', seed: 'stream' };
    expect(sceneOf(story, 2)).toBeNull();
    expect(sceneOf(story, 3)).toBeNull();
    const markup = drawn(story, 2);
    expect(attribute(markup, 'data-drawn')).toBe('false');
    expect(attribute(markup, 'data-animal')).toBeUndefined();
  });

  it('is not made up from a name that is not in the story: nothing falls over', () => {
    expect(sceneOf({ who: 'fox', where: 'beach', seed: 'toString' }, 1)).toEqual({
      x: -18,
      y: 25,
      mood: 'glad',
    });
    expect(
      sceneOf({ who: 'fox', where: 'beach', seed: 'kite', trouble: 'constructor' }, 2),
    ).toBeNull();
    expect(drawn({ who: 'nobody', where: 'nowhere' }, 1)).toContain('<svg');
    expect(sceneOf({}, 4)).toBeNull();
  });
});
