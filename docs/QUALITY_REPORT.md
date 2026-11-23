# Quality report

This file has two parts. The first is Phase 03's review of what Phase 03 built. The second is Phase 02's report on
the home screen, kept as it was written, because it is still the assessment of the hub.

Both are written to be useful to whoever works on this next, not to make the build look good. The ratings are my own
reading of screenshots and of the running game in headless Chromium. Nobody else has reviewed it, no child has
played it, and it has never run on a phone, a tablet or a real graphics card. The standard it is rated against is
`docs/ART_DIRECTION.md`.

## Phase 03 (2026-11-23): the journey in, and the activity

### Summary

A visit now has a beginning, a middle and an end. It opens on a front door where a child says who is playing by
tapping a picture; the map behind it comes alive; one island leads, through a page that shows what is done there,
into an activity that Glim demonstrates, helps with, and ends calmly; and the way out is the way home at any point.
The activity screen, which Phase 02 left below 4 in most categories, is now the same paper-on-water world as the
rest.

What this phase could not do is put it on a phone. The requirement added for it — that it work on Android and iOS
devices on a Vercel deployment — was met as far as code, emulation and reasoning go, and no further: see _Phones_,
below.

### The review

Captured from the running production build with `npm run screens` at 390×844, 844×390, 768×1024, 1366×768 and
360×740, and at 750×342 (what Safari leaves a page on an iPhone held sideways): rated, changed, captured and rated
again. Six pictures of round one are in `docs/review/phase-03/round-1/`; round two is the 85 pictures in
`docs/review/phase-03/`, among them 21 click maps and three tooltips.

Round two (round one in brackets where it differs). 1 = poor, 3 = acceptable, 5 = excellent.

| Category             | Front door | Activity | World page | Why                                                                                                                                                                             |
| -------------------- | :--------: | :------: | :--------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composition          |     4      |    4     |     4      | One card in front of the map; one board with one thing to do; the place, what it is for, and one way in. On a wide screen the activity's cards are still larger than they need. |
| Craft and materials  |     4      | 4 (3.5)  |     4      | The same paper, lips and radii everywhere. The activity had an empty gradient behind it; it now has two pale hills in the world's colour.                                       |
| Cohesive palette     |    4.5     |   4.5    |    4.5     | Sun is still only "this way": the answer, the way on, "carry on", Play.                                                                                                         |
| Depth and lighting   |     4      | 3.5 (3)  |    3.5     | The door has the map behind a veil. The activity is flat on purpose — nothing to count but the things — with the lips, the hills and Glim's glow for depth.                     |
| Liveliness           |     4      |    4     |    3.5     | Glim waves, counts, points, celebrates; things hop when counted; flowers come up at the end. The world page is a still page with one fade.                                      |
| Interface legibility |    4.5     |   4.5    |     4      | Every child's control is 56 pixels or more on every screen (click maps). The world page still carries a good deal of text for the grown-up below the first screen.              |
| Motion quality       |     4      | 4 (3.5)  |     4      | One thing moves at a time. In round one a wrong choice wobbled twice and a demonstration gave its answer away early. Seen in a browser at speed; not on a device.               |
| Child comprehension  |     —      |    —     |     —      | **Not rated.** No child has seen it.                                                                                                                                            |
| Device performance   |     —      |    —     |     —      | **Not rated.** These screens are light (no 3D), but nothing here has run on a device.                                                                                           |

Below 4, and why it was left there: **depth** on the activity and the world page, and **liveliness** on the world
page. The activity is flat because anything else on that screen competes with the things being counted; the world
page is a signpost with one job. Both are choices, and both would change if a child's eye turned out to wander.

### Seen — cause — fix

| Seen                                                                                     | Cause                                                                                                    | Fix                                                                                                          |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| On a sideways phone, Glim was drawn in the middle of the front door's pictures           | The card's own rule made Glim's box unpositioned, and its drawing is laid out inside that box            | The box stays positioned                                                                                     |
| The pictures' shadows were cut off along a straight line                                 | The list scrolls when there are many players, and a scrolling box clips                                  | Room for the shadows inside the box                                                                          |
| The example of the activity lay over the Play button                                     | A height in per cent, measured against a row whose height came from its contents                         | A row of exactly the room's height                                                                           |
| On a sideways phone Play was below the first screen                                      | The example added a row above it                                                                         | The place on the left, the way in on the right                                                               |
| A wrong choice wobbled twice: when tapped, and again after being counted                 | "Set aside" was applied at once, lifted for the counting, and applied again                              | It is held, with a dashed edge, until it has been counted; then set aside once                               |
| A demonstration lit its answer before reaching it                                        | The engine says the answer is shown for the whole of a demonstration; the screen showed it for the whole | The screen waits for the script to reach it                                                                  |
| _Click map:_ "carry on" was 72 pixels on a sideways phone                                | The default size of a large round button outranked the size it was given                                 | The rule outranks the default; it is 84                                                                      |
| _Click map:_ the way home in the top bar was 44 pixels high on a sideways phone          | The bar is shorter there and the link was shortened with it                                              | 48, which still fits                                                                                         |
| The front door showed the last player's name tag behind its veil                         | The tag was part of the map                                                                              | It appears once the child has said who is playing                                                            |
| The activity's background was an empty gradient                                          | Phase 01's frame, never revisited                                                                        | Two pale hills in the world's colour, low and still                                                          |
| _Accessibility check:_ soft text failed contrast on a world page, but only sometimes     | The check ran while the page was still fading in, and measured the fade                                  | The checks wait for a page to finish arriving (`arrived()`)                                                  |
| _Journey test:_ a front-door picture measured 57 pixels on a sideways Pixel              | It was measured while popping in; it is 68                                                               | The test measures after arrival. (A fault in the test, not the page.)                                        |
| _Storage test:_ with all storage refused, the map could not be reached                   | Nothing can remember that the visit has begun, so the front door is met on every load — as it should be  | The test goes through the door, which is now what that case checks                                           |
| _Layout arithmetic:_ on a sideways phone with its bars showing, islands fill 0.89        | Name tags have a smallest size and take a little more of a very short screen                             | The check allows 0.88 there, and says why. Tap areas are 102 pixels or more on every one of eighteen screens |
| _Reading the code with a phone in mind:_ the first sound of a visit would never be heard | A phone's audio takes a moment to wake, and a cue asked for in that moment was dropped                   | The cue waits for the wake, up to 0.9 seconds. **Reasoned and unit-tested; not heard on a phone.**           |

### Phones: what was done, and what only a phone can tell

| Done in this phase                                                                                                             | How it was checked                                                                | What only a device can tell                                                           |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| The first tap of a visit is on the front door, and its sound waits for the audio to wake                                       | Unit tests on the audio engine with a context that wakes late                     | Whether the hello is heard on an iPhone and on an Android phone                       |
| While sound is on, Safari is asked to treat the game as media, so the ring/silent switch does not mute it                      | A unit test that the request is made, and survives a browser that refuses it      | Whether an iPhone on silent plays the sounds; whether that is what a family wants     |
| Coming back from another app meets the pause sheet, whose tap wakes the audio again                                            | Read from the code; pausing itself is tested in a browser                         | Whether sound returns after a call or a switch of apps                                |
| A resting finger selects nothing, gets no iOS call-out, and opens no Android menu                                              | Unit tests on the guard; the styles are read, not tested                          | All of it. A long press on an island and on a picture in an activity, on both systems |
| Every screen fits what a phone's browser really leaves a page, upright and sideways                                            | Eighteen screens by arithmetic; browser tests as a Pixel 7, an iPhone 13, an iPad | The notch, the home indicator, the toolbar that comes and goes, rotation              |
| A browser too old to run the game says so after eight seconds, instead of showing nothing                                      | Read from the page; not tested in an old browser                                  | What an old iPad actually shows                                                       |
| Nothing new needs the network, a login or a key; the Vercel configuration is unchanged from the one tested in Phases 01 and 02 | The same header, routing and service-worker tests as before                       | A deployment. **Nothing has been deployed.**                                          |

The emulated devices are the right screen, pixel ratio, touch and user agent on desktop engines. They found one
real thing (Play below the first screen on a sideways phone) and would not find anything about sound, GPUs, the
notch or a finger.

### What is still wrong or weak

1. **No phone or tablet has run it.** Everything in the right-hand column above.
2. **No child has seen it.** Whether a four-year-old taps a picture at the door, finds the island with the sun
   tag, watches the demonstration, and knows that Glim will show it again, is untested.
3. **Glim still has no voice.** "Show me again" replays what was shown and its notes. An instruction in words exists
   only as the caption for the grown-up. Phase 04.
4. **One activity, in one world.** The frame is built for every world and has been used by one.
5. **Travelling is a fade.** Tapping an island still does not take the child there; the page arrives softly and
   shows the same island. A journey across the water was not built.
6. **On a wide screen the activity's cards are bigger than their pictures need.** Legible; not handsome.
7. **The world page is mostly for the grown-up.** For the child it is one picture and one sun button, which is
   enough, but everything below the first screen is text.
8. **Leaving the tab pauses the activity.** Right for a phone; on a desktop, coming back to a "Paused" sheet after
   glancing at another tab may be more than was wanted.
9. **A browser test that follows a 3D test still waits for it in CI** (up to 44.5 of its 60 seconds, in Phase 02's
   runs). Not fixed in this phase; `docs/PROGRESS.md` → _Known gaps_.
10. Everything in Phase 02's list below that is about the hub still stands.

## Phase 02 (2026-11-22): the home screen

## Summary

The home screen is now the game's own world rather than a menu over a placeholder: a lighthouse and six modelled
islands in a moving sea, each island a button, with a guide who points the way. It is one picture in two forms —
real-time 3D, and images rendered from the same models — placed by the same arithmetic, so the fallback is the same
hub and not a lesser one.

By the nine-category rubric of `prompt-series/02_PREMIUM_ART_DIRECTION.md`, the home screen reaches 4 or more in
every category that can honestly be rated here. **Three categories cannot be**: motion quality in 3D (it has only
been seen at two to four frames a second, in software), device performance (no graphics hardware) and child
comprehension (no child). The activity screen was not this phase's subject and is still below 4 in several; it
belongs to Phase 03.

## The art review

Screens were captured from the running production build at 390×844, 844×390, 768×1024, 1366×768 and 360×740
(`npm run screens`), rated, changed, captured again and rated again. Round one is kept in
`docs/review/phase-02/round-1/`; round two is `docs/review/phase-02/`.

### Home screen, 3D (1 = poor, 3 = acceptable, 5 = excellent)

| Category             | Round 1 | Round 2 | 390×844 | 844×390 | 768×1024 | 1366×768 | 360×740 | Why (round 2)                                                                                                                                 |
| -------------------- | :-----: | :-----: | :-----: | :-----: | :------: | :------: | :-----: | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Composition          |    4    |    4    |   4.5   |    4    |    4     |   4.5    |    4    | One arrangement per screen shape; the lighthouse leads the eye; the guide sits by the open island. Sideways phone: islands are small.         |
| Craft and materials  |   3.5   |    4    |    4    |    4    |    4     |    4     |    4    | Rounded, gradient-painted, brush-textured models with dressed ground. Still simple forms; the stones in the sea are plain.                    |
| Cohesive palette     |    4    |   4.5   |   4.5   |   4.5   |   4.5    |   4.5    |   4.5   | Eight roles throughout; each island and its name tag wear the island's colour; sun-yellow only where it means "this way".                     |
| Depth and lighting   |   3.5   |    4    |    4    |    4    |    4     |    4     |    4    | One warm sun, cool shade, soft shadows, contact shade, haze, paler water far away, a vignette. By design no gloss and no ambient occlusion.   |
| Liveliness           |   3.5   |    4    |    4    |    4    |    4     |    4     |    4    | Water, wind, a turning mill, a waving robot, boats, gulls, clouds and their shadows, a guide who answers a tap. Islands react only by rising. |
| Interface legibility |    4    |   4.5   |   4.5   |    4    |   4.5    |   4.5    |   4.5   | The island is the button; names never cut short or covered; one island stands out. Sideways phone: 12-pixel names.                            |
| Motion quality       |    ?    |    ?    |    ?    |    ?    |    ?     |    ?     |    ?    | **Not rated.** See below.                                                                                                                     |
| Child comprehension  |    ?    |    ?    |    ?    |    ?    |    ?     |    ?     |    ?    | **Not rated.** No child has seen it.                                                                                                          |
| Device performance   |    ?    |    ?    |    ?    |    ?    |    ?     |    ?     |    ?    | **Not rated.** No graphics hardware. See _Performance_.                                                                                       |

### Other screens (round 2)

| Category             | Home, as a picture | Home, 3D, low tier | Activity | Why                                                                                                                                               |
| -------------------- | :----------------: | :----------------: | :------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composition          |         4          |         4          |    3     | The picture and the low tier are the same layout. The activity is the Phase 01 frame: large empty cards on a wide screen.                         |
| Craft and materials  |         4          |        3.5         |    3     | The picture is the 3D render. The low tier has coarser curves and plainer water. Counting pictures are plain single shapes, on purpose.           |
| Cohesive palette     |        4.5         |        4.5         |    4     | The same.                                                                                                                                         |
| Depth and lighting   |         4          |        3.5         |   2.5    | The picture has the shadows painted in. The low tier has painted contact shade only. The activity is flat.                                        |
| Liveliness           |      **3.5**       |         4          |    3     | In the picture, boats bob, clouds and wave marks drift, the guide moves — but the islands themselves are still. The activity has the guide.       |
| Interface legibility |        4.5         |        4.5         |    4     | The same links and names in all three hubs.                                                                                                       |
| Motion quality       |         4          |         ?          |   3.5    | The picture's motion and the guide's are CSS and were seen at full speed: calm, purposeful, stopped by calm motion. No change-of-page transition. |

**Below 4, and why it was left there**

- **The picture's liveliness (3.5).** Its islands are still images. Moving parts of them would mean a second picture
  per island or a sprite sheet; that was judged not worth 150 kB more on the first screen for a fallback. It is the
  first thing to revisit if real devices turn out to get the picture more often than expected.
- **The low tier (3.5 for craft and depth).** That is what a tier is for. Nothing a child needs is missing from it.
- **The activity screen.** Phase 02 gave it the guide and nothing else. Its frame, its pictures and its transitions
  are Phase 03's "first complete vertical slice".

**Why motion in 3D is not rated.** A still picture says nothing about motion, and the only moving 3D seen here was
drawn by a software renderer at two to four frames a second. What can be said: every moving thing was watched and
does what it is meant to (frame-by-frame captures; a browser test checks that the scene changes gently and holds
still under calm motion); nothing moves the camera; the periods and distances are those in `docs/ART_DIRECTION.md`.
Whether it is _smooth_ on a real device is unknown.

### Seen — cause — fix

What looking at the screenshots found, in the order it was found. Rounds one and two of the review are the last
eight rows; the rest were found on the way to round one.

| Seen                                                                             | Cause                                                                         | Fix                                                                                                           |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| The sea was covered in glints, like static                                       | Fine grain thresholded at a high frequency                                    | Glints from two slow layers sliding past each other: lens-shaped, in drifting shoals                          |
| Vertical seams in the water                                                      | The brush texture's streak channel did not tile                               | Noise with its own period on each axis                                                                        |
| Grey-brown ground round the lighthouse                                           | Too little flat top, too much cliff, and contact shade mixed towards grey     | A wider top, less cliff; contact shade darkens the ground's own colour                                        |
| The robot's eyes were slits; doors and windows were fatter than drawn            | The rounded block grew by its bevel on every side                             | A block now measures what it is asked to                                                                      |
| Stones looked like cut gems                                                      | A faceted solid among soft shapes                                             | A lumpy ball with smooth shading                                                                              |
| Sunflowers and a flag cut off; landmarks could reach into a neighbour's tap area | The room given to a landmark ignored how far back on its island it stands     | Room is measured as drawn on screen; a test measures every model, through the motion of its moving parts      |
| Names cut short on a sideways phone ("Inventor Isla…")                           | One type size; a name no wider than its island                                | Type sized from the islands; a name may overhang its island but never the screen; a test at five sizes        |
| Clouds like grey boulders, one of them over an island                            | Too big, too shaded, placed by eye                                            | Smaller, self-lit, placed by the layout's arithmetic, with tests that nothing floats over an island or a name |
| A white ring round every boat                                                    | The water treated a boat as an island                                         | Floating things get faint foam and no shallows                                                                |
| In an activity on a phone, the caption was squeezed to two words a line          | Guide, caption and a worded button in one row                                 | Under 480 pixels the way on is a round arrow; its words stay for screen readers                               |
| The guide's states looked alike; a pointing arm vanished against the body        | Short arms, no hands                                                          | Mittens, an arm that reaches, a pose for each state, lifted brows for the gentle retry                        |
| The guide's sparkles all in one corner                                           | An animated CSS transform replaced the position given in the drawing          | Each spark sits in its own positioned group                                                                   |
| An error on the console, sometimes, when the 3D code could not be downloaded     | A lazily loaded component throwing while React rendered                       | The 3D code is fetched by hand; a failure is a value, and the hub keeps its picture                           |
| The lighthouse missing from one capture of the picture                           | The screenshot was taken while that image was still being decoded             | Captures and tests wait for every picture to be decoded and drawn                                             |
| Keyboard: the first Tab reached the guide, not an island                         | The guide came first in the page                                              | The guide comes after the islands                                                                             |
| _Round 1:_ surfaces flat at the size the islands are seen (craft 3.5)            | Brushwork too faint; ground one even green                                    | Stronger wash; clumps of light and shade; a darker line where turf meets sand; tufts, pebbles, starfish       |
| _Round 1:_ little moving but the water (liveliness 3.5)                          | No creatures; sparse wave marks                                               | Gulls that beat and glide; buoys; more wave marks; pools of sunlight; in the picture, drifting wave marks     |
| _Round 1:_ the sea the same in every corner (depth 3.5)                          | Nothing gathered the eye                                                      | A vignette and a little haze at the far edge, over 3D and picture alike                                       |
| _Round 1:_ every name tag alike (palette 4)                                      | Grey badges                                                                   | Each badge in its island's colour                                                                             |
| _Round 1:_ the guide small on a wide screen                                      | Two units across                                                              | A fifth larger                                                                                                |
| _Round 2:_ the picture hub kept a quarter of a processor core busy               | Twenty small animations, each stepping in its own time                        | Everything that never stops moves on one shared half-second beat: 24% of a core became 14%                    |
| _Round 2:_ software-rendered 3D at two frames a second                           | Water shaded under the islands; fine curves and rich water on the lowest tier | Water drawn last; the lowest tier cuts curves coarser and drops the water's decoration: twice the frame rate  |
| _Round 2:_ island meshes kept every corner three times over                      | Shapes merged without shared vertices                                         | Corners stored once: 5.3 MB of vertex data instead of 12.5 MB                                                 |

## What is still wrong or weak

1. **It has never been drawn by a graphics card.** Everything about the 3D hub's speed is inference (see
   _Performance_).
2. **No child has seen it.** Whether a four-year-old reads a moon as "asleep", sees that the island is the button,
   or notices the guide pointing, is untested. The sunny name tag and the pointing guide are two signals for "start
   here"; nobody knows yet whether either works.
3. **Five of the six islands are closed.** They are finished to look at and lead to a page that says so.
4. **A phone held sideways gets small islands** (about 105 pixels across) and a top bar a seventh of the screen
   high. Everything is legible and tappable; it is the least generous of the five layouts.
5. **The picture's islands do not move** (rated above).
6. **No transition between screens.** Tapping an island cuts to its page. The page now shows the same island, which
   helps; a journey there is Phase 03's.
7. **The activity screen is Phase 01's**, with the guide added. The world emblems (a ladybird, an owl…) were drawn
   before the islands and no longer match them; one still appears when an activity ends.
8. **The guide has no voice** and the name "Glim" has not been checked for prior use.
9. **Shapes are simple.** This is a style, but also a ceiling: there are no characters living on the islands apart
   from two faces, and nothing on an island answers a tap except by rising.
10. **Sound is eight synthesised motifs.** No voice, no ambience.
11. **The pictures are rendered at 80 pixels to the unit.** On a large high-density screen they are slightly soft.
12. **The focus ring is a heavy rounded rectangle** round the whole island. Clear; not pretty.

## What Phase 01 listed, and where it stands now

| Phase 01 said                                       | Now                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| The island is placeholder geometry                  | Seven modelled, painted islands                                              |
| The six worlds are not on the island                | Each world is an island, and the island is the link                          |
| Upright phone: empty sea                            | Stepping stones to the lighthouse; the screen is full                        |
| Five of six tiles are closed                        | Still five closed. They look alive rather than shut; the open one stands out |
| The two hubs are different pictures                 | One picture in two forms; a browser test checks they agree                   |
| The low tier is flat                                | Contact shade is painted into the ground on every tier                       |
| The group to match is drawn larger than the choices | Unchanged (Phase 03)                                                         |
| The caption under an activity is text               | Now the guide's speech bubble; still no voice (Phase 04)                     |
| Emblems and icons are not a family                  | Unchanged, and now further from the islands' style                           |
| Sound is six blips                                  | Eight, as named motifs                                                       |
| 53–98 draw calls for 30–54 thousand triangles       | 24–35 draw calls for about 105 thousand (47–50 thousand on the low tier)     |
| No real-device performance data                     | Still none                                                                   |
| No visual regression tests                          | Still none; one test compares picture and 3D at the islands' middles         |

## Performance

### Sizes

From `npm run verify:dist`, which enforces the budgets (gzip, except where noted):

| What                                   | Size     | Budget | Phase 01 |
| -------------------------------------- | -------- | ------ | -------- |
| Script needed for the first screen     | 98.6 kB  | 110 kB | 93.9 kB  |
| Styles needed for the first screen     | 6.2 kB   | 12 kB  | 4.8 kB   |
| Fonts (two variable fonts, Latin)      | 67.2 kB  | 80 kB  | 67.2 kB  |
| The hub's pictures (WebP, as they are) | 283 kB   | 330 kB | —        |
| 3D hub code, fetched afterwards        | 259.7 kB | 290 kB | 244.3 kB |
| Largest other on-demand part           | 5.8 kB   | 30 kB  | 5.7 kB   |
| Whole build, uncompressed              | 1.78 MB  | 2.6 MB | 1.43 MB  |

The first screen is heavier than it was by the pictures: 283 kB of images that arrive after the page is usable and
are then kept. The 3D code is never in the first load (the verifier follows the entry's imports and fails the build
if it is), and is never fetched at all on a device without WebGL or with graphics set to pictures only.

### What the 3D scene costs

From `npm run measure:hub` against the production build. Draw calls, triangles and what the renderer holds are
properties of the scene and do not depend on the machine:

| Screen            | Tier   | Draw calls | Triangles | Geometries | Textures | Shader programs | Pixel ratio |
| ----------------- | ------ | ---------- | --------- | ---------- | -------- | --------------- | ----------- |
| desktop 1366×768  | low    | 26         | 49,672    | 24         | 1        | 2               | 1           |
| desktop 1366×768  | medium | 32         | 105,510   | 27         | 3        | 3               | 1           |
| desktop 1366×768  | high   | 35         | 107,186   | 27         | 3        | 3               | 1           |
| phone 390×844 @3× | low    | 24         | 46,852    | 23         | 1        | 2               | 1           |
| phone 390×844 @3× | medium | 30         | 102,690   | 26         | 3        | 3               | 1.5         |
| phone 390×844 @3× | high   | 33         | 104,366   | 26         | 3        | 3               | 2           |

Against the ceilings this phase set itself: **under 40 draw calls** (each island is one; Phase 01 had 53–98), **under
160,000 triangles** (a unit test holds each island under 40,000), **three textures at most** (the brush, and two
for the shadow map), **three shader programs** (paint, water, shadow). Shadows are drawn once and kept, so an ordinary
frame has no shadow pass. All vertex data is 5.3 MB (2.4 MB on the low tier).

**Frame rate: measured only in software, and it is poor.** SwiftShader, a CPU rasteriser on four cores, draws the
scene at 2 to 4 frames a second on the medium and high tiers and 3 to 8 on the low tier — slower than Phase 01's
scene (8 to 27), because every pixel of the screen now runs a real water shader. This says very little about a
graphics card, which is built for exactly that work, and by a graphics card's standards the scene is light. But it
is not evidence either way. What follows from it:

- On "automatic", a device whose only WebGL is a software one **keeps the picture** (unchanged from Phase 01, and
  now more important).
- The tier thresholds in `src/render/quality.ts` are still guesses. On automatic the pixel ratio steps down by
  itself if frames are slow; that has never been seen working on real hardware.
- **The first thing to do with a real phone is open the home screen and read Grown-ups → Diagnostics → Frames.**

### What a screen costs while nobody is touching it

CPU time of all browser processes over five seconds with the page left alone, from `npm run measure:idle`
(headless Chromium, software rendering; 100% means one core fully busy):

| Screen                           | Size     | CPU while idle | Phase 01 |
| -------------------------------- | -------- | -------------- | -------- |
| Home, as a picture               | 1366×768 | 14%            | 10%      |
| Home, as a picture               | 390×844  | 7%             | 6%       |
| Home, as a picture, calm motion  | 1366×768 | 0%             | 0%       |
| A world's front page             | 1366×768 | 0%             | 8%       |
| The activity                     | 1366×768 | 7%             | 6%       |
| The grown-ups gate               | 1366×768 | 0%             | 0%       |
| Home, 3D, low tier (software 3D) | 1366×768 | 358%           | 349%     |

The picture hub was at 24% before its motion was put on one beat (see the log above). What is left is the price of
redrawing a full screen of layered images twice a second in software; with a graphics card compositing, it should
be near nothing. The guide costs about three points of it.

### What was not measured

- Frame rate, frame-time stability, memory use, heat or battery on any real device.
- Load time on a real network. (The test server is on the same machine.)
- How long the 3D scene takes to build on a slow phone: seven islands are sculpted on the main thread when the 3D
  code arrives. It is quick here; it has not been timed on a phone.
- Lighthouse or Web Vitals in the field. The game records paint and layout-shift timings on the device for the
  grown-ups' diagnostics panel, and sends them nowhere.

## How this was checked

| Check                                             | By                                                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Tap areas: size, no overlap, nothing covering     | Unit tests on the layout for ten screen shapes; browser tests that hit-test five points on every island  |
| Every model inside its room; triangle budgets     | Unit tests that measure each model, following its moving parts                                           |
| Picture and 3D in the same places                 | A browser test comparing the two at every island's middle                                                |
| Names never cut short or off the screen           | Browser test, five screen shapes                                                                         |
| Colour contrast, names, roles                     | axe-core in the browser tests; ratios in `docs/ART_DIRECTION.md` computed from the palette               |
| The 3D scene really draws, moves, and holds still | Tests that decode screenshots: many colours, paler water far away, gentle change, none under calm motion |
| The guide says the right thing at the right time  | A browser test through a whole activity                                                                  |
| Assets listed and licensed; no hot links          | Unit tests on the manifest and on every shipped file                                                     |
| Composition, taste, clarity                       | By eye, from the screenshots in `docs/review/phase-02/`, two rated rounds                                |

## For Phase 03

The hub can carry more than it does: islands that answer a tap with something of their own, a journey to the island
rather than a cut, the guide speaking. The activity screen is where the look is weakest now; the kit, the palette
and the guide are there to bring it up to the hub. And before any of that, if a phone or a tablet is to hand: open
it, and read the frame rate.
