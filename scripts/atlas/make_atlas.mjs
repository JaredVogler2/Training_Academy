// The shapes of the seven continents, for Explorer Harbor's globe, made from Natural Earth's small-scale map
// of the world's countries (public domain: naturalearthdata.com; docs/ASSETS.md has the file and its checksum).
//
//   node scripts/atlas/make_atlas.mjs <ne_110m_admin_0_countries.geojson>
//   npx prettier --write src/content/explorer-harbor/atlas.json
//
// It is run by hand when the shapes are to be made again, not by the build: what it writes,
// src/content/explorer-harbor/atlas.json, is committed, and the tests hold it to the world (a list of places
// that must be on the right continent, and of places that must be in the sea).
//
// What it does to the map, and why:
//
//   - The countries of a continent are melted into one: every stretch of outline that two of them share is
//     taken out, and what is left is the continent's own edge. Which country was which is thrown away. The
//     globe shows land and sea and seven big lands, and no border of any country anywhere.
//   - Natural Earth gives each country one continent. For a map of continents five things are moved: Russia
//     east of the Urals (taken as the line 60 degrees east) is Asia, to its far end beyond 180 degrees; French
//     Guiana is South America; the half of New Guinea that is Indonesia's is Oceania, with the other half;
//     Hawaii is Oceania; and the scattered islands it files under "Seven seas" are left out.
//   - Outlines are made coarser (to about a third of a degree) and specks are dropped, so that the globe can be
//     turned smoothly on a phone.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = process.argv[2];
if (!source) {
  console.error('Give the path of ne_110m_admin_0_countries.geojson.');
  process.exit(2);
}
const raw = readFileSync(source);
const world = JSON.parse(raw.toString('utf8'));

/** How far a point may be from the line it is left out of, in degrees. */
const COARSE = 0.3;
/** The smallest island that is kept, in square degrees (as measured on a flat map). */
const SPECK = 0.35;
/** Where Europe ends and Asia begins across Russia, in degrees east. */
const URALS = 60;

const KEYS = {
  Africa: 'africa',
  Antarctica: 'antarctica',
  Asia: 'asia',
  Europe: 'europe',
  'North America': 'north-america',
  Oceania: 'oceania',
  'South America': 'south-america',
};

const middle = (ring) => {
  let lon = 0;
  let lat = 0;
  for (const [x, y] of ring) {
    lon += x;
    lat += y;
  }
  return [lon / ring.length, lat / ring.length];
};

const areaOf = (ring) => {
  let twice = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    twice += x1 * y2 - x2 * y1;
  }
  return Math.abs(twice) / 2;
};

/** Keep the part of a ring on one side of a line of longitude. */
function cutAt(ring, lon, keepEast) {
  const inside = ([x]) => (keepEast ? x >= lon : x <= lon);
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (inside(a)) out.push(a);
    if (inside(a) !== inside(b)) {
      const t = (lon - a[0]) / (b[0] - a[0]);
      out.push([lon, a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

/** Leave out the points a line can do without (Douglas and Peucker's way), on an open run of points. */
function coarser(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [from, to] = stack.pop();
    const [ax, ay] = points[from];
    const [bx, by] = points[to];
    // Degrees of longitude are narrower away from the equator.
    const narrow = Math.cos((((ay + by) / 2) * Math.PI) / 180);
    const dx = (bx - ax) * narrow;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);
    let farthest = -1;
    let most = tolerance;
    for (let i = from + 1; i < to; i++) {
      const px = (points[i][0] - ax) * narrow;
      const py = points[i][1] - ay;
      const away = length === 0 ? Math.hypot(px, py) : Math.abs(px * dy - py * dx) / length;
      if (away > most) {
        most = away;
        farthest = i;
      }
    }
    if (farthest !== -1) {
      keep[farthest] = 1;
      stack.push([from, farthest], [farthest, to]);
    }
  }
  return points.filter((_, index) => keep[index] === 1);
}

/** A closed ring made coarser: cut at its two points farthest apart, so that neither end is special. */
function coarserRing(ring) {
  const open = ring.slice(0, -1);
  if (open.length < 8) return open;
  let far = 0;
  let most = -1;
  for (let i = 1; i < open.length; i++) {
    const away = Math.hypot(open[i][0] - open[0][0], open[i][1] - open[0][1]);
    if (away > most) {
      most = away;
      far = i;
    }
  }
  const first = coarser(open.slice(0, far + 1), COARSE);
  const second = coarser([...open.slice(far), open[0]], COARSE);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

/**
 * Melt outlines into one: a stretch that two outlines share is inside the land, and is taken out; the stretches
 * that are left are joined end to end into the rings that go round it. (Natural Earth's neighbours share their
 * border point for point, which is what makes this enough. Where two do not quite, a sliver is left with no
 * room in it, and is dropped with the specks.)
 */
function melted(rings) {
  const name = ([x, y]) => `${String(x)},${String(y)}`;
  const seen = new Map();
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const a = name(ring[i]);
      const b = name(ring[i + 1]);
      if (a === b) continue;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const entry = seen.get(key);
      if (entry) entry.times += 1;
      else seen.set(key, { from: ring[i], to: ring[i + 1], times: 1 });
    }
  }
  /** For each point, the points it is joined to by an edge of the outside. */
  const joined = new Map();
  const join = (a, b) => {
    const list = joined.get(name(a));
    if (list) list.push(b);
    else joined.set(name(a), [b]);
  };
  for (const { from, to, times } of seen.values()) {
    if (times !== 1) continue;
    join(from, to);
    join(to, from);
  }
  const used = new Set();
  const edge = (a, b) => (name(a) < name(b) ? `${name(a)}|${name(b)}` : `${name(b)}|${name(a)}`);
  const out = [];
  for (const [start, firsts] of joined) {
    for (const first of firsts) {
      const [sx, sy] = start.split(',').map(Number);
      let from = [sx, sy];
      let to = first;
      if (used.has(edge(from, to))) continue;
      const ring = [from];
      for (;;) {
        used.add(edge(from, to));
        ring.push(to);
        if (name(to) === start) break;
        const onward = (joined.get(name(to)) ?? []).find((next) => !used.has(edge(to, next)));
        if (!onward) break;
        from = to;
        to = onward;
      }
      if (ring.length >= 4 && name(ring.at(-1)) === start) out.push(ring);
    }
  }
  return out;
}

const whole = Object.fromEntries(Object.values(KEYS).map((key) => [key, []]));
const moved = [];

for (const feature of world.features) {
  const { NAME: name, CONTINENT: filed } = feature.properties;
  const key = KEYS[filed];
  if (!key) continue;
  const { type, coordinates } = feature.geometry;
  const polygons = type === 'Polygon' ? [coordinates] : coordinates;
  // A hole in a country is another country (Lesotho, inside South Africa): its edge is given with the rest, so
  // that the two melt into each other.
  for (const polygon of polygons) for (const hole of polygon.slice(1)) whole[key].push(hole);
  const outlines = polygons.map((polygon) => polygon[0]);
  for (const outline of outlines) {
    const [lon, lat] = middle(outline);
    const parts = [];
    if (name === 'Russia' && lon < 0) {
      // The far end of Russia goes on past the line where degrees east begin again at -180, and the source
      // keeps what is past it as outlines of their own. West of the Urals by their numbers, they are the
      // easternmost land in Asia.
      parts.push(['asia', outline]);
      moved.push('Russia beyond 180 degrees: Asia');
    } else if (name === 'Russia') {
      const west = cutAt(outline.slice(0, -1), URALS, false);
      const east = cutAt(outline.slice(0, -1), URALS, true);
      if (west.length >= 3) parts.push(['europe', [...west, west[0]]]);
      if (east.length >= 3) parts.push(['asia', [...east, east[0]]]);
      if (east.length >= 3 && west.length >= 3) moved.push('Russia east of the Urals: Asia');
    } else if (name === 'France' && lon < -30) {
      parts.push(['south-america', outline]);
      moved.push('French Guiana: South America');
    } else if (name === 'Indonesia' && lon > 130) {
      parts.push(['oceania', outline]);
      moved.push('Indonesia east of 130 degrees: Oceania');
    } else if (name === 'United States of America' && lon < -150 && lat < 30) {
      parts.push(['oceania', outline]);
      moved.push('Hawaii: Oceania');
    } else {
      parts.push([key, outline]);
    }
    for (const [to, ring] of parts) whole[to].push(ring);
  }
}

const continents = {};
for (const [key, rings] of Object.entries(whole)) {
  continents[key] = melted(rings)
    .filter((ring) => areaOf(ring) >= SPECK)
    .map((ring) => coarserRing(ring).map(([x, y]) => [Number(x.toFixed(2)), Number(y.toFixed(2))]))
    .filter((ring) => ring.length >= 3)
    // Largest first: the mainland, then its islands.
    .sort((a, b) => areaOf(b) - areaOf(a));
}

const count = (rings) => rings.reduce((sum, ring) => sum + ring.length, 0);
const atlas = {
  about:
    'The seven continents as outlines, in degrees east and north, made from Natural Earth by scripts/atlas/make_atlas.mjs. No country and no border is in it.',
  source: {
    name: 'Natural Earth, Admin 0 – Countries, 1:110m',
    licence: 'Public domain',
    sha256: createHash('sha256').update(raw).digest('hex'),
  },
  continents,
};
const out = join(root, 'src/content/explorer-harbor/atlas.json');
writeFileSync(out, `${JSON.stringify(atlas)}\n`);

for (const [key, rings] of Object.entries(continents)) {
  console.log(
    `${key.padEnd(14)} ${String(rings.length).padStart(3)} outlines, ${String(count(rings)).padStart(5)} points`,
  );
}
console.log(`moved: ${[...new Set(moved)].join('; ')}`);
console.log(
  `${Object.values(continents).reduce((sum, rings) => sum + count(rings), 0)} points in all, ${(JSON.stringify(atlas).length / 1024).toFixed(1)} kB: ${out}`,
);
