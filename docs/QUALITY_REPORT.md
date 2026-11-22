# Quality report

**Phase 01, 2026-11-22.** This is an assessment of the build as it stands, written to be useful to whoever does
Phase 02, not to make the build look good. The ratings are my own reading of the screenshots in
`docs/review/phase-01/` and of the running game in headless Chromium. Nobody else has reviewed it, no child has
played it, and it has never run on a phone, a tablet or a real graphics card.

## Summary

The foundation is sound and the shell is tidy, legible and consistent. It is **not yet a premium children's game**,
and was not meant to be at this phase: the island is made of spheres, cones and boxes, there is no character, almost
nothing reacts to being touched, and there is one three-minute activity. By the rubric Phase 02 will be held to
(4 or more in every category), the home screen passes on palette and legibility and fails on craft and liveliness.

## Ratings (1 = poor, 3 = acceptable, 5 = excellent)

The categories are the ones in `prompt-series/02_PREMIUM_ART_DIRECTION.md`.

| Category             | Home, 3D | Home, illustrated | Activity | Grown-ups | Why                                                                                                                                                    |
| -------------------- | :------: | :---------------: | :------: | :-------: | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Composition          |    3     |         3         |    3     |     3     | One clear focal point (the lighthouse), a horizon, a lead-out along the pier. On an upright phone the island is small with a band of empty sea.        |
| Craft and materials  |    2     |         3         |    3     |     3     | The 3D island is untextured primitives; trees are identical balls on sticks. The 2D drawings are clean but plain.                                      |
| Cohesive palette     |    4     |         4         |    4     |     4     | One set of tokens for interface, illustration and 3D. Warm sky, teal sea, one colour per world.                                                        |
| Depth and lighting   |    3     |         2         |    2     |     —     | Soft shadows (medium and high tiers), haze on far islands, a gradient sky. No ambient occlusion, no rim light, no reflection. 2D screens are flat.     |
| Liveliness           |    2     |         2         |    2     |     —     | Water, clouds, gulls and a slow camera drift. The illustration has the same, in small steps. No characters; nothing on the island responds to a touch. |
| Interface legibility |    4     |         4         |    4     |     4     | Large labelled targets, strong contrast, one focus ring, no text over busy backgrounds. Checked by automated accessibility tests.                      |
| Motion quality       |    3     |         2         |    3     |     3     | Short, purposeful, and fully stopped by calm motion. No transitions between screens.                                                                   |
| Child comprehension  |    ?     |         ?         |    ?     |     —     | **Not rated.** No child has used it. The automated "play by looking at the pictures" test shows it is possible, not that it is obvious.                |
| Device performance   |    ?     |         —         |    —     |     —     | **Not rated.** Never run on real graphics hardware. See _Performance_.                                                                                 |

## What is wrong or weak, specifically

Seen in the screenshots:

1. **The island is placeholder geometry.** Lighthouse, house, trees, rocks, pier and boat are built from primitive
   shapes with flat colours. Phase 02's own acceptance rule ("no untextured prim-only islands") fails today.
2. **The six worlds are not on the island.** The tiles are a menu laid over a picture; nothing in the scene says
   "the garden is here". Tapping the island does nothing.
3. **Upright phone: empty sea.** Between the island and the dock roughly a quarter of the screen is plain water
   (`hub-3d-390x844.jpg`). The island is framed to fit its width, so it is small.
4. **Five of six tiles are closed.** They show a moon badge and say "not open yet" to a screen reader. That is honest,
   but a first-time visitor meets a mostly shut game, and whether a four-year-old reads the moon as "asleep" is
   untested.
5. **The two hubs are different pictures.** The illustration and the 3D scene share a palette, not a composition, so
   the hand-over from one to the other is a cross-fade between two islands.
6. **The low tier is flat.** Without shadows the island loses most of its depth (`hub-3d-low-tier-390x844.jpg`).
7. **Activity screen: the group to match is drawn larger than the choices**, because its card is larger. Size is not a
   clue to the answer, but it is not controlled either. On a tablet and a desktop the cards are mostly empty space.
8. **The caption under an activity is text.** It is there for the adult alongside and for screen readers; a child who
   cannot read gets the demonstration and the pointing hand, and no voice yet.
9. **Emblems and icons are competent, not a family.** The owl, robot and ladybird were drawn one at a time.
10. **Sound is six synthesised blips.** No music, no voice, no ambience.

Structural, not visible in a screenshot:

11. **Draw calls.** 53–98 per frame for 30–54 thousand triangles. Clouds, posts, rocks, flowers and trees are separate
    meshes; they should be instanced or merged before the scene grows.
12. **No real-device performance data** (see below).
13. **No visual regression tests.** Screenshots are captured by a script and read by eye.

## What is in reasonable shape

- **Layout on every required screen**: 390×844, 844×390, 768×1024, 1366×768 and 360×740, checked by tests that measure
  targets, overlap and overflow against the real screen size, with the longest names the forms accept.
- **Legibility and accessibility basics**: automated axe checks (WCAG 2.1 A and AA rule sets) on every screen and
  state find no violations; the keyboard journeys are tested; every control has a name and a role. No screen reader
  has actually been run. Calm motion and mute are honoured everywhere.
- **Teaching feedback**: a wrong tap sets that choice aside and re-teaches, with no red, no shaking and no buzzer (a
  soft two-note cue invites another try); help comes in three steps; a helped answer is never counted as
  independent.
- **Robustness**: no WebGL, lost graphics context, failed downloads, blocked storage, wiped storage, a refresh
  mid-question and no network are each handled and tested.

## Performance

### What was measured

Sizes (gzip, from `npm run verify:dist`; budgets are enforced by that script):

| What                                | Size     | Budget |
| ----------------------------------- | -------- | ------ |
| Script needed for the first screen  | 93.9 kB  | 110 kB |
| Styles needed for the first screen  | 4.8 kB   | 12 kB  |
| Fonts (two variable fonts, Latin)   | 67.2 kB  | 80 kB  |
| 3D hub code, fetched afterwards     | 244.3 kB | 290 kB |
| Largest other on-demand part        | 5.7 kB   | 30 kB  |
| Whole build, uncompressed, 32 files | 1.43 MB  | 2.6 MB |

The 3D code is never in the first load (the verifier follows the entry's imports and fails the build if it is), and
is never fetched at all on a device without WebGL or with graphics set to pictures only (browser tests).

Cost of the 3D scene, from `npm run measure:hub` against the production build:

| Screen            | Tier   | Draw calls | Triangles | Pixel ratio | Frames/s (software) | 95% of frames under |
| ----------------- | ------ | ---------- | --------- | ----------- | ------------------- | ------------------- |
| desktop 1366×768  | low    | 63         | 33,827    | 1           | 10                  | 118 ms              |
| desktop 1366×768  | medium | 98         | 52,663    | 1           | 8                   | 145 ms              |
| desktop 1366×768  | high   | 98         | 54,103    | 1           | 8                   | 143 ms              |
| phone 390×844 @3× | low    | 53         | 29,555    | 1           | 27                  | 43 ms               |
| phone 390×844 @3× | medium | 89         | 48,787    | 1.5         | 13                  | 85 ms               |
| phone 390×844 @3× | high   | 89         | 50,227    | 2           | 9                   | 128 ms              |

Draw calls, triangles and pixel ratio are properties of the scene. **The frame rates are from SwiftShader, a
software renderer on four CPU cores with no GPU.** They are useful only to compare the tiers with each other. They
say nothing about a phone, a tablet or a laptop, in either direction.

### What a screen costs while nobody is touching it

CPU time of all browser processes over five seconds with the page left alone, from `npm run measure:idle`
(headless Chromium, software rendering; 100% means one core fully busy):

| Screen                                  | Size     | CPU while idle |
| --------------------------------------- | -------- | -------------- |
| Home, illustrated — **before** this fix | 1366×768 | 100%           |
| Home, illustrated — **before** this fix | 390×844  | 15%            |
| Home, illustrated                       | 1366×768 | 10%            |
| Home, illustrated                       | 390×844  | 6%             |
| Home, illustrated, calm motion          | 1366×768 | 0%             |
| A world's front page                    | 1366×768 | 8%             |
| The activity                            | 1366×768 | 6%             |
| The grown-ups gate                      | 1366×768 | 0%             |
| Home, 3D, low tier (software 3D)        | 1366×768 | 349%           |

Two things follow from this, and both were acted on:

1. **The illustrated home screen was expensive for the very devices it exists for.** Seven ambient animations inside
   one SVG repainted the whole drawing sixty times a second, under a dock whose backdrop blur was recomputed each
   time. The animations now step four to ten times a second and the dock has no blur. On the slower CI machine the
   old version starved everything else: the grown-ups gate there took up to six seconds to open instead of two.
2. **Software-rendered 3D is not usable.** A CPU rasteriser draws this scene at 8 to 27 frames a second with more than
   three cores busy. On "automatic", a device whose only WebGL is a software one now keeps the illustration; a
   grown-up can still choose a 3D quality by name.

These are software-rendering numbers. With a GPU the absolute cost is far lower; the ranking should hold.

### What was not measured

- Frame rate, frame-time stability, memory use, heat or battery on any real device.
- Load time on a real network. (The test server is on the same machine.)
- Lighthouse or Web Vitals in the field. The game records paint and layout-shift timings on the device for the
  grown-ups' diagnostics panel, and sends them nowhere.

Until a real device has been tried, treat the tier thresholds in `src/render/quality.ts` as guesses.

## How this was checked

| Check                         | By                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Screens fit, targets, overlap | Browser tests, five screen shapes                                                                  |
| Colour contrast, names, roles | axe-core in the browser tests                                                                      |
| The 3D scene really draws     | A test that decodes a screenshot: more than 150 distinct colours, sky above, and gentle movement   |
| Composition, taste, clarity   | By eye, from 48 screenshots of the running build; two rounds of fixes (see `docs/TEST_RESULTS.md`) |

Faults found by looking at screenshots and fixed in this phase: a camera that looked down too steeply and showed no
sky; a sun cut off on an upright phone; a jagged low tier (antialiasing is now on at every tier); loud wave glints;
tile pictures overflowing on a sideways phone; the boat hidden behind the dock on a sideways phone; and, in the
illustrated island, the boat cut off by the edge of an upright phone.

## For Phase 02

Start from the ten visible weaknesses above; numbers 1–5 are the ones a visitor notices first. Keep what is in
reasonable shape working: every change to the hub has to pass the same layout, fallback, calm-motion and
no-outside-request tests, and the first screen must still appear without the 3D code.
