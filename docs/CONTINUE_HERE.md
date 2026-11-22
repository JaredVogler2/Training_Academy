# Continue here

**Phases 01 (foundation) and 02 (the look) are complete. Phase 03 has not been started.**

- **Date:** 2026-11-22
- **Branch:** `claude/zealous-carson-qyiipa` — pull request [#2](https://github.com/JaredVogler2/Training_Academy/pull/2), open, not merged
- **Tested code:** commit `e69eb06` (commits after it change documents only)
- **Deployed:** nowhere. No Vercel project is connected to this repository.

## The state, in one paragraph

A static React and TypeScript app builds to `dist/` and runs under the same headers and routing that `vercel.json`
gives it. Its home screen is a map: a lighthouse and six modelled islands in a moving sea, each island a link, with
Glim the guide pointing at the one island that has something to play. The map is drawn in real-time 3D where the
device can and as a picture rendered from the same models where it cannot. Behind it are the things Phase 01 built:
a headless learning engine, one three-minute activity in Number Garden, saving on the device with fallbacks, a
grown-ups area, a service worker, and tests at every level. The home screen now looks like the game the brief
describes. The activity screen does not yet; that is where Phase 03 starts.

## Verified

On commit `e69eb06`:

- `npm run verify:release` passes locally: format, lint, typecheck, **594 unit tests**, production build,
  **156 build checks**, and **173 browser tests passed, 4 skipped by design** in headless Chromium on five
  screen shapes (1366×768, 390×844, 844×390, 768×1024, 360×740).
- CI on the pull request (the same checks, the browser tests in Chromium, and in WebKit): see the pull request's
  checks and `docs/TEST_RESULTS.md` → _Continuous integration_.
- Every browser test also fails on any console error or warning, failed request, or request to another origin.
- The layout is proved by arithmetic for ten screen shapes and checked in a browser for five: tap areas of at least
  96 pixels that never overlap, names that are never cut short, nothing floating over an island.
- 48 screenshots of the running build were captured and looked at, in two rated rounds: `docs/review/phase-02/`.

Details, including every command and count: `docs/TEST_RESULTS.md`. How it looks, rated honestly:
`docs/QUALITY_REPORT.md`.

## Not verified — read this before relying on anything

- **No real graphics hardware.** The 3D hub has only ever been drawn by a software renderer, which manages two to
  eight frames a second. Its frame rate, memory use and tier choices on real devices are unknown. The scene is light
  by a graphics card's standards (about 30 draw calls, 105,000 triangles, three textures), but that is an argument,
  not a measurement.
- **No real device.** Not an iPhone, not an iPad, not an Android phone, not a real Safari. WebKit was exercised only
  as Playwright's Linux build in CI, where the 3D hub and the service worker are not tested at all.
- **No child and no teacher** has seen it. Whether a four-year-old sees that an island is a button, reads a moon as
  "asleep", or follows the guide's pointing is untested.
- **Motion in 3D** has been seen frame by frame, not at speed.
- **No deployment.** `vercel.json` was tested through a local server that applies the same rules.
- No Firefox. No screenshot-comparison tests.

## What the owner can do now (none of it blocks Phase 03)

1. **Open it on a phone or tablet — this is now the most valuable thing anyone can do.** Until the site is deployed,
   that means running it on a computer on the same network (`npm run build`, then `npx vite preview --host`) and
   opening the address it prints. (Browsers switch offline support off for a plain-HTTP address like that one;
   everything else works.) Look first at:
   - does the map appear in 3D, and is it smooth? Then hold "Grown-ups", open Diagnostics, and note **Frames**,
     **Graphics tier** and **Scene**;
   - does tapping an island feel right, and does anything get tapped by mistake;
   - does sound start after the first tap; does a refresh keep the place in the activity; does the page sit
     correctly around the notch and the home indicator.
2. **Decide the guide's name.** "Glim" is provisional and unchecked; it lives in `src/app/strings.ts`.
3. **Decide when to connect Vercel.** `docs/DEPLOYMENT.md` has the steps and the settings (switch the Vercel Toolbar
   off). A preview deployment would let the smoke tests run against the real platform, and would make step 1 a link.
   Production release stays with Phase 16.
4. **Review the pull request.**

## The next action: Phase 03

Start a new session with:

> Read prompt-series/README.md, prompt-series/00_MASTER_BRIEF.md and prompt-series/03_WORLD_AND_PLAYER_JOURNEY.md,
> then docs/CONTINUE_HERE.md, docs/ART_DIRECTION.md, docs/QUALITY_REPORT.md and docs/ARCHITECTURE.md. Implement
> phase 03.

First steps, in order:

1. `npm ci`, then `npm run verify:release`, to confirm the starting point is green.
2. Read `docs/ART_DIRECTION.md`. It is the standard; Phase 03's screens are made to it or it is changed first.
3. Read `docs/QUALITY_REPORT.md` → _What is still wrong or weak_. The activity screen and the cut between the map
   and a world are the two weakest things a visitor meets.
4. Reuse what is there: the modelling kit and the studio for anything three-dimensional, `ui/Guide.tsx` for the
   guide (it takes a state and knows nothing about lessons), the eight colour roles, the sound motifs.

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

**Open questions for the owner** (none blocks Phase 03)

- Is "Glim" the guide's name?
- Is there a phone or tablet to try this on, and a child for short play tests from Phase 03 on?
- Who reviews the phonics content and records the voices (Phases 04–05)?
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
| Screenshots of the running build       | `docs/review/phase-02/` (before: `phase-01/`)    |
| One island close up; the guide's sheet | `/studio/<island>`, `/studio/guide` in the build |
