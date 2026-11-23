# Continue here

**Phases 01 (foundation), 02 (the look) and 03 (the journey in and the first whole activity) are complete.
Phase 04 has not been started.**

- **Date:** 2026-11-23
- **Where it is:** Phases 01 and 02 are on `main`. Phase 03 is pull request
  [#4](https://github.com/JaredVogler2/Training_Academy/pull/4) from `claude/zealous-carson-qyiipa`.
- **Tested code:** the game as at commit `595e718`, which is the phase as first tested (`d6297eb`) and a second
  look at phones made after it. Later commits change documents only.
- **Deployed:** nowhere. No Vercel project is connected to this repository.

## The one thing that matters most now

**The owner's requirement for this phase is that the game work on Android and iOS devices on a Vercel deployment.
It has been written and tested for that as far as emulators go, and it has never run on a phone, nor been
deployed.** Until it has, that requirement is not shown to be met.

`docs/DEPLOYMENT.md` → _Trying it on a real phone and tablet_ has the two ways to get it onto a phone (your own
network in ten minutes; Vercel, which is the real thing) and sixteen things to try there, in order, each with
what it should do. Setting up the Vercel project is a decision about the owner's account and about what is public,
and was not taken for them.

How much a phone can differ from an emulated one was shown inside this phase. After it was first written up, a
second look asked what a phone does that the emulated devices do not, and found three faults they had passed: a
tap was ignored whenever another finger rested on the screen; the map was cramped and overlapping in the little
height an Android phone leaves when held sideways; a world's page lay under an iPhone's notch. They are fixed
(`docs/QUALITY_REPORT.md` → _A second look, with a phone in mind_). There will be others that only a phone shows.

## The state, in one paragraph

A static React and TypeScript app builds to `dist/` and runs under the same headers and routing that `vercel.json`
gives it. A visit opens on a front door: Glim waves and the child says who is playing by tapping a picture. Behind
it is the map — a lighthouse and six modelled islands in a moving sea, in real-time 3D where the device can and as
a picture rendered from the same models where it cannot. One island is open. Its page shows what is done there;
its activity is demonstrated by Glim, played in six steps, helped where help is asked for, and ended calmly, and
the way out is the way home at any point. Everything is saved on the device and comes back after a refresh.
Behind that are the things Phase 01 built: a headless learning engine, storage with fallbacks, a grown-ups' area, a
service worker, and tests at every level.

## Verified

- `npm run verify:release` passes locally on `595e718`: format, lint, typecheck, **774 unit tests**, production
  build, **158 build checks**, and **235 browser tests passed, 4 skipped by design** in headless Chromium on
  seven screen shapes, two of them a Pixel 7 upright and sideways.
- CI passed on `d2e644c` (the phase as first written) with no failed test and no retry, and on `66b4378` (the
  second look at phones): Chromium 235 passed, 4 skipped by design, on seven screens, two of them a Pixel 7; WebKit
  185 passed, one more at its second attempt, 31 skipped (what needs the 3D scene, the service worker or
  Chromium's touch handling, and the keyboard journeys on touch), on five screens, three of them an iPhone 13
  upright and sideways and an iPad. The run on the commit after that, and on these documents, is on the pull
  request. `docs/TEST_RESULTS.md` → _Continuous integration_.
- Every browser test also fails on any console error or warning, failed request, or request to another origin.
- The two journeys Phase 03 is for are browser tests (`e2e/journey.spec.ts`): a brand-new child from the front door
  to the end of an activity and home, acting only on what is drawn; and the path where it does not go right.
- The hub's layout is proved by arithmetic for twenty-five screens, seven of them phones held sideways as they
  really are: with a notch and a home bar taken off, or with a browser's bars taken off, down to a page 256
  pixels high.
- A notch, a flat screen and a second finger each have a browser test (`e2e/phones.spec.ts`), and each of those
  fails on the code as it was before the second look.
- 101 screenshots of the running build, 23 of them click maps, were captured and looked at: `docs/review/phase-03/`.

Details, including every command and count: `docs/TEST_RESULTS.md`. How it looks, rated honestly, and what the
review found: `docs/QUALITY_REPORT.md`.

## Not verified — read this before relying on anything

- **No real device.** Not an iPhone, not an iPad, not an Android phone, not a real Safari or Chrome on a phone. The
  named devices in the tests are the right screen, pixel ratio, touch and user agent on desktop engines.
- **Sound on a phone.** That the first tap is heard, that an iPhone on silent still plays, that sound comes back
  after another app: all reasoned and unit-tested, none heard.
- **A finger.** That a long press opens no menu and selects nothing, on either system. That a tap made beside a
  resting finger is answered on a real phone — it is shown in Chromium on a desk, and on iOS neither the fault
  nor the fix has been seen. That a slow press, which a phone takes for a long press, is answered: that could
  only be unit-tested.
- **The notch and the bars for real.** The margins and heights the tests use are the usual ones for those phones
  as I know them (47 or 59 pixels for a notch, 21 or 34 for a home bar, 24 and 56 for Android's and Chrome's
  bars). None was measured on a phone.
- **No real graphics hardware.** The 3D hub has only ever been drawn by a software renderer.
- **No deployment.** `vercel.json` was tested through a local server that applies the same rules.
- **No child and no teacher** has seen it.
- **One thing in CI is not explained**: twice, in WebKit, a test has waited 60 seconds for a page to load and
  passed at its second attempt (`docs/TEST_RESULTS.md` → _Continuous integration_). A test that runs out of time
  now reports what it was still waiting for, so the next time will say more. If it says the page itself never
  arrived, look at the preview server before the game.
- No Firefox. No screenshot-comparison tests.

## What the owner can do now

1. **Put it on a phone** (above). This is worth more than anything else on this list.
2. **Decide about Vercel**: connecting the repository, and whether previews stay behind Vercel's login. Say the
   word and it can be set up from a session like this one; it was not done unasked.
3. **Decide the guide's name.** "Glim" is provisional and unchecked; it is one string in `src/app/strings.ts`.
4. **Decide who records the voice** (Phase 04), or whether a synthesised voice is acceptable to start with.
5. **Review the pull request.**

## The next action: Phase 04

Start a new session with:

> Read prompt-series/README.md, prompt-series/00_MASTER_BRIEF.md and
> prompt-series/04_AUDIO_AND_PRE_READER_ONBOARDING.md, then docs/CONTINUE_HERE.md, docs/ART_DIRECTION.md,
> docs/CURRICULUM.md and docs/ARCHITECTURE.md. Implement phase 04. It must work on Android and iOS devices on a
> Vercel deployment.

First steps, in order:

1. `npm ci`, then `npm run verify:release`, to confirm the starting point is green.
2. If anything has been learned from a real phone since this was written, fix that first.
3. Read `docs/ARCHITECTURE.md` → _The shell_ (audio) and _The lesson frame_. The places a voice goes are already
   there: `script.ts` has the moments, "show me again" replays them, the pause sheet's tap wakes the audio, and
   the first tap of a visit is on the front door.
4. Read `docs/QUALITY_REPORT.md` → _Phase 03_ → _What is still wrong or weak_.

## Things the next session should know

**Rules the tools enforce**

- `src/engine` is pure: no clock, no random source, no DOM. ESLint fails otherwise. Time, ids and seeds come from
  `src/game/services.ts`.
- `three` and `@react-three/*` may be imported only under `src/render/hub3d`. `npm run verify:dist` also fails if 3D
  code, the studio or the character sheet becomes reachable from the first screen.
- Size budgets live in `scripts/verify-dist.mjs`. Raising one is a decision; say why in the commit.
- The Content-Security-Policy allows no inline script or style and no other origin. Styling is CSS Modules. A model or
  texture loader that fetches `blob:` URLs will need `connect-src` widened deliberately.
- Every browser test fails on any console warning. Allow a specific message in the one test that expects it; do not
  widen the lists in `e2e/fixtures.ts` without a reason written next to the entry.
- **Every asset is in `docs/assets.manifest.json`**, or the unit tests fail. No file the game ships may contain the
  address of another site.
- **Every island model must fit the room the layout gives it**, and nothing may float over an island, a name or the
  guide: `tests/render/` measures both.

**The hub's pictures must be re-rendered when a model changes**

```bash
npm run build
```

```bash
npm run art:sprites
```

```bash
npm run build
```

A unit test fails until this is done, whenever anything under `src/render/hub3d/` that affects how an island looks
(the kit, the paint, the water, the light, a model) or `src/render/extents.ts` has changed. Commit the new pictures.

**New in Phase 03**

- **A visit begins at the front door** unless the tab remembers that it has begun (`sessionStorage`, key in
  `src/app/journey.ts`). Browser tests start past it by default; `test.use({ frontDoor: true })` arrives at it.
- **The lesson frame draws what the engine shows and nothing more.** `view.challenge.answer` is in the view; the
  frame must not use it to mark anything unless `view.shownAnswer` says so or the step has been answered.
- **A script's timings and the counting animation's are the same numbers** (`HOP_*` in
  `src/game/lesson/script.ts`, and `numberGarden.module.css`). Change one, change the other.
- **A world that is not about amounts** leaves `countable` out of its module and gets scripts with no counting.
  Its own way of showing belongs in `script.ts` as new beats, tested there.
- **Sizes read back from a browser are floats.** Compare to half a pixel. And measure after things have arrived
  (`arrived()` in `e2e/fixtures.ts`): something popping in is smaller while it does, and a page fading in fails
  contrast checks.
- **A click by force proves nothing about what can be tapped.** Ask the browser what is at the point
  (`document.elementFromPoint`).
- **Child's controls are 56 pixels or more, grown-ups' 48.** `npm run screens -- phase-NN clickmaps` shows every
  control measured; look at the red and amber ones.
- **Nothing may be selectable or long-pressable in the game**; mark anything written for grown-ups
  `data-selectable`.
- **Read a notch's margins only through `--safe-top` and the rest** (`src/styles/tokens.css`), never `env()`
  directly: that is what lets a test give a page a notch (`giveNotch`), and a new screen should be added to the
  notch test in `e2e/phones.spec.ts`.
- **A device profile is kinder than the device.** A phone held sideways leaves a page 250 to 280 pixels of height,
  not the 342 to 360 of the profiles, and an iPhone gives a page its whole width with margins to keep clear of.
  Try a new screen at 800×264 and 640×256, and with a notch, before calling it done.
- **Whatever a child presses must be a link or a button** (or `role="button"`): that is what a tap made beside a
  resting finger is answered on (`src/app/touch.ts`). Something that listens for `click` on a plain element will
  not answer while another finger is on the screen.

**Traps already stepped in**

- **A phone hides overflow from the page.** Chromium's phone emulation (and real phones) widen the layout viewport
  to fit content that is too wide, so `scrollWidth === innerWidth` even when the page is broken. Use `screenFit()`
  from `e2e/fixtures.ts`.
- **Anything that never stops moving must move in steps, on the shared half-second beat.** Twenty small stepped
  animations, each on its own clock, kept a quarter of a processor core busy on the picture hub; on one beat, an
  eighth. Measure anything that moves with `npm run measure:idle` before leaving it on a screen people sit on.
- **A CSS transform animation replaces an SVG element's `transform` attribute.** Put the position on a parent group
  and animate the child.
- **`block()` in the modelling kit measures what it is asked to**, bevel included. (It did not at first, and every
  door was fatter than drawn.)
- **A landmark that stands back on its island is drawn higher than one in the middle.** Room is measured as drawn on
  screen; the model test will say so.
- **"Complete" is not "drawn".** A picture still being decoded is left out of a screenshot. Use
  `hubPicturesLoaded()` from `e2e/fixtures.ts` before looking at pixels.
- **Do not load optional code with `React.lazy`** where failure is ordinary: it throws during rendering, and React
  sometimes reports even a recovered error on the console. `HubStage.tsx` shows the alternative.
- **Software-rendered 3D is unusable** (two to eight frames a second), so on "automatic" a software renderer keeps
  the picture. The 3D browser tests therefore ask for a tier by name (`graphics: 'low'`), and anything that must
  catch a moment — a wave, a hop — is tested or captured with the hub as a picture.
- **Neither timings on this machine nor one CI run say how long the browser tests take in CI.** The same tests in
  the same order have taken 7.8, 9.2 and 11.7 minutes there. And there, a test that ends with the 3D scene still
  moving leaves the next test in the same browser five to thirty seconds late, which never happens here. Tests
  that have the scene drawn in software are allowed three minutes (`SOFTWARE_3D_TIMEOUT` in `e2e/hub.spec.ts`), and
  a new one needs the same. Judge a change to how the tests are scheduled by several CI runs, not one. And read the
  times in a green run now and then: a test near its limit says so there before it ever fails.
- **A slow machine opens the grown-ups gate late.** Tests hold the button until the area appears (`holdGateOpen`),
  never for a fixed time.
- **WebKit keeps a failed preload.** Do not re-enable `<link rel="modulepreload">` for on-demand parts
  (`build.modulePreload` in `vite.config.ts`).
- **The preview server reads `vercel.json` once**, at start. Restart it after changing headers or rewrites.
- **The browser tests start their own server on port 4173** and refuse to reuse one. Stop any preview first. Do not
  rebuild `dist/` while a test or a capture is running.
- **React Three Fiber 9 with three.js r183 or later** logs one deprecation notice; `src/render/hub3d/threeConsole.ts`
  filters exactly that text. Check it when either library is upgraded.
- **The cloud container this was built in has Chromium only and no GPU.** WebKit runs in CI. Frame rates measured
  there mean nothing.

**Open questions for the owner** (the first three bear on Phase 04)

- Has it been opened on a phone, and what happened?
- Who records the voice, or is a synthesised one acceptable to start with?
- Is "Glim" the guide's name?
- Is there a child for short play tests?
- Who reviews the phonics content (Phase 05)?
- Should the project carry a licence file? It has none.

## Where things are

| For                                    | Look in                                          |
| -------------------------------------- | ------------------------------------------------ |
| How it should look, move and sound     | `docs/ART_DIRECTION.md`                          |
| How it is built, and why               | `docs/ARCHITECTURE.md`                           |
| What was run and what was found        | `docs/TEST_RESULTS.md`                           |
| How it looks now, and what is weak     | `docs/QUALITY_REPORT.md`                         |
| Phase status and gaps carried forward  | `docs/PROGRESS.md`                               |
| Assets, licences, how assets are made  | `docs/ASSETS.md`, `docs/assets.manifest.json`    |
| Authoring content                      | `docs/CURRICULUM.md`                             |
| Deploying                              | `docs/DEPLOYMENT.md`                             |
| Screenshots of the running build       | `docs/review/phase-03/` (hub: `phase-02/`)       |
| Getting it onto a phone; what to check | `docs/DEPLOYMENT.md`                             |
| One island close up; the guide's sheet | `/studio/<island>`, `/studio/guide` in the build |
