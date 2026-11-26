import { describe, expect, it } from 'vitest';
import atlas from '@/content/explorer-harbor/atlas.json';
import { inside, type LonLat } from '@/content/explorer-harbor/globe';

/**
 * The continents' outlines, held to the world.
 *
 * The outlines are made by a script from Natural Earth (`scripts/atlas/make_atlas.mjs`) and committed. Nothing
 * here trusts the script: each place below is somewhere a great many people could point to on a globe, and it
 * must be inside the continent it is in and inside no other; and each stretch of sea must be inside none. A
 * shape that was melted wrongly, cut on the wrong side of the Urals or made too coarse fails here by name.
 */

const CONTINENTS = [
  'africa',
  'antarctica',
  'asia',
  'europe',
  'north-america',
  'oceania',
  'south-america',
] as const;
type Continent = (typeof CONTINENTS)[number];

const rings = atlas.continents as unknown as Record<Continent, LonLat[][]>;

/** The continents a place is inside, by these outlines. */
const landsAt = (place: LonLat): Continent[] =>
  CONTINENTS.filter((continent) => rings[continent].some((ring) => inside(place, ring)));

/** Places on land: degrees east, degrees north. Inland where a coast would make a coarse outline a coin toss. */
const ON_LAND: readonly (readonly [string, number, number, Continent])[] = [
  ['Cairo', 31.24, 30.04, 'africa'],
  ['Bamako', -8.0, 12.65, 'africa'],
  ['Kinshasa', 15.3, -4.3, 'africa'],
  ['Nairobi', 36.82, -1.29, 'africa'],
  ['Addis Ababa', 38.75, 9.0, 'africa'],
  ['Johannesburg', 28.05, -26.2, 'africa'],
  ['Maseru, in Lesotho, which is inside South Africa', 27.48, -29.31, 'africa'],
  ['Antananarivo, on Madagascar', 47.5, -18.9, 'africa'],
  ['the Sinai', 33.8, 29.5, 'africa'],
  ['Paris', 2.35, 48.86, 'europe'],
  ['Madrid', -3.7, 40.4, 'europe'],
  ['Rome', 12.5, 41.9, 'europe'],
  ['Berlin', 13.4, 52.5, 'europe'],
  ['Kyiv', 30.5, 50.45, 'europe'],
  ['Moscow', 37.6, 55.75, 'europe'],
  ['Birmingham, in Great Britain', -1.9, 52.5, 'europe'],
  ['Östersund, in Sweden', 14.6, 63.2, 'europe'],
  ['Perm, west of the Urals', 56.2, 58.0, 'europe'],
  ['Yekaterinburg, east of the line the Urals are taken as', 60.6, 56.8, 'asia'],
  ['Novosibirsk', 82.9, 55.0, 'asia'],
  ['Yakutsk', 129.7, 62.0, 'asia'],
  ['the far end of Russia, past 180 degrees, where degrees east begin again', -175.0, 66.5, 'asia'],
  ['Wrangel Island, past 180 degrees', -179.5, 71.2, 'asia'],
  ['Beijing', 116.4, 39.9, 'asia'],
  ['Delhi', 77.2, 28.6, 'asia'],
  ['Riyadh', 46.7, 24.7, 'asia'],
  ['Ankara', 32.85, 39.93, 'asia'],
  ['Astana', 71.4, 51.2, 'asia'],
  ['Chiang Mai', 99.0, 18.8, 'asia'],
  ['Nagano, on Honshu', 138.2, 36.65, 'asia'],
  ['the middle of Borneo', 114.0, 0.5, 'asia'],
  ['Denver', -105.0, 39.7, 'north-america'],
  ['Chicago', -87.6, 41.9, 'north-america'],
  ['Winnipeg', -97.1, 49.9, 'north-america'],
  ['Fairbanks', -147.7, 64.8, 'north-america'],
  ['Mexico City', -99.1, 19.4, 'north-america'],
  ['Guatemala City', -90.5, 14.6, 'north-america'],
  ['the middle of Greenland', -42.0, 72.0, 'north-america'],
  ['Brasília', -47.9, -15.8, 'south-america'],
  ['Bogotá', -74.1, 4.7, 'south-america'],
  ['Cusco', -71.97, -13.53, 'south-america'],
  ['Córdoba, in Argentina', -64.2, -31.4, 'south-america'],
  ['inland French Guiana', -53.0, 3.5, 'south-america'],
  ['Alice Springs', 133.9, -23.7, 'oceania'],
  ['Canberra', 149.1, -35.3, 'oceania'],
  ['Mount Hagen, in Papua New Guinea', 144.2, -5.9, 'oceania'],
  ['the west of New Guinea', 138.5, -4.0, 'oceania'],
  ['Taupō, in New Zealand', 176.0, -38.7, 'oceania'],
  ['Antarctica, south of Africa', 20.0, -80.0, 'antarctica'],
  ['Antarctica, south of Australia', 120.0, -75.0, 'antarctica'],
  ['Antarctica, south of America', -100.0, -82.0, 'antarctica'],
];

/** Places at sea. */
const AT_SEA: readonly (readonly [string, number, number])[] = [
  ['the middle of the Atlantic', -30, 30],
  ['the South Atlantic', -15, -25],
  ['the middle of the Pacific', -140, 0],
  ['the North Pacific', 170, 40],
  ['the Indian Ocean', 75, -20],
  ['the Arctic Ocean', 0, 85],
  ['the Southern Ocean', 0, -60],
  ['the Mediterranean', 18, 35],
  ['the Black Sea', 35, 43.5],
  ['the Caspian Sea', 51, 42],
  ['the Gulf of Mexico', -90, 25],
  ['the Caribbean', -75, 15],
  ['Hudson Bay', -85, 60],
  ['the North Sea', 3, 56],
  ['the Sea of Japan', 135, 40],
  ['the strait between Asia and America', -168.5, 65.7],
  ['the Bay of Bengal', 88, 15],
  ['the Arabian Sea', 65, 15],
  ['the Great Australian Bight', 130, -35],
  ['the Tasman Sea', 160, -40],
  ['between Africa and Madagascar', 41, -18],
];

describe('the continents, as outlines', () => {
  it('are the seven, and no country or border is among them', () => {
    expect(Object.keys(atlas.continents).sort()).toEqual([...CONTINENTS]);
    // Nothing in the outlines but the seven names and numbers: no country's name could be in there.
    expect(JSON.stringify(atlas.continents)).toMatch(/^[-[\]{}",.:0-9a-z]+$/);
    expect(
      JSON.stringify(atlas.continents)
        .match(/[a-z][-a-z]+/g)
        ?.sort(),
    ).toEqual([...CONTINENTS]);
    expect(atlas.source.licence).toBe('Public domain');
    expect(atlas.source.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('are small enough to be turned smoothly on a phone, and every place in them is a place', () => {
    let points = 0;
    for (const continent of CONTINENTS) {
      expect(rings[continent].length, continent).toBeGreaterThan(0);
      for (const ring of rings[continent]) {
        expect(ring.length).toBeGreaterThanOrEqual(3);
        points += ring.length;
        for (const [lon, lat] of ring) {
          expect(lon).toBeGreaterThanOrEqual(-180);
          expect(lon).toBeLessThanOrEqual(180);
          expect(lat).toBeGreaterThanOrEqual(-90);
          expect(lat).toBeLessThanOrEqual(90);
        }
      }
    }
    expect(points).toBeLessThanOrEqual(2600);
  });

  it.each(ON_LAND)(
    'have %s on land, in the continent it is in and in no other',
    (_name, lon, lat, continent) => {
      expect(landsAt([lon, lat])).toEqual([continent]);
    },
  );

  it.each(AT_SEA)('have %s in none of them', (_name, lon, lat) => {
    expect(landsAt([lon, lat])).toEqual([]);
  });

  it('give each continent its mainland first, so that it is the first thing found', () => {
    const where: Record<Continent, LonLat> = {
      africa: [20, 5],
      antarctica: [60, -80],
      asia: [95, 45],
      europe: [15, 50],
      'north-america': [-100, 45],
      oceania: [135, -25],
      'south-america': [-58, -12],
    };
    for (const continent of CONTINENTS) {
      const mainland = rings[continent][0] ?? [];
      expect(inside(where[continent], mainland), continent).toBe(true);
    }
  });
});
