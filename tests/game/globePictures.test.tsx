// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import atlas from '@/content/explorer-harbor/atlas.json';
import { IN_SIGHT, inSight, type LonLat } from '@/content/explorer-harbor/globe';
import pack from '@/content/packs/explorer-harbor.v2.json';
import places from '@/content/explorer-harbor/places.json';
import type { ContentPack, Stimulus } from '@/engine';
import explorerHarbor, { describe as words } from '@/game/worlds/explorer-harbor';
import { Globe, Heard, LAND_KEYS, LandShape, placed } from '@/game/worlds/explorer-harbor/Globe';
import { LANDMARK_PICTURES, LandmarkPicture } from '@/game/worlds/explorer-harbor/landmarks';

/**
 * The globe as it is drawn, and what is said of it to someone who cannot see it: the seven lands, the fifteen
 * famous places, and the pictures an activity is known by on the world's page. How the globe is turned and
 * answered on is tried in a browser (e2e/harbor.spec.ts); the arithmetic under it in tests/content/globe.test.ts.
 */

const CONTINENT_NAMES = Object.values(places.continents).map((continent) => continent.name);
const challenges = (pack as unknown as ContentPack).lessons.flatMap((lesson) => lesson.challenges);
const globes = challenges.flatMap((challenge) =>
  challenge.kind === 'choose-one' &&
  challenge.prompt.stimulus.type === 'scene' &&
  challenge.prompt.stimulus.scene === 'globe'
    ? [challenge]
    : [],
);

const { Picture } = explorerHarbor;
const drawn = (stimulus: Stimulus, place: 'prompt' | 'choice' | 'card') =>
  renderToStaticMarkup(<Picture stimulus={stimulus} place={place} />);
const landsIn = (markup: string): string[] =>
  [...markup.matchAll(/data-land="([a-z-]+)"/g)].map((found) => found[1] ?? '');

describe('the famous places', () => {
  it('are the same fifteen in the list of places and in the drawings', () => {
    expect([...LANDMARK_PICTURES].sort()).toEqual(Object.keys(places.landmarks).sort());
    expect(LANDMARK_PICTURES).toHaveLength(15);
  });

  it('each have a drawing, which says which place it is and has no word in it', () => {
    for (const id of LANDMARK_PICTURES) {
      const markup = renderToStaticMarkup(<LandmarkPicture id={id} />);
      expect(markup, id).toContain(`data-landmark="${id}"`);
      expect(markup, id).not.toContain('<text');
      // More than a tile of sky and ground: the place itself.
      expect(markup.match(/<(path|rect|circle|ellipse|polygon)/g)?.length ?? 0, id).toBeGreaterThan(
        3,
      );
    }
    // Something that is not one of them is not drawn, and a name that every object has is not one of them.
    expect(renderToStaticMarkup(<LandmarkPicture id="atlantis" />)).toBe('');
    expect(renderToStaticMarkup(<LandmarkPicture id="toString" />)).toBe('');
  });

  it('are each in a land the atlas has, at a place on the earth', () => {
    for (const [id, landmark] of Object.entries(places.landmarks)) {
      expect(LAND_KEYS, id).toContain(landmark.continent);
      const [lon = NaN, lat = NaN] = landmark.at;
      expect(Math.abs(lon), id).toBeLessThanOrEqual(180);
      expect(Math.abs(lat), id).toBeLessThanOrEqual(90);
      expect(landmark.article.length, id).toBeGreaterThan(3);
    }
  });
});

describe('the globe, drawn', () => {
  it('has the seven lands and nothing else that is a land', () => {
    expect([...LAND_KEYS].sort()).toEqual(Object.keys(places.continents).sort());
    expect(Object.keys(atlas.continents).sort()).toEqual([...LAND_KEYS].sort());
  });

  it('draws only the lands that face, and says where it is looking', () => {
    const africa = renderToStaticMarkup(<Globe view={{ lon: 20, lat: 5 }} />);
    expect(africa).toContain('data-lon="20.0"');
    expect(africa).toContain('data-lat="5.0"');
    expect(landsIn(africa)).toContain('africa');
    expect(landsIn(africa)).toContain('europe');
    // Looking at Africa, Oceania is round the back of the world, and it alone: Greenland and the east of
    // Brazil are in sight at the left, and the ice at the foot.
    expect(landsIn(africa)).not.toContain('oceania');
    expect(landsIn(africa)).toHaveLength(6);
    const pacific = renderToStaticMarkup(<Globe view={{ lon: -160, lat: 0 }} />);
    expect(landsIn(pacific)).not.toContain('africa');
    expect(landsIn(pacific)).not.toContain('europe');
    expect(landsIn(pacific)).toContain('north-america');
    expect(landsIn(pacific)).toContain('oceania');
    // Not a word on it, and nothing in it that could be pressed or read out.
    expect(africa).not.toContain('<text');
    expect(africa).toContain('aria-hidden="true"');
  });

  it('draws the land that is lit last, so that no other land lies over its edge', () => {
    const plain = landsIn(renderToStaticMarkup(<Globe view={{ lon: 20, lat: 30 }} />));
    expect(plain.at(-1)).not.toBe('africa');
    const lit = renderToStaticMarkup(<Globe view={{ lon: 20, lat: 30 }} lit="africa" />);
    expect(landsIn(lit).at(-1)).toBe('africa');
    expect([...landsIn(lit)].sort()).toEqual([...plain].sort());
    expect(lit.match(/data-lit="true"/g)).toHaveLength(1);
    expect(lit).toMatch(/data-land="africa" data-lit="true"/);
    expect(renderToStaticMarkup(<Globe view={{ lon: 20, lat: 30 }} />)).not.toContain(
      'data-lit="true"',
    );
  });

  it('puts a pin over the place it stands for: the middle in the middle, the edge at the edge', () => {
    expect(placed({ lon: 20, lat: 5 }, [20, 5])).toEqual({ left: '50.00%', top: '50.00%' });
    // The ball is 100 of the picture's 104 units from its middle to its edge.
    const edge = (100 / 208) * 100;
    expect(placed({ lon: 0, lat: 0 }, [90, 0])).toEqual({
      left: `${(50 + edge).toFixed(2)}%`,
      top: '50.00%',
    });
    expect(placed({ lon: 0, lat: 0 }, [0, 90])).toEqual({
      left: '50.00%',
      top: `${(50 - edge).toFixed(2)}%`,
    });
    // East is to the right and north is up.
    const paris = placed({ lon: 20, lat: 5 }, [2.35, 48.86]);
    expect(parseFloat(String(paris.left))).toBeLessThan(50);
    expect(parseFloat(String(paris.top))).toBeLessThan(50);
  });

  it('counts a pin as in sight only when it faces, and not at the very edge', () => {
    expect(inSight({ lon: 0, lat: 0 }, [0, 0])).toBe(true);
    expect(inSight({ lon: 0, lat: 0 }, [60, 0])).toBe(true);
    // cos 80 degrees is 0.17: nearer the edge than a pin may be.
    expect(inSight({ lon: 0, lat: 0 }, [80, 0])).toBe(false);
    expect(inSight({ lon: 0, lat: 0 }, [120, 0])).toBe(false);
    expect(IN_SIGHT).toBe(0.2);
  });

  it('has every pin of every question well in sight as the question is put', () => {
    expect(globes.length).toBe(35);
    for (const challenge of globes) {
      const { stimulus } = challenge.prompt;
      const [lon = 0, lat = 0] = stimulus.type === 'scene' ? (stimulus.of.view as number[]) : [];
      for (const choice of challenge.choices) {
        const at = choice.stimulus.type === 'scene' ? (choice.stimulus.of.at as number[]) : [];
        expect(inSight({ lon, lat }, at as unknown as LonLat), `${challenge.id} ${choice.id}`).toBe(
          true,
        );
      }
    }
  });
});

describe('the shape of a land, drawn', () => {
  it('is one closed shape in a square picture, for each of the seven', () => {
    for (const land of LAND_KEYS) {
      const markup = renderToStaticMarkup(<LandShape land={land} />);
      expect(markup, land).toContain(`data-shape="${land}"`);
      const [, , , width, height] =
        /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(markup) ?? [];
      expect(Number(width), land).toBeGreaterThan(10);
      expect(width, land).toBe(height);
      expect(markup.match(/<path/g), land).toHaveLength(1);
      expect(markup, land).toMatch(/d="M[-\d. L]+Z/);
      expect(markup, land).not.toContain('<text');
    }
  });

  it('is nothing at all for a land there is not, and does not fall over', () => {
    const markup = renderToStaticMarkup(<LandShape land="atlantis" />);
    expect(markup).toContain('d=""');
  });
});

describe('what an activity with the globe is known by, on the world’s page', () => {
  const first = (id: string) => {
    const found = globes.find((challenge) => challenge.id === id);
    if (!found) throw new Error(`No challenge called ${id}.`);
    return found;
  };

  it('is the globe, for finding a land by its shape', () => {
    const { stimulus } = first('eh-lands-01.demo').prompt;
    expect(drawn(stimulus, 'card')).toContain('data-scene="globe"');
    expect(drawn(stimulus, 'prompt')).toContain('data-scene="globe"');
  });

  it('is a sound, for finding a land by its name alone', () => {
    const { stimulus } = first('eh-lands-02.demo').prompt;
    expect(drawn(stimulus, 'card')).not.toContain('data-scene="globe"');
    expect(drawn(stimulus, 'card')).toContain('data-heard="true"');
    expect(renderToStaticMarkup(<Heard />)).toContain('data-heard="true"');
    // Asked, it is the globe: the name is heard, and the land is found there.
    expect(drawn(stimulus, 'prompt')).toContain('data-scene="globe"');
  });

  it('is the famous place, for finding the land a famous place is in', () => {
    const { stimulus } = first('eh-places-01.pyramids').prompt;
    expect(drawn(stimulus, 'card')).toContain('data-landmark="pyramids"');
    expect(drawn(stimulus, 'card')).not.toContain('data-scene="globe"');
    // Asked on the globe itself, it is the globe.
    expect(drawn(stimulus, 'prompt')).toContain('data-scene="globe"');
  });

  it('is, beside it, the shape of the land that is the answer', () => {
    const challenge = first('eh-lands-01.demo');
    const answer = challenge.choices.find((choice) => choice.id === challenge.answer);
    expect(drawn(answer?.stimulus ?? challenge.prompt.stimulus, 'card')).toContain(
      'data-shape="africa"',
    );
  });
});

describe('the globe, in words', () => {
  it('is said to be a globe with three pins, and never by the name of the land that is asked for', () => {
    for (const challenge of globes) {
      const said = words(challenge.prompt.stimulus);
      expect(said, challenge.id).toContain('A globe of the world');
      expect(said, challenge.id).toContain('Three of its lands have a pin.');
      for (const name of CONTINENT_NAMES) expect(said, challenge.id).not.toContain(name);
    }
  });

  it('says what is shown beside it: a shape, or a famous place by its name, or nothing', () => {
    const shape = globes.find((challenge) => challenge.id === 'eh-lands-01.demo');
    const name = globes.find((challenge) => challenge.id === 'eh-lands-02.demo');
    const place = globes.find((challenge) => challenge.id === 'eh-places-01.pyramids');
    expect(words(shape?.prompt.stimulus as Stimulus)).toMatch(/^The shape of one land\. A globe/);
    expect(words(name?.prompt.stimulus as Stimulus)).toMatch(/^A globe of the world/);
    expect(words(place?.prompt.stimulus as Stimulus)).toMatch(
      /^A picture of the pyramids\. The shape of one land\. A globe/,
    );
  });

  it('gives each pin a label that says where it is and not which land it is', () => {
    for (const challenge of globes) {
      const labels = challenge.choices.map((choice) => choice.label);
      expect(new Set(labels).size, challenge.id).toBe(labels.length);
      for (const label of labels) {
        expect(label, challenge.id).toMatch(/^The land /);
        for (const each of CONTINENT_NAMES) expect(label, challenge.id).not.toContain(each);
      }
      for (const choice of challenge.choices) {
        expect(words(choice.stimulus), challenge.id).toBe('A land on the globe.');
      }
    }
  });
});
