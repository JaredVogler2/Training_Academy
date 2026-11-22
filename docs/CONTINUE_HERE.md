# Continue here

**Phase 01 (foundation) is complete. Phase 02 has not been started.**

- **Date:** 2026-11-22
- **Branch:** `claude/zealous-carson-qyiipa` — pull request [#1](https://github.com/JaredVogler2/Training_Academy/pull/1),
  open, not merged
- **Tested code:** commit `19e2b55` (commits after it change documents and screenshots only)
- **Deployed:** nowhere. No Vercel project is connected to this repository.

## The state, in one paragraph

A static React and TypeScript app builds to `dist/` and runs under the same headers and routing that `vercel.json`
gives it. It has a home island (3D where possible, an illustration otherwise), six worlds of which one — Number
Garden — has a single three-minute activity, a headless learning engine that decides everything about that activity,
saving on the device with fallbacks, a grown-ups area, a service worker, and tests at every level. It looks tidy. It
does not yet look like the game the brief describes; that is the job of Phase 02.

## Verified

On commit `19e2b55`:

- `npm run verify:release` passes locally: format, lint, typecheck, **420 unit tests**, production build, **116
  build checks**, and **137 browser tests passed, 3 skipped by design** in headless Chromium on five screen shapes
  (1366×768, 390×844, 844×390, 768×1024, 360×740).
- CI passes: the same checks, the browser tests in Chromium (137 passed, 3 skipped by design), and in WebKit
  (101 passed, 21 skipped: the 3D and offline tests do not run there).
- Every browser test also fails on any console error or warning, failed request, or request to another origin.
- 48 screenshots of the running build were captured and looked at: `docs/review/phase-01/`.

Details, including every command and count: `docs/TEST_RESULTS.md`.

## Not verified — read this before relying on anything

- **No real device.** Not an iPhone, not an iPad, not an Android phone, not a real Safari. WebKit was exercised only
  as Playwright's Linux build in CI, where the 3D hub and the service worker are not tested at all.
- **No real graphics hardware.** The 3D hub has only ever been drawn by a software renderer. Its frame rate, memory
  use and tier choices on real devices are unknown.
- **No deployment.** `vercel.json` was tested through a local server that applies the same rules.
- **No child and no teacher** has seen it. Whether a four-year-old understands the activity is untested.
- No Firefox. No screenshot-comparison tests.

## What the owner can do now (none of it blocks Phase 02)

1. **Open it on a phone or tablet.** Until the site is deployed, that means running it on a computer on the same
   network (`npm run build`, then `npx vite preview --host`) and opening the address it prints. (Browsers switch
   offline support off for a plain-HTTP address like that one; everything else works.) Look first at:
   does the island appear in 3D and move smoothly; does sound start after the first tap; does a refresh keep the
   place in the activity; does the hold button in the grown-ups gate work; does the page sit correctly around the
   notch and the home indicator. Anything odd is worth more than every automated test here.
2. **Decide when to connect Vercel.** `docs/DEPLOYMENT.md` has the steps and the settings (switch the Vercel Toolbar
   off). A preview deployment would let the smoke tests run against the real platform. Production release stays
   with Phase 16.
3. **Review the pull request.** Merging to `main` also switches on the workflow that smoke-tests each Vercel
   preview, once a project is connected.

## The next action: Phase 02

Start a new session with:

> Read prompt-series/README.md, prompt-series/00_MASTER_BRIEF.md and prompt-series/02_PREMIUM_ART_DIRECTION.md, then
> docs/CONTINUE_HERE.md, docs/QUALITY_REPORT.md, docs/ART_DIRECTION.md and docs/ARCHITECTURE.md. Implement phase 02.

First steps, in order:

1. `npm ci`, then `npm run verify:release`, to confirm the starting point is green.
2. Read `docs/QUALITY_REPORT.md`: it lists what is weak, most visible first. The island is placeholder geometry, the
   worlds are not on it, and there is no character.
3. Read the Epoch60 documents the prompt names, for method. Copy nothing from them.
4. Rewrite `docs/ART_DIRECTION.md` (it is marked interim) before building.
5. Replace the island inside `src/render/hub3d/` and its illustrated twin in `src/render/IllustratedHub.tsx`. Keep
   the contract in `src/render/HubStage.tsx`: illustration first, 3D second, illustration again on any failure.

## Things the next session should know

**Rules the tools enforce**

- `src/engine` is pure: no clock, no random source, no DOM. ESLint fails otherwise. Time, ids and seeds come from
  `src/game/services.ts`.
- `three` and `@react-three/*` may be imported only under `src/render/hub3d`. `npm run verify:dist` also fails if 3D
  code becomes reachable from the first screen.
- Size budgets live in `scripts/verify-dist.mjs`. Raising one is a decision; say why in the commit.
- The Content-Security-Policy allows no inline script or style and no other origin. Styling is CSS Modules. A model or
  texture loader that fetches `blob:` URLs will need `connect-src` widened deliberately.
- Every browser test fails on any console warning. Allow a specific message in the one test that expects it; do not
  widen the lists in `e2e/fixtures.ts` without a reason written next to the entry.

**Traps already stepped in**

- **A phone hides overflow from the page.** Chromium's phone emulation (and real phones) widen the layout viewport
  to fit content that is too wide, so `scrollWidth === innerWidth` even when the page is broken. Use `screenFit()`
  from `e2e/fixtures.ts`; it measures against the configured screen and checks every control's edges.
- **An SVG that animates repaints all of itself.** Seven small animations inside the illustrated island kept a CPU
  core busy at 60 frames a second; they now move in steps. Measure anything that moves with
  `npm run measure:idle` before leaving it on a screen people sit on.
- **Software-rendered 3D is unusable** (8–27 frames a second, three cores busy), so on "automatic" a software renderer
  keeps the illustration. The 3D browser tests therefore ask for a tier by name (`graphics: 'low'`).
- **A slow machine opens the grown-ups gate late.** Tests hold the button until the area appears (`holdGateOpen`),
  never for a fixed time.
- **WebKit keeps a failed preload.** Do not re-enable `<link rel="modulepreload">` for on-demand parts
  (`build.modulePreload` in `vite.config.ts`).
- **WebKit forgets properties set on some browser objects** (for example `indexedDB.open = …` in a test). Patch the
  prototype.
- **The preview server reads `vercel.json` once**, at start. Restart it after changing headers or rewrites.
- **The browser tests start their own server on port 4173** and refuse to reuse one. Stop any preview first.
- **React Three Fiber 9 with three.js r183 or later** logs one deprecation notice; `src/render/hub3d/threeConsole.ts`
  filters exactly that text. Check it when either library is upgraded.
- **The cloud container this was built in has Chromium only and no GPU.** WebKit runs in CI. Frame rates measured
  there mean nothing.

**Open questions for the owner** (none blocks Phase 02)

- Who reviews the phonics content and records the voices (Phases 04–05)?
- Is there a child, and a tablet, available for short play tests from Phase 03 on?
- Should the project carry a licence file? It has none.

## Where things are

| For                                   | Look in                  |
| ------------------------------------- | ------------------------ |
| How it is built, and why              | `docs/ARCHITECTURE.md`   |
| What was run and what was found       | `docs/TEST_RESULTS.md`   |
| What is weak                          | `docs/QUALITY_REPORT.md` |
| Phase status and gaps carried forward | `docs/PROGRESS.md`       |
| Authoring content                     | `docs/CURRICULUM.md`     |
| Deploying                             | `docs/DEPLOYMENT.md`     |
| Assets and licences                   | `docs/ASSETS.md`         |
| Screenshots of the running build      | `docs/review/phase-01/`  |
