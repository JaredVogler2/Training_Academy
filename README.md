# Training Academy

A browser game that teaches young children (about 3½ to 6) the foundations of reading, number, planning, memory and
making things, through short picture-led activities on a small archipelago. It is a static web app, built to be
hosted on Vercel. There is no account, no server, no advertising and no tracking: everything a child does stays on the device.

## Where it stands

**Seven places have something to do: 71 short activities, 823 challenges, a voice, and music.** Six islands, and
a music room in the lighthouse between them. (All 71 activities are live, and a room at Explorer Harbor
for making up a story; the choice of what to play next is on a pull request.) Phases 01 to
03 of 17 are done (the foundation, the look, the journey in); phase 04 is built (the voice, and help for a
child's first visit); phases 07 to 10, Robot Ridge, Memory Forest, Inventor Island and Explorer Harbor, are
built as far as their briefs go, but for the countries and flags the last of them leaves optional; phase 05,
Reading Cove, is built as far as a short sentence, and phase 06, Number Garden, as far as adding and taking
away within ten; phase 11, the Music Lab, is built; and so is phase 12, which chooses what to offer next
and says why. "Built" is not "done": nobody has heard any of it and no child has tried any of it.
[`docs/PROGRESS.md`](docs/PROGRESS.md) sets each brief against what exists. It is built from the plan in
[`prompt-series/`](prompt-series/README.md).

**Three things to know before relying on it.** No person has listened to any of it: the voice's 736 recordings
were made by a speech synthesiser and checked by a speech recogniser, and the Music Lab's notes are made by
arithmetic as they are played and have been checked by nothing with ears. No child and no teacher has seen any
of it. And not all of it is live: the owner's Vercel deployment serves `main`, which has had the six islands
since 2026-11-23, since 2026-11-25 the Music Lab with its room to play in, Number Garden's numerals and
Reading Cove's six later activities (rhyme to a sentence), and since 2026-11-26 the help for a first visit,
Robot Ridge's three later activities, Memory Forest's two, Inventor Island's shelter with the record a
grown-up keeps there and its portfolio, Explorer Harbor's globe and its room for making a story; all of
phase 12 is on an open pull request and reaches the site only when that is merged.
[`docs/CONTINUE_HERE.md`](docs/CONTINUE_HERE.md) says exactly what was and was not verified.

![The home screen: a lighthouse and six small islands in a turquoise sea, each with its name under it, and a small glowing guide in a rowing boat pointing at the one that is open](docs/review/phase-02/hub-3d-1366x768.jpg)

What works today:

- a visit opens on a front door: Glim waves, and the child says who is playing by tapping a picture;
- someone who has never played is shown how, once, before the islands: Glim shows three things and the child
  does each — tap the one that is asked for; tap a picture and it goes to its place, then the tick; tap Glim to
  have it shown again. The house passes it by at any moment. (Everything in the game is a tap; nothing is
  dragged);
- the home screen is the map: a lighthouse and six modelled islands, each of the seven a button. It is drawn in
  real-time 3D where the device can, and as a picture rendered from the same models where it cannot;
- Glim, the guide, who demonstrates, points, wonders, celebrates and waits patiently, says what is asked in a
  recorded voice, and says and shows it again when tapped;
- **Reading Cove**: what made that sound, play it back, which one rhymes, clap the word, the first sound of a
  word, fifteen letters and their sounds, a word said slowly, a printed word to read; then a word to build from
  its letters, sh, ch and th, words with those in them, and a sentence of five words to read. It needs sound,
  and says so;
- **Number Garden**: the same amount, how many at a glance, one for each up to ten, more, fewer, equal, with no
  numeral anywhere; then amounts in order, the pairs that make five and ten, the numerals from zero to ten, the
  numbers in order, and adding and taking away as little stories;
- **Robot Ridge**: one arrow one move, a row of steps, do it again, find the step that went wrong; then a longer
  way round rocks, planned and run a step at a time, and a bridge to wait for;
- **Memory Forest**: pairs, which one was there, the same order, and three ways to remember; then a choice of
  which way to look, asked about with a hint and with none, and three things kept for the next visit;
- **Inventor Island**: a guess that is tested, and a thing to mend: bridges, ramps, balancing, float or sink,
  a shelter from the wind; under each thing to try away from the screen, a switch a grown-up holds to say it
  was tried; and "My inventions", a page of the last thing the child mended at each workbench;
- **Explorer Harbor**: a story to put in order and hear told back, how it ends, what made it happen, what happens
  next, and a map to answer on: land and water, near and far; then a globe of the world with nothing written
  on it, which turns under a finger: the seven big lands to find by their shape and then by their name, and
  fifteen famous places to meet, each put on the globe where it is; and a room, "Make a story", where a child
  chooses who a story is about, where it happens, what they want, what goes wrong and how it comes right, by
  tapping pictures, and a book of three pages is made, turned and told. Nothing in it is right or wrong, and
  nothing is kept;
- **The Music Lab**, in the lighthouse: high and low, the same or different, a slow beat to tap along with, notes
  to play back, a tune to know again, a tune to make up; and a room with a whole octave of chime bars and a drum
  to play freely. Its sounds are made on the device: nothing is recorded;
- in every activity: Glim shows it first, some steps are done with help at hand and some alone; a wrong answer is
  taught, never marked wrong; help, pause and the way home are always there; and what was done unaided at the
  first try is recorded apart from everything else;
- **what to play next is suggested, and nothing is locked**: the big Play button and Glim go to something new,
  or back to something played before when a day or more has passed, by what the child has done alone and
  what each thing builds on. A grown-up can read every reason, and can say how long a sitting is; when that
  much has been played Glim goes to sleep and nothing more is suggested. Every activity can still be
  tapped. A run of right answers that could be luck is not called more than it is;
- when a child's taps land on nothing — the picture that is asked about, the words — the activity shows what
  can be pressed: every answer alike, never the right one. It is not a hint and nothing is recorded;
- a grown-up who sits down to help says so by holding a switch (on the pause screen, or on "how to play"), and
  what is answered while it is on is written down as helped, never as done alone;
- players (a nickname and a picture), saving on the device, and resuming where a child left off;
- a grown-ups area: players, where Play begins for each (a grown-up who has seen a child count five things can
  have Number Garden begin past that; nothing is closed and nothing is counted by it), how long a sitting is,
  what Play offers next in every world and why, what each has shown world by world, every recording to listen to and mark, save and load a copy, erase, device settings, diagnostics;
- sound and calm-motion switches, keyboard use, names and announcements for screen readers (not yet tried with
  one), and offline use after the first visit.

What does not exist yet: a check that a child can read a word never met before, a robot that does one thing
or another by what it finds, countries on the globe, and most of what phases 13 to 17 describe. It has not been tried on real graphics hardware or played by a
child, and beyond the owner opening the live site on an iPhone it has not run on a phone.

## Run it

You need Node.js 22 (`nvm use` reads `.nvmrc`).

```bash
npm ci
```

```bash
npm run dev
```

Then open <http://localhost:5173>. To run the production build the way it will be served (same headers, same routing,
service worker included):

```bash
npm run build
```

```bash
npm run preview
```

Then open <http://127.0.0.1:4173>.

## Check it

| Command                   | What it does                                                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`       | TypeScript, strict                                                                                                                              |
| `npm run lint`            | ESLint, including the rules that keep the layers apart                                                                                          |
| `npm run format:check`    | Prettier (`npm run format` to fix)                                                                                                              |
| `npm test`                | Unit tests (Vitest): engine, content, storage, shell, layout, models, assets, Vercel routing                                                    |
| `npm run build`           | Type-check, then the production build into `dist/`                                                                                              |
| `npm run verify:dist`     | Inspects `dist/`: size budgets, that 3D code is not in the first load, that no two built files wait for each other, CSP-safe HTML, the manifest |
| `npm run test:e2e`        | Browser tests (Playwright) against the production build, on seven screen shapes in Chromium (five more in WebKit, where it is installed)        |
| `npm run verify:release`  | All of the above, in order                                                                                                                      |
| `npm run screens`         | Captures the review screenshots in `docs/review/` from the running build                                                                        |
| `npm run rehearse:update` | Rehearses an update: a browser that has the build of the commit named (`-- origin/main`) meets this tree's build at the same address            |
| `npm run art:sprites`     | Renders the hub's pictures from the island models (after a build; then build again)                                                             |
| `npm run measure:hub`     | Draw calls, triangles and frame times of the 3D hub at each quality tier                                                                        |
| `npm run measure:idle`    | What each screen costs in CPU while nobody is touching it (Linux only)                                                                          |

The browser tests need Playwright's browsers once:

```bash
npx playwright install chromium webkit
```

With WebKit installed, `npm run test:e2e` also runs the desktop and phone projects in WebKit, and the layout tests
and journeys as an iPhone and an iPad. To run the smoke tests against a deployment instead of a local build:

```bash
BASE_URL=https://your-preview.vercel.app npm run test:e2e
```

Continuous integration (`.github/workflows/ci.yml`) runs the checks and the browser tests in Chromium and WebKit on
every pull request.

Two pages exist for looking at the art and are linked from nowhere: `/studio/<island>` (for example
`/studio/number-garden`) shows one island close up, and `/studio/guide` is the guide's character sheet.

## How it is put together

```
src/engine    the learning engine: pure TypeScript, no browser, no clock, no randomness of its own; what
              counts as done alone, when a thing comes back, and what to offer next
src/content   the curriculum: one written-out pack for each world, the rules that refuse a wrong one, and
              the table of what builds on what
src/storage   saving on the device: IndexedDB, then localStorage, then memory; migrations; export and import
src/game      the seven worlds, the lesson runner, the boards activities are played on, the world pages
src/art       the picture kit and the drawn letters
src/render    the map: where everything goes, the hub as a picture, and the 3D harbour (three.js, loaded when used)
src/assets    the hub's pictures, rendered from the island models; the voice's recordings
src/voice     what the voice says, and what was heard when each recording was checked
src/ui        buttons, icons, drawings, and the guide
src/audio     sound that waits for the first touch and respects mute; the voice, one line at a time
src/parent    the grown-ups area
src/app       the shell: routes, settings, error handling, diagnostics
tests, e2e    unit tests and browser tests
scripts       build plugins and tools; the content generators; the tool that makes the voice
```

The reasoning behind each choice is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Privacy, by construction

- A player is a nickname and a picture. No real name, birth date, e-mail, photo or voice is asked for or stored.
- Nothing is sent anywhere. The site's Content-Security-Policy allows connections to its own origin only, and the
  browser tests fail if any page makes a request to another site.
- No analytics, no advertising, no third-party scripts or fonts. Fonts are bundled.
- A grown-up can save a copy of a player's record as a readable file, load it on another device, or erase everything.
- The grown-ups area opens with a two-second press. That keeps small fingers out by accident; it is not a lock.

This describes the design. It is not a legal review; that is part of Phase 14.

## Documents

| Document                                             | What it holds                                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [`docs/CONTINUE_HERE.md`](docs/CONTINUE_HERE.md)     | The exact tested state, what is unverified, and the next action                            |
| [`docs/PROGRESS.md`](docs/PROGRESS.md)               | Phase-by-phase status                                                                      |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)       | Structure and decisions                                                                    |
| [`docs/CURRICULUM.md`](docs/CURRICULUM.md)           | How content is authored, what is authored, how evidence is reported                        |
| [`docs/TEST_RESULTS.md`](docs/TEST_RESULTS.md)       | Commands run and their results                                                             |
| [`docs/QUALITY_REPORT.md`](docs/QUALITY_REPORT.md)   | An honest assessment of how it looks and performs, with known shortcomings                 |
| [`docs/ART_DIRECTION.md`](docs/ART_DIRECTION.md)     | The visual standard: view, shapes, colour, light, motion, the guide, sound                 |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)           | Connecting Vercel, what `vercel.json` does, what a first preview must prove                |
| [`docs/ASSETS.md`](docs/ASSETS.md)                   | Every asset, its licence, and how each kind of asset is made                               |
| [`docs/review/`](docs/review/)                       | Screenshots of the running build, phase by phase; the worlds in `worlds/` and `music-lab/` |
| [`prompt-series/README.md`](prompt-series/README.md) | The seventeen-phase build plan                                                             |

## Deployment

The owner has connected the repository to Vercel: production is `main`, at
<https://training-academy-dun.vercel.app>, and merging a pull request is a release. What is live, what was tested
against it, and what to check on a phone are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Credits

Fredoka and Nunito are used under the SIL Open Font License. The outlines of the continents on Explorer
Harbor's globe are made from Natural Earth's map of the world, which is in the public domain. Everything else —
drawings, the islands, the guide, sounds, content — was made for this project. The voice's recordings were made for this project with a speech
synthesiser and a voice model from elsewhere, neither of which is shipped. Details, and what has not been checked
about that, are in [`docs/ASSETS.md`](docs/ASSETS.md).

The working practices (a written visual standard, quality tiers, screenshot review, saying plainly what is unverified) follow the example of
[Epoch60](https://github.com/JaredVogler2/Epoch60)'s documentation. No code or artwork was taken from it.
