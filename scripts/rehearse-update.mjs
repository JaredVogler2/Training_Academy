// Rehearses an update: a browser that already has one build of the game meets the next one at the same address.
//
//   npm run rehearse:update -- <git ref of the build that is live>        for example: origin/main
//
// This is what a phone goes through when a new version is deployed, and no other test does it: every browser test
// starts from an empty browser and one build. Here there are two real builds and one browser that keeps what it
// has. The build at <ref> is made in a scratch checkout and served; a child plays on it, leaves one activity
// half-way, and leaves two more tabs open. Then that server is stopped and this tree's build is served at the
// same address, as a deployment replaces one build with the next. What is checked after that:
//
//   - a tab left in the middle of an activity plays on to its end, on the code it already has;
//   - a tab left on the map that asks for a part it never fetched says so calmly, and loading the page again
//     brings the new build;
//   - the site opened again by its address is the new build at once;
//   - a world's page opened by its address still shows what was finished, and Play goes on from there;
//   - the activity left half-way is taken up by the new build at the step it was left at;
//   - nothing that was stored has gone;
//   - what the old build wrote down is brought up to date and nothing else of it is changed: a game of pairs
//     found in far more turns than remembering needs, which a build from before data version 2 stored as done
//     alone, carries the mark the new build gives such a game, every other answer is to the letter what it was,
//     and the grown-ups' page, which said "independent" of it, no longer does. Where the old build's data is at
//     the new build's version already, it is checked that the old build marked those games itself and that
//     nothing stored is changed at all, the version included;
//   - once every old tab is closed, the new service worker takes over and clears the old build out;
//   - after that, what has been opened opens with no connection.
//
// It builds this tree (`dist/` is replaced), so do not run it while the browser tests are running. It runs in
// headless Chromium, the one engine in which a service worker and the network can be driven together: it shows
// that the update is sound, not how Safari on a phone schedules it.
//
// The three activities it plays are ones answered by choosing, because it plays without knowing the answers: it
// taps whatever can be tapped until the way on appears. If Number Garden's activities change, change ACTIVITIES.
// It also plays "Find the pairs" to its end, turning the same two cards over seven times on every board done alone
// before finding anything: that is the one kind of answer whose meaning the stored data's second version changed.

import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ref = process.argv[2];
if (!ref) {
  console.error('Say which build is live:  npm run rehearse:update -- origin/main');
  process.exit(2);
}

const PORT = 4183;
const BASE = `http://127.0.0.1:${String(PORT)}`;
const WORLD = 'number-garden';
const ACTIVITIES = {
  /** Finished on the old build. */
  finished: 'ng-same-amount-01',
  /** Left half-way on the old build, and gone home from. */
  left: 'ng-fewer-01',
  /** Half-way, in a tab that stays open across the update. */
  open: 'ng-more-01',
};
const play = (id) => `/world/${WORLD}/play/${id}`;
/** The one activity whose answers the stored data's second version gives a mark to. */
const PAIRS = {
  world: 'memory-forest',
  activity: 'mf-pairs-01',
  skill: 'memory.recognition.find-pairs',
  pack: 'src/content/packs/memory-forest.v2.json',
};
const FACE_DOWN = 'a card, face down';

// What Chromium remarks on when a service worker controls a page whose first files were preloaded: the second
// request is answered from the worker's own cache and the page is unaffected (see e2e/offline.spec.ts).
const REMARKS = [
  /is found, but is not used because it is a cross-world service worker resource mismatch/,
  /was preloaded using link preload but not used within a few seconds/,
];
const OFFLINE =
  /net::ERR_INTERNET_DISCONNECTED|net::ERR_FAILED|Failed to load resource|request failed/;

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const run = (cwd, command, ...args) => execFileSync(command, args, { cwd, stdio: 'inherit' });

/** The version a build's service worker gives itself, and the script its page starts with. */
function buildOf(tree) {
  const worker = readFileSync(join(tree, 'dist/sw.js'), 'utf8');
  const version = /"version":"([^"]+)"/.exec(worker)?.[1];
  const page = readFileSync(join(tree, 'dist/index.html'), 'utf8');
  const script = /<script type="module"[^>]*src="([^"]+)"/.exec(page)?.[1];
  if (!version || !script) throw new Error(`${tree}/dist is not a build of this game.`);
  return { version, script };
}

async function answers() {
  try {
    return (await fetch(`${BASE}/`)).ok;
  } catch {
    return false;
  }
}

/** Serve a tree's build as the browser tests do: `vite preview`, with the headers and routing of vercel.json. */
async function serve(tree) {
  const server = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { cwd: tree, stdio: 'ignore', detached: true },
  );
  for (let tries = 0; tries < 150; tries++) {
    if (await answers()) return server;
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`No server came up from ${tree}.`);
}

async function stop(server) {
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    // Already gone.
  }
  for (let tries = 0; tries < 100; tries++) {
    if (!(await answers())) return;
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error('The server did not stop.');
}

/** Everything the game has stored in this browser, record by record. */
function stored(page) {
  return page.evaluate(async () => {
    const out = {};
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index) ?? '';
      out[`localStorage/${key}`] = localStorage.getItem(key) ?? '';
    }
    const db = await new Promise((done, fail) => {
      const request = indexedDB.open('training-academy');
      request.onsuccess = () => done(request.result);
      request.onerror = () => fail(request.error ?? new Error('The database did not open.'));
    });
    for (const name of [...db.objectStoreNames]) {
      const store = db.transaction(name, 'readonly').objectStore(name);
      const all = (request) =>
        new Promise((done) => {
          request.onsuccess = () => done(request.result);
        });
      const [keys, values] = await Promise.all([all(store.getAllKeys()), all(store.getAll())]);
      keys.forEach((key, index) => {
        out[`indexedDB/${name}/${JSON.stringify(key)}`] = JSON.stringify(values[index]);
      });
    }
    db.close();
    return out;
  });
}

const lesson = (page) => page.getByTestId('lesson');
const finished = (page) => page.getByTestId('lesson-finished');
const myTurn = (page) => page.getByRole('button', { name: 'My turn' });
const next = (page) => page.getByRole('button', { name: 'Next' });
const card = (page, id) => page.locator(`[data-lesson="${id}"]`);
const playLink = (page) => page.getByRole('link', { name: 'Play', exact: true });
const text = async (locator) => (await locator.innerText()).replace(/\s+/g, ' ').trim();

/** Which step of the activity is showing, from the progress dots' label: "Step 2 of 6" → 2. */
async function stepNumber(page) {
  await lesson(page).locator('[data-choice]').first().waitFor();
  const label = await lesson(page).getByRole('list').first().getAttribute('aria-label');
  return Number(/Step (\d+) of/.exec(label ?? '')?.[1] ?? Number.NaN);
}

/**
 * Play without knowing the answers, as a child who is guessing might: tap whatever can be tapped until the way on
 * appears (`until: 'next'`, which leaves "Next" unpressed) or the activity ends.
 */
async function muddle(page, until) {
  for (let guard = 0; guard < 400; guard++) {
    if (await finished(page).isVisible()) return;
    if (await myTurn(page).isVisible()) await myTurn(page).tap();
    else if (await next(page).isVisible()) {
      if (until === 'next') return;
      await next(page).tap();
    } else {
      const open = lesson(page).locator(
        '[data-choice]:not([data-state="away"]):not([aria-disabled="true"])',
      );
      if ((await open.count()) > 0) {
        await open
          .first()
          .tap({ timeout: 2000 })
          .catch(() => undefined);
      }
    }
    await page.waitForTimeout(300);
  }
  throw new Error('An activity did not get to where it was going.');
}

/** Start an activity and stop at its third step, with one question answered. */
async function leaveHalfWay(page, id) {
  await page.goto(BASE + play(id));
  await myTurn(page).waitFor();
  await muddle(page, 'next');
  await next(page).tap();
  return stepNumber(page);
}

/**
 * One board of pairs, found. Every card is turned once, two at a time, to learn where each is, and then the pairs
 * are turned: as few turns as a board allows. With `wasted`, the first two cards that differ are turned over that
 * many times before anything else, as someone does who is not trying to remember: the board is then found in
 * more turns than it allows, whichever cards they were.
 */
async function findPairs(page, wasted) {
  const cards = lesson(page).locator('[data-place]');
  await cards.first().waitFor();
  const count = await cards.count();
  const name = async (place) => (await cards.nth(place).getAttribute('aria-label')) ?? '';
  const found = async (place) => (await cards.nth(place).getAttribute('data-found')) === 'true';
  const faceUp = async (place) => {
    for (let tries = 0; tries < 50 && (await name(place)) === FACE_DOWN; tries++) {
      await page.waitForTimeout(100);
    }
    return name(place);
  };
  const bothDown = async (one, two) => {
    for (let tries = 0; tries < 80; tries++) {
      if ((await name(one)) === FACE_DOWN && (await name(two)) === FACE_DOWN) return;
      await page.waitForTimeout(100);
    }
    throw new Error('Two cards that differ did not turn back.');
  };
  for (let place = 0; wasted > 0 && place + 1 < count; place += 2) {
    await cards.nth(place).tap();
    const first = await faceUp(place);
    await cards.nth(place + 1).tap();
    const second = await faceUp(place + 1);
    // A pair by luck stays found: the next two are tried.
    if (first === second) continue;
    for (let turn = 1; turn < wasted; turn++) {
      await bothDown(place, place + 1);
      await cards.nth(place).tap();
      await faceUp(place);
      await cards.nth(place + 1).tap();
    }
    await bothDown(place, place + 1);
    break;
  }
  const seen = new Map();
  for (let place = 0; place < count; place += 2) {
    for (const each of [place, place + 1]) {
      if (each >= count || (await found(each))) continue;
      await cards.nth(each).tap();
      const label = await faceUp(each);
      seen.set(label, [...(seen.get(label) ?? []), each]);
    }
    await page.waitForTimeout(1300);
  }
  for (const [first, second] of seen.values()) {
    if (first === undefined || second === undefined || (await found(first))) continue;
    await cards.nth(first).tap();
    await cards.nth(second).tap();
    await page.waitForTimeout(300);
  }
}

/** "Find the pairs", played to its end: well with the guide, and without remembering on every board done alone. */
async function playPairsWithoutRemembering(page) {
  await page.goto(`${BASE}/world/${PAIRS.world}/play/${PAIRS.activity}`);
  await myTurn(page).waitFor();
  for (let guard = 0; guard < 80; guard++) {
    if (await finished(page).isVisible()) return;
    if (await myTurn(page).isVisible()) await myTurn(page).tap();
    else if (await next(page).isVisible()) await next(page).tap();
    else if (await lesson(page).locator('[data-place]').first().isVisible()) {
      const alone = (await lesson(page).getAttribute('data-stage')) === 'independent';
      await findPairs(page, alone ? 7 : 0);
      await next(page).or(finished(page)).first().waitFor({ timeout: 20_000 });
    }
    await page.waitForTimeout(300);
  }
  throw new Error('The pairs were not all found.');
}

/** How many turns each board of pairs allows, from the lesson as this tree has it. */
function pairsPar() {
  const pack = JSON.parse(readFileSync(join(root, PAIRS.pack), 'utf8'));
  const found = pack.lessons.find((each) => each.id === PAIRS.activity);
  if (!found) throw new Error(`${PAIRS.pack} has no ${PAIRS.activity}.`);
  return new Map(
    found.challenges
      .filter((challenge) => challenge.kind === 'make' && challenge.task.type === 'pairs')
      .map((challenge) => [challenge.id, challenge.task.par]),
  );
}

/** The answers in what was read from a browser's store, by where each is kept. */
function answersIn(everything) {
  return new Map(
    Object.entries(everything)
      .filter(([key]) => key.startsWith('indexedDB/attempts/'))
      .map(([key, value]) => [key, JSON.parse(value)]),
  );
}

/** A record written out so that two of them can be compared to the letter, whatever order their parts are in. */
const written = (record) =>
  JSON.stringify(Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b))));

/** Hold the grown-ups' button down until their area opens, and say what it says of one skill. */
async function saidOfSkill(page, skill) {
  await page.goto(`${BASE}/grown-ups`);
  const hold = page.getByRole('button', { name: 'Press and hold' });
  await hold.waitFor({ timeout: 30_000 });
  const box = await hold.boundingBox();
  if (!box) throw new Error('The hold button is not on the screen.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.getByRole('heading', { name: 'Players' }).waitFor({ timeout: 30_000 });
  await page.mouse.up();
  const row = page.locator(`[data-testid="skill"][data-skill="${skill}"]`);
  await row.waitFor({ timeout: 30_000 });
  return { status: (await row.getAttribute('data-status')) ?? '', words: await text(row) };
}

/** The data version a snapshot of what is stored (`stored()`) is at. Every build has written it. */
const versionOf = (everything) =>
  JSON.parse(everything['indexedDB/meta/"schema"'] ?? '{}').dataVersion;
/** The data version this tree's build writes. */
const DATA_VERSION_HERE = Number(
  /export const DATA_VERSION = (\d+);/.exec(
    readFileSync(join(root, 'src/storage/migrations.ts'), 'utf8'),
  )?.[1],
);
/** The data version from which a game of pairs found in too many turns is stored with its mark. */
const PAIRS_MARKED_FROM = 2;

const results = [];
function check(what, ok, detail = '') {
  results.push({ what, ok });
  console.log(`${ok ? '   ok   ' : ' FAILED '} ${what}${detail ? `  (${detail})` : ''}`);
}

const scratch = mkdtempSync(join(tmpdir(), 'ta-rehearse-'));
const before = join(scratch, 'before');
let server = null;
let browser = null;
let failure = null;

try {
  const commit = git('rev-parse', '--verify', `${ref}^{commit}`);
  console.log(
    `The build that is live: ${ref} (${commit.slice(0, 7)}). The build to come: this tree.\n`,
  );

  git('worktree', 'add', '--quiet', '--detach', before, commit);
  // The same dependencies, where the two builds ask for the same ones; otherwise its own.
  let sameDependencies = true;
  try {
    git('diff', '--quiet', commit, '--', 'package-lock.json');
  } catch {
    sameDependencies = false;
  }
  if (sameDependencies) symlinkSync(join(root, 'node_modules'), join(before, 'node_modules'));
  else run(before, 'npm', 'ci');
  run(before, 'npx', 'vite', 'build', '--logLevel', 'warn');
  run(root, 'npx', 'vite', 'build', '--logLevel', 'warn');

  const was = buildOf(before);
  const now = buildOf(root);
  if (was.version === now.version) {
    console.log('The two are the same build: there is no update to rehearse.');
  } else {
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    });
    await context.addInitScript(() => {
      const key = 'training-academy.settings.v1';
      if (window.localStorage.getItem(key) === null) {
        window.localStorage.setItem(
          key,
          JSON.stringify({ version: 1, sound: true, motion: 'system', graphics: 'pictures' }),
        );
      }
      // Past the front door: who is playing has been said in this tab.
      window.sessionStorage.setItem('training-academy.begun', '1');
    });

    // What each tab's browser complains of. A tab still running the old build may complain after the update (a
    // file it wants is gone); a page of the new build may not.
    const complaints = [];
    const onNewBuild = new Set();
    let offline = false;
    const tab = async (name) => {
      const page = await context.newPage();
      const note = (line) => {
        if (REMARKS.some((remark) => remark.test(line))) return;
        if (offline && OFFLINE.test(line)) return;
        complaints.push({ name, line, fresh: onNewBuild.has(page) });
      };
      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          note(`console ${message.type()}: ${message.text().split('\n')[0]}`);
        }
      });
      page.on('pageerror', (error) => note(`uncaught: ${error.message}`));
      page.on('response', (response) => {
        if (response.status() >= 400) {
          note(`${String(response.status())} ${new URL(response.url()).pathname}`);
        }
      });
      return page;
    };
    const inControl = (page) =>
      page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
        timeout: 30_000,
      });
    const shells = async (page) =>
      (await page.evaluate(() => caches.keys())).filter((name) => name.startsWith('ta-shell-'));

    // ------------------------------------------------------------------ on the build that is live
    console.log(`On the build that is live (${was.version}):`);
    server = await serve(before);
    const first = await tab('the first tab');
    await first.goto(`${BASE}/`);
    await inControl(first);
    check(
      'its service worker is in control',
      (await shells(first)).join() === `ta-shell-${was.version}`,
    );

    await first.goto(BASE + play(ACTIVITIES.finished));
    await myTurn(first).waitFor();
    await muddle(first, 'end');
    check(`an activity is finished (${ACTIVITIES.finished})`, await finished(first).isVisible());

    const leftAt = await leaveHalfWay(first, ACTIVITIES.left);
    check(`another is left at step ${String(leftAt)} (${ACTIVITIES.left})`, leftAt === 3);

    await playPairsWithoutRemembering(first);
    const par = pairsPar();
    const tooMany = (answer) =>
      answer.lessonId === PAIRS.activity &&
      answer.outcome === 'correct' &&
      Number(answer.response) > (par.get(answer.challengeId) ?? Number.POSITIVE_INFINITY);
    const pairsBefore = [...answersIn(await stored(first)).values()].filter(
      (answer) => answer.stage === 'independent' && tooMany(answer),
    );
    check(
      `"Find the pairs" is played to its end without remembering: ${String(pairsBefore.length)} boards found alone, each in more turns than it allows`,
      (await finished(first).isVisible()) && pairsBefore.length >= 3,
      pairsBefore.map((answer) => `${String(answer.response)} turns`).join(', '),
    );
    // What a build from before data version 2 did with them is what the update has to mend; a build from since
    // marks them itself. (Rehearsing #20, from a build that was at version 2 already, this check asked for the
    // first and failed on the second, which is right.)
    const liveVersion = versionOf(await stored(first));
    const unmarkedLive = liveVersion < PAIRS_MARKED_FROM;
    check(
      unmarkedLive
        ? 'the build that is live stores each of them as right, with no mark on it'
        : `the build that is live marks each of them itself (what it stores is at data version ${String(liveVersion)})`,
      unmarkedLive
        ? pairsBefore.every((answer) => !('clean' in answer))
        : pairsBefore.every((answer) => answer.clean === false),
    );
    const saidBefore = await saidOfSkill(first, PAIRS.skill);
    console.log(
      `          its grown-ups’ page says of finding pairs: ${saidBefore.status} (“${saidBefore.words.slice(0, 110)}…”)`,
    );

    const playing = await tab('a tab left in an activity');
    const playingAt = await leaveHalfWay(playing, ACTIVITIES.open);
    check(
      `a tab is left in a third at step ${String(playingAt)} (${ACTIVITIES.open})`,
      playingAt === 3,
    );

    const onTheMap = await tab('a tab left on the map');
    await onTheMap.goto(`${BASE}/`);
    await onTheMap.getByRole('navigation', { name: 'Worlds' }).getByRole('link').first().waitFor();

    const kept = await stored(first);
    check(
      'what was played is stored',
      Object.keys(kept).some((key) => key.includes('/sessions/')),
    );

    // ------------------------------------------------------------------ the update
    await stop(server);
    server = await serve(root);
    console.log(`\nThe build to come (${now.version}) is now at the same address:`);

    await muddle(playing, 'end');
    check(
      'the tab left in an activity plays on to its end without being loaded again',
      await finished(playing).isVisible(),
    );

    await onTheMap.getByRole('link', { name: 'Grown-ups' }).tap();
    const trouble = onTheMap.getByRole('alert');
    const gate = onTheMap.getByRole('button', { name: 'Press and hold' });
    await trouble.or(gate).first().waitFor({ timeout: 30_000 });
    if (await trouble.isVisible()) {
      check(
        'the tab left on the map, asked for a part it never fetched, says so and offers to load again',
        await onTheMap.getByRole('button', { name: 'Load the page again' }).isVisible(),
        await text(trouble.getByRole('heading')),
      );
      onNewBuild.add(onTheMap);
      await onTheMap.getByRole('button', { name: 'Load the page again' }).tap();
    } else {
      check(
        'the tab left on the map opens a part it never fetched',
        true,
        'the part has not changed',
      );
    }
    await gate.waitFor({ timeout: 30_000 });
    check('after that, the grown-ups’ area opens', true);

    onNewBuild.add(first);
    await first.goto(`${BASE}/`);
    const running = await first.locator('script[type="module"][src]').first().getAttribute('src');
    check(
      'the site opened again by its address is the new build at once',
      running === now.script,
      String(running),
    );

    await first.goto(`${BASE}/world/${WORLD}`);
    await card(first, ACTIVITIES.finished).waitFor();
    const marked = async (id) => {
      try {
        await first.waitForFunction(
          (selector) => document.querySelector(selector)?.getAttribute('data-done') === 'true',
          `[data-lesson="${id}"]`,
          { timeout: 5000 },
        );
        return true;
      } catch {
        return false;
      }
    };
    check(
      'a world’s page opened by its address shows what was finished',
      (await marked(ACTIVITIES.finished)) && (await marked(ACTIVITIES.open)),
    );
    const goesTo = await playLink(first).getAttribute('href');
    check(
      'and Play goes on from there, not back to the start',
      goesTo !== null && goesTo !== play(ACTIVITIES.finished),
      String(goesTo),
    );

    await first.goto(BASE + play(ACTIVITIES.left));
    const resumedAt = await stepNumber(first);
    check(
      'the activity left half-way is taken up where it was left',
      resumedAt === leftAt,
      `step ${String(resumedAt)}`,
    );
    await muddle(first, 'end');
    check('and can be finished', await finished(first).isVisible());

    const after = await stored(first);
    const gone = Object.keys(kept).filter((key) => !(key in after));
    check('nothing that was stored has gone', gone.length === 0, gone.join(', '));

    const versionBefore = versionOf(kept);
    const versionAfter = versionOf(after);
    check(
      versionBefore < DATA_VERSION_HERE
        ? 'what is stored has been brought up to date'
        : "what is stored keeps its data version, which is the new build's already",
      versionAfter === DATA_VERSION_HERE && versionAfter >= versionBefore,
      `data version ${String(versionBefore)} to ${String(versionAfter)}`,
    );
    const answersBefore = answersIn(kept);
    const answersAfter = answersIn(after);
    const nowMarked = [...answersBefore].filter(
      ([key, answer]) => tooMany(answer) && answersAfter.get(key)?.clean === false,
    );
    const shouldBe = [...answersBefore].filter(([, answer]) => tooMany(answer));
    check(
      `every game of pairs that took too many turns carries the mark (${String(nowMarked.length)} of ${String(shouldBe.length)})`,
      shouldBe.length >= pairsBefore.length && nowMarked.length === shouldBe.length,
    );
    const changed = [...answersBefore].filter(([key, answer]) => {
      const now = answersAfter.get(key);
      if (!now) return true;
      return written(now) !== written(tooMany(answer) ? { ...answer, clean: false } : answer);
    });
    check(
      `and nothing else of any answer has changed (${String(answersBefore.size)} answers, to the letter)`,
      changed.length === 0,
      changed.map(([key]) => key).join(', '),
    );
    const saidAfter = await saidOfSkill(first, PAIRS.skill);
    check(
      'the grown-ups’ page does not say of finding pairs what the turns did not show',
      !/independent/.test(saidAfter.status) && /No independent success yet/.test(saidAfter.words),
      `${saidBefore.status} before; ${saidAfter.status} now`,
    );

    check(
      'while an old tab is open, both builds are kept',
      (await shells(first)).length === 2,
      (await shells(first)).join(', '),
    );
    await playing.close();
    await onTheMap.close();
    await first.close();
    // With no tab left, the service worker that was waiting takes over. It is given the moment that takes
    // before another tab is opened, and is asked for itself whether it has: a tab opened in the same instant
    // as the last old one closes can be claimed by the old worker, which then has a page again and stays for as
    // long as that page does. (The rehearsal did exactly that once, by being quick, and reported the old build
    // as never cleared. Nobody closes a tab and opens the next within a few thousandths of a second.)
    const shellsSeenByAWorker = async () => {
      for (const worker of context.serviceWorkers()) {
        try {
          const names = await worker.evaluate(() => caches.keys());
          return names.filter((name) => name.startsWith('ta-shell-'));
        } catch {
          // That worker has been stopped or replaced: another may answer.
        }
      }
      return null;
    };
    for (let tries = 0; tries < 40; tries++) {
      const seen = await shellsSeenByAWorker();
      if (seen !== null && seen.join() === `ta-shell-${now.version}`) break;
      await new Promise((done) => setTimeout(done, 250));
    }
    const fresh = await tab('a tab opened afresh');
    onNewBuild.add(fresh);
    await fresh.goto(`${BASE}/`);
    await inControl(fresh);
    let left = [];
    for (let tries = 0; tries < 100; tries++) {
      left = await shells(fresh);
      if (left.join() === `ta-shell-${now.version}`) break;
      await fresh.waitForTimeout(300);
    }
    check(
      'with every old tab closed, the new service worker has taken over and cleared the old build out',
      left.join() === `ta-shell-${now.version}`,
      left.join(', '),
    );

    await fresh.goto(`${BASE}/world/${WORLD}`);
    await playLink(fresh).tap();
    await lesson(fresh).waitFor();
    await fresh.waitForTimeout(3000);
    offline = true;
    await context.setOffline(true);
    await fresh.reload();
    await lesson(fresh).waitFor();
    await fresh.goto(`${BASE}/`);
    await fresh.getByRole('navigation', { name: 'Worlds' }).getByRole('link').first().waitFor();
    await fresh.goto(`${BASE}/world/${WORLD}`);
    await playLink(fresh).waitFor();
    check('with no connection, the map, the world and the activity that was opened all open', true);
    await context.setOffline(false);
    offline = false;

    const fromNew = [...new Set(complaints.filter((each) => each.fresh).map((each) => each.line))];
    check('no page of the new build complained of anything', fromNew.length === 0);
    for (const line of fromNew) console.log(`          ${line}`);
    const fromOld = complaints.filter((each) => !each.fresh);
    if (fromOld.length > 0) {
      console.log('\nWhat tabs still on the old build complained of (a file they wanted is gone):');
      for (const line of new Set(fromOld.map((each) => `${each.name}: ${each.line}`))) {
        console.log(`          ${line}`);
      }
    }
  }
} catch (error) {
  failure = error;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (server) await stop(server).catch(() => undefined);
  try {
    git('worktree', 'remove', '--force', before);
  } catch {
    // It was never made.
  }
  rmSync(scratch, { recursive: true, force: true });
}

const failed = results.filter((each) => !each.ok);
if (failure)
  console.error(
    `\nThe rehearsal stopped: ${failure instanceof Error ? failure.message : String(failure)}`,
  );
if (failure || failed.length > 0) {
  console.error(`\n${String(failed.length)} of ${String(results.length)} checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${String(results.length)} checks passed.`);
