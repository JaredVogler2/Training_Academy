// Where each famous place of Explorer Harbor is, checked against what Wikipedia gives for it.
//
//   node scripts/atlas/check_places.mjs
//
// Run by hand, with a connection: it asks Wikipedia for the summary of each place's article and compares the
// coordinates there with the ones in src/content/explorer-harbor/places.json. It sends nothing but the titles
// of the articles. It is not part of the build or of the tests, which must run with no network; what it found
// when it was last run is written in docs/ASSETS.md, with the date.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { landmarks } = JSON.parse(
  readFileSync(join(root, 'src/content/explorer-harbor/places.json'), 'utf8'),
);

/** How far a place may be from where the article puts it, in degrees: the places are pins on a globe. */
const NEAR = 0.5;
let wrong = 0;
let unchecked = 0;
/** Asked one at a time, with a pause between: it is somebody else's server. */
const pause = () => new Promise((resolve) => setTimeout(resolve, 1500));

for (const [id, place] of Object.entries(landmarks)) {
  await pause();
  const title = encodeURIComponent(place.article.replaceAll(' ', '_'));
  const answer = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, {
    headers: { 'User-Agent': 'content-check/1.0' },
  });
  if (!answer.ok) {
    console.log(`${id.padEnd(20)} no article "${place.article}" (${String(answer.status)})`);
    wrong += 1;
    continue;
  }
  const summary = await answer.json();
  const given = summary.coordinates;
  if (!given) {
    // Not the same as agreeing: the article says nothing either way, and the place here stands unchecked.
    console.log(`${id.padEnd(20)} NOT CHECKED: "${summary.title}" gives no coordinates`);
    unchecked += 1;
    continue;
  }
  const [lon, lat] = place.at;
  const off = Math.max(Math.abs(given.lon - lon), Math.abs(given.lat - lat));
  const about = String(summary.description ?? '').slice(0, 60);
  console.log(
    `${id.padEnd(20)} ${off <= NEAR ? 'agrees' : 'DIFFERS'}  here ${String(lon)}, ${String(lat)}  there ${given.lon.toFixed(2)}, ${given.lat.toFixed(2)}  "${summary.title}": ${about}`,
  );
  if (off > NEAR) wrong += 1;
}
console.log(
  `${wrong === 0 ? 'Every place that could be checked agrees' : `${String(wrong)} to look at`}; ${String(unchecked)} could not be checked.`,
);
process.exit(wrong === 0 ? 0 : 1);
