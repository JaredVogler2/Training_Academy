# Quality report

This file has three parts. The first is the review of the six worlds and the voice (phases 04 to 10). The second is
Phase 03's review of what Phase 03 built. The third is Phase 02's report on the home screen, kept as it was
written, because it is still the assessment of the hub.

All are written to be useful to whoever works on this next, not to make the build look good. The ratings are my own
reading of screenshots and of the running game in headless Chromium. Nobody else has reviewed it, no child has
played it, **no person has listened to the voice**, and it has never run on a real graphics card. The owner has
opened the live site (Phase 03) on an iPhone; nothing in this file comes from a device. The standard it is rated
against is `docs/ART_DIRECTION.md`.

## Phases 04 to 10 (2026-11-23): six worlds and a voice

### Summary

Every island now has something to do, and the game talks. There are 39 activities, of eleven kinds: choosing a
picture, giving an amount, picking things out, repeating an order, finding pairs, putting a story in order,
steering a robot, mending a row of steps, guessing what will happen, mending a thing on a bench, and answering on
a map. Each is shown first, then tried with help at hand, then tried alone.

It is a first pass through each world, not a finished one. Two things matter more than everything below them.
**The voice is a synthesiser's, and nobody has heard it**; in a world that teaches sounds that is not a detail.
And **the activities have been played only by tests and by me**: every one can be finished, every answer is
checked to be the one right answer, and whether any of them teaches a four-year-old anything is not known.

### How it was made, which bears on how far to trust it

Number Garden's new activities, Reading Cove, Memory Forest and Explorer Harbor were written in one working
tree, looked at in a browser at several sizes as they were built, and changed where they looked or behaved
wrong. Robot Ridge and Inventor Island were written at the same time by two agents working in copies of the
repository, to a brief and to the same frame. Their reports were read, their commits merged, their tests run
with everything else, and a few of their screens looked at. **Their code was not read line by line**, and their
worlds have had less of a second pair of eyes than the other four.

### The review

Looked at in the running production build at 390×844, 640×256 and 1366×768, as each board was built; and
captured again at the end at 390×844 and 844×390: `docs/review/worlds/`, 57 pictures. 1 = poor,
3 = acceptable, 5 = excellent.

| Category             | Reading Cove | Number Garden | Robot Ridge | Memory Forest | Inventor Island | Explorer Harbor | Why                                                                                                                                                                                        |
| -------------------- | :----------: | :-----------: | :---------: | :-----------: | :-------------: | :-------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Composition          |      4       |       4       |      4      |       4       |        4        |       3.5       | One board, one thing to do. A map is a fixed shape and leaves a tall phone half empty; so, less so, does the robot's ground.                                                               |
| Craft and materials  |     3.5      |       4       |      4      |      3.5      |        4        |       3.5       | The same paper, lips and radii as Phase 03. The pictures are plain flat drawings, clear and consistent, and no more than that: 57 in the kit, 37 for stories, each world's own besides.    |
| Cohesive palette     |      4       |      4.5      |      4      |       4       |        4        |        4        | Sun is still "this way". The story pictures bring their own skies and grounds, which is more colour on one screen than anywhere else.                                                      |
| Liveliness           |     3.5      |       4       |      4      |      3.5      |        4        |       3.5       | Things hop when counted, a robot drives, a bridge sags, a boat sails. A picture that is named lifts; a story told back lifts each picture in turn. There are no page turns and no scenery. |
| Interface legibility |      4       |      4.5      |      4      |       4       |        4        |        4        | Every control a child presses is 56 points or more on every screen tested, down to 640×256, where a map is only 170 points wide and its three places are a third of it each.               |
| Motion quality       |      4       |       4       |      4      |       4       |        4        |        4        | One thing moves at a time, and everything works with motion reduced. Seen in a browser at speed; not on a device.                                                                          |
| The voice            |      —       |       —       |      —      |       —       |        —        |        —        | **Not rated.** Nobody has listened.                                                                                                                                                        |
| Child comprehension  |      —       |       —       |      —      |       —       |        —        |        —        | **Not rated.** No child has seen it.                                                                                                                                                       |

Nothing here is rated 5, and the ratings for Robot Ridge and Inventor Island rest on fewer screens than the others.

### Seen — cause — fix

| Seen                                                                                                                                                                                     | Cause                                                                                                                                  | Fix                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| After one recording failed to download, that line was never said again in the visit                                                                                                      | A failed download was remembered the same way as a file that could not be decoded                                                      | Only a file that will not decode is remembered; a failed download is tried again                                                                                                                 |
| The cards to answer with could be seen while the things to remember were still on show                                                                                                   | The board drew both at once                                                                                                            | Cards are blank until what was shown is put away                                                                                                                                                 |
| What was "covered" could be read from the page by any tool                                                                                                                               | It was hidden by a style, and still in the page                                                                                        | What is covered is not rendered at all; tests look for it and must not find it                                                                                                                   |
| Asking to be told again uncovered a group that was to be taken in at a glance                                                                                                            | "Again" replayed the whole showing                                                                                                     | It says the words again and uncovers nothing; another look is help                                                                                                                               |
| The button that turns the sound on could not be pressed by a test, and jumped under a finger                                                                                             | It pulsed, and so was never still                                                                                                      | A still button with a pulsing ring behind it                                                                                                                                                     |
| On the flattest phone the things to repeat ran off the screen                                                                                                                            | A rule that centred a list also let it grow                                                                                            | Only the marks are centred                                                                                                                                                                       |
| A picture made its card taller than the screen                                                                                                                                           | A square picture set the height of the card it was in                                                                                  | Every card is one cell that the picture is fitted into                                                                                                                                           |
| On the flattest phone a place on a map was 41 points across                                                                                                                              | A place was a fixed share of the map, and the map there is 170 points wide                                                             | A place is never under 56 points, and every map was made again with places a third of a map apart                                                                                                |
| On the flattest phone the three pictures of a story were 34 points each                                                                                                                  | A question got a third of the width whatever it held                                                                                   | A strip of three pictures gets as much room as its three answers                                                                                                                                 |
| "That is the whole story" was written under a story before it had been told                                                                                                              | What is said of a right answer is shown at once, and the telling came after                                                            | The line is "Yes. Here is the whole story.", said first; then the story, each picture with its line                                                                                              |
| On a tall phone a story's pictures were small in tall empty cards                                                                                                                        | Two rows each took half the screen                                                                                                     | A card is no taller than a picture needs; the two rows keep together                                                                                                                             |
| At 640×256 the parts on a workbench were 50 points high (found by the agent's own test)                                                                                                  | Two rows of parts                                                                                                                      | Under 300 points of height the parts stand in one row                                                                                                                                            |
| On a world's page held sideways, the line under its name failed the contrast check                                                                                                       | It shrinks there to a size at which the world's colour is too pale                                                                     | In ink at that size. Found by an agent's check; no test ran that page sideways, and one does now                                                                                                 |
| The grown-ups' list of skills was 44 lines with no order to them                                                                                                                         | One list for every world                                                                                                               | Grouped under each world's name                                                                                                                                                                  |
| In a question where things are looked at and then hidden, the choices could be tapped before anything had been shown, and what would be asked was already standing in front of the cover | The board had one state for "not yet looked at" and "looked at and covered", and while the voice said "Look who has what" it was in it | Until the look has happened the choices are turned away and what will be asked is held back. Found because a WebKit test in CI passed only at its second attempt: its tap had fallen in that gap |
| Lines were heard by the recogniser as other words: eight in the last three worlds made ("chick" as "check", "sagged" as "sad")                                                           | A synthesiser's pronunciation, or the recogniser's ear: there is no telling which without listening                                    | Each was reworded until it was heard as written. "Nut" could not be, and is no longer a word to learn                                                                                            |

### After they went live (2026-11-25)

The six worlds were merged and deployed on 2026-11-23. Two things done afterwards found faults that the review
above and 656 browser tests had not: rehearsing an update in a browser that already had the game, and reading a
CI run that had passed with four of its tests needing a second attempt. All five are fixed in the pull request
after #6, each with a test that fails on the code as it was. Until that is merged they are on the live site.

| Seen                                                                                                                                                                                                                    | Cause                                                                                                                                                                      | Fix                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| After one tap on Glim, nothing was shown first for the rest of the activity: a group to glance at stayed covered, an order was never lit, a pattern of sounds was never played, and the question was asked all the same | Asking again was remembered by the board, and a board stays on the screen from step to step. Every later step was taken for a second telling, which leaves the showing out | It is kept by step, like everything else a board remembers                                    |
| A tap on Glim while the words before a look were being said, or in the middle of a look or of an order, took the look or the order away for that step                                                                   | "Again" meant "leave out the showing", whether or not there had been one                                                                                                   | An asking that comes before the showing is over starts the step again, with the showing in it |
| While an order was being shown, a card could be tapped in the pause after each light, and before the first                                                                                                              | The cards were closed only while one of them was lit                                                                                                                       | They are closed from the moment the question arrives until the last light has gone out        |
| A world's page that was loaded again, or that a phone had brought back, showed nothing as finished, and Play went back to the first activity                                                                            | The page shows what the player has finished and never asked who the player was; the map had always asked before it                                                         | Whatever shows what is finished asks who is playing, if nobody has                            |
| The place to take one back was a different button each time the board counted                                                                                                                                           | The button was made afresh so that the counting would start from the first thing                                                                                           | What hops is made afresh, inside a button that stays where it is                              |

**What this says about the review above.** The first of these is the kind of fault a child finds in a minute:
children tap the character. No test had tapped Glim and then gone on to the next step, and I had not either.
Nearly every test plays one step as if it were the first, in a browser that has never seen the game, on one
build. Everything in this table needed two of something: a tap in one step and a look in the next, a page opened
a second time, one build and then another. There are probably more faults of that shape, and only some were
looked for.

### What is still wrong or weak

1. **Nobody has listened to the voice.** 395 recordings by one synthesised American voice. A recogniser heard
   each as its words (13 single words only inside a sentence). Whether it sounds kind, clear and right to a child
   is unknown, and for Reading Cove it is the whole lesson.
2. **Reading Cove teaches no sound on its own.** A letter is met through two key words with their first sound
   drawn out. That was chosen because a synthesiser cannot be trusted to say /s/ or /t/ alone, and a wrong model
   is worse than none. It is not how most phonics teaching goes, and a reading teacher may well want it changed.
3. **Reading Cove cannot be played without sound.** It says so and offers to turn it on. A child who cannot hear
   has five worlds, not six.
4. **No child and no teacher has seen any of it.**
5. **The pictures are plain.** They are consistent and nothing in them can be miscounted or misread that I could
   see, but they are simple flat drawings made quickly, and a few are thin (a dry path is mostly sky). The
   briefs ask for illustration of a higher order than this.
6. **A story is told back by lifting its pictures.** The brief asked for a storybook with page turns.
7. **A tall phone is half empty on a map**, and on the robot's ground: both keep their shape and are as wide as
   the screen. Nothing was drawn to fill the rest.
8. **On the flattest phone a map is very small** (170 by 110 points). Its places can be pressed; whether they can
   be read is another matter.
9. **An activity soon repeats.** A sitting draws three or four challenges from a pool of five to eight.
10. **Robot Ridge and Inventor Island have been looked at less** (above).
11. **The toy models are toys.** A bridge holds or sags by a table. Nothing says so to the grown-up except the
    activity's note; the limits are comments in `src/engine/models.ts`.
12. **A world's page is long on a phone**: Reading Cove has ten activities, each a card.
13. **There is no way to turn the voice off and keep the other sounds**, no volume, and no choice of voice.
14. **The recordings are fetched when first wanted.** The first sitting of an activity needs a connection for
    its lines; after that the service worker has them. A line that arrives too late is not said.
15. **Glim points at the next thing not yet finished, and nothing is locked.** A child can open blending before
    hearing a first sound. Whether that matters is for someone who has watched a child.
16. **The tests mostly try one step, one visit and one build at a time** (above). An update is now rehearsed
    before a release, and a few tests carry something from one step into the next; most still do not.
17. Everything in Phase 03's list below that is not about the voice or the number of worlds still stands.

## Phase 03 (2026-11-23): the journey in, and the activity

### Summary

A visit now has a beginning, a middle and an end. It opens on a front door where a child says who is playing by
tapping a picture; the map behind it comes alive; one island leads, through a page that shows what is done there,
into an activity that Glim demonstrates, helps with, and ends calmly; and the way out is the way home at any point.
The activity screen, which Phase 02 left below 4 in most categories, is now the same paper-on-water world as the
rest.

What this phase could not do is put it on a phone. The requirement added for it — that it work on Android and iOS
devices on a Vercel deployment — was met as far as code, emulation and reasoning go, and no further: see _Phones_,
below. A second look, made after this report was first written, found three faults that the emulated devices had
passed and that a child with a real phone would have met in the first minute. They are fixed, and are in _A
second look, with a phone in mind_.

### The review

Captured from the running production build with `npm run screens` at 390×844, 844×390, 768×1024, 1366×768 and
360×740, and at 750×342 (what Safari leaves a page on an iPhone held sideways): rated, changed, captured and rated
again. Six pictures of round one are in `docs/review/phase-03/round-1/`; round two is 85 pictures in
`docs/review/phase-03/`, among them 21 click maps and three tooltips. The second look added 16 beside them (two
more click maps, and fourteen whose names begin `phones-`), and three of how things were before it in
`phones-before/`.

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

### A second look, with a phone in mind

The devices named in the browser tests are a screen size, a pixel ratio, touch and a user agent on a desktop
engine. After the documents for this phase were written I went through the new screens again, asking what a phone
does that those profiles do not. It has a notch. Its browser keeps bars of its own, so a page gets much less of a
sideways screen than the size of the screen suggests. And the hand on it has more than one finger. Each of the
three hid a fault. None could be seen with the profiles, so each was put to the page another way, and that way is
now a test that fails on the code as it was.

| Seen                                                                                                                                                            | Cause                                                                                                                                                                                                                                                              | Fix                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **With a thumb resting anywhere on the screen, nothing a child tapped did anything**                                                                            | A browser answers a tap only while it is the one finger on the screen. Sent through Chromium's own touch handling, which Chrome on Android shares, a tap beside a resting finger — or one during which another finger lands — produces no click at all, every time | A short press that begins and ends on one thing while another finger is down is answered once, with the click the browser did not make (`src/app/touch.ts`). One finger alone is left to the browser. **Shown in Chromium; not tried on a phone, and not at all on iOS** |
| **On a common Android phone held sideways the islands were 70 pixels wide, their tap areas overlapped and their names ran into one another** (`phones-before/`) | Such a phone is 360 pixels high that way round, and its status bar and Chrome's own bar leave a page about 264 to 280 of them — not the 342 to 360 the profiles have. The game's bar takes 52 more, and the low ring of islands is three rows deep                 | On a very flat screen the seven places stand side by side in one row, Glim moored in front of the lighthouse: islands 101 pixels wide at 800×264 and 81 at 640×256, none touching, and a name that does not fit on a line takes two                                      |
| **On an iPhone held sideways a world's page had its way back, its picture and its example under the margin the notch needs**, by 35 pixels                      | The reading pages were centred between the gutters alone. The top bar, the map and the activity already kept clear                                                                                                                                                 | A page's side margin is the gutter and the worse of the two notch margins (`--side`)                                                                                                                                                                                     |
| _Reading the stylesheet:_ the page could bounce, and a pull could reload it, in a browser that takes that from the root element                                 | It was declared on the body only; the specification's own example puts it on the root                                                                                                                                                                              | Declared on both                                                                                                                                                                                                                                                         |
| _Reading the stylesheet:_ two quick taps between things could zoom the page                                                                                     | Only buttons and links declined a double-tap zoom                                                                                                                                                                                                                  | The whole page declines it. Two fingers still zoom                                                                                                                                                                                                                       |
| **On the flattest screens the end of an activity lay under the way home and ran 28 pixels past the bottom**                                                     | Its card kept the wide margins and the large picture of a taller screen                                                                                                                                                                                            | Below 320 pixels of height it gives them up. The browser test of a flat screen now plays an activity to its end                                                                                                                                                          |
| _Knowing what a phone does with a long press:_ a slow, hard press — a small child's — would get no answer                                                       | A phone's browser takes a press held for more than about four tenths of a second for a long press, and answers that with a menu of its own or with nothing: never a click. A browser on a desk does click, so this could not be seen to fail here                  | A press of up to a second that ends where it began is answered in the same way as a tap made beside a resting finger. **Unit-tested only; not seen on a phone either way**                                                                                               |

The profile of an iPhone held sideways (750×342) was itself part of why the third was missed. It is the part of
the screen _inside_ the notch's margins, which is what a page gets that has asked for nothing more. This game
asks for the whole screen, so on the phone it is 844 wide and is told to keep 47 pixels clear at each end. The
tests now give a page those margins, through the four custom properties every rule reads them from.

What the second look could not settle is in _What is still wrong or weak_, items 2 to 5.

### Phones: what was done, and what only a phone can tell

| Done in this phase                                                                                                             | How it was checked                                                                                                                                                         | What only a device can tell                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The first tap of a visit is on the front door, and its sound waits for the audio to wake                                       | Unit tests on the audio engine with a context that wakes late                                                                                                              | Whether the hello is heard on an iPhone and on an Android phone                                                                                                                          |
| While sound is on, Safari is asked to treat the game as media, so the ring/silent switch does not mute it                      | A unit test that the request is made, and survives a browser that refuses it                                                                                               | Whether an iPhone on silent plays the sounds; whether that is what a family wants                                                                                                        |
| Coming back from another app meets the pause sheet, whose tap wakes the audio again                                            | Read from the code; pausing itself is tested in a browser                                                                                                                  | Whether sound returns after a call or a switch of apps                                                                                                                                   |
| A resting finger selects nothing, gets no iOS call-out, and opens no Android menu                                              | Unit tests on the guard; the styles are read, not tested                                                                                                                   | All of it. A long press on an island and on a picture in an activity, on both systems                                                                                                    |
| Every screen fits what a phone's browser really leaves a page, upright and sideways                                            | Twenty-five screens by arithmetic, seven of them phones held sideways as they really are; browser tests as a Pixel 7, an iPhone 13 and an iPad, and at 800×264 and 640×256 | What height a given phone really leaves; the toolbar that comes and goes; rotation                                                                                                       |
| Every screen keeps clear of a notch and a home bar                                                                             | A browser test on all twelve projects, with the margins given to the page through the properties its rules read them from                                                  | Whether a phone's margins are those; a Dynamic Island; the phone turned the other way                                                                                                    |
| A tap counts while another finger rests on the screen, and so does a slow press                                                | Eighteen unit tests; a browser test that sends two-finger sequences and a slow press through Chromium's own touch handling                                                 | Everything on iOS: whether Safari ignores such a tap, and whether this answers it there. A palm. Whether a phone really leaves a slow press unanswered, and whether this then answers it |
| On a very flat screen the map is one row of islands                                                                            | Arithmetic; browser tests at two sizes: size, nothing touching, names whole, Play and the first question on the first screen                                               | How it sits in a hand                                                                                                                                                                    |
| The page does not bounce, reload on a pull, or zoom on two quick taps                                                          | The declarations are read back in a browser test                                                                                                                           | All of it: these are gestures, and no test here makes them                                                                                                                               |
| A browser too old to run the game says so after eight seconds, instead of showing nothing                                      | Read from the page; not tested in an old browser                                                                                                                           | What an old iPad actually shows                                                                                                                                                          |
| Nothing new needs the network, a login or a key; the Vercel configuration is unchanged from the one tested in Phases 01 and 02 | The same header, routing and service-worker tests as before                                                                                                                | A deployment. **Nothing has been deployed.**                                                                                                                                             |

The emulated devices are the right screen, pixel ratio, touch and user agent on desktop engines. They found one
real thing (Play below the first screen on a sideways phone). They could not find the three faults of the second
look, and nothing here can find anything about sound or a GPU.

### What is still wrong or weak

1. **No phone or tablet has run it.** Everything in the right-hand column above.
2. **The answer to a tap made beside a resting finger has only been shown in Chromium.** If Safari on an iPhone
   ignores such taps as well, the same code should answer them, and it is written so that it can only add a click
   where the browser gave none. Neither half of that sentence has been tried on an iPhone.
3. **The answer to a slow press has never met the fault it answers.** A press held for more than about four
   tenths of a second is a long press to a phone's browser, which then makes no click when the finger lifts.
   Chromium on a desk does click, so the fault could not be reproduced here and its answer could only be
   unit-tested. A press held for more than a second still does nothing, on purpose: that is a finger resting.
4. **On the narrowest phones held sideways an island is under 96 pixels wide**: 81 by 103 at 640×256, and 90 by
   112 on an iPhone 13 mini. Seven places do not fit side by side any larger. Everywhere else it is 96 or more.
5. **Two fingers can still zoom the page**, on purpose: anyone who needs it larger can have it. A small child's
   two fingers can therefore zoom the map by accident, and must pinch it back. Whether to forbid that on the map
   and in an activity is for someone who has watched a child use it; it is one rule in the stylesheet.
6. **No child has seen it.** Whether a four-year-old taps a picture at the door, finds the island with the sun
   tag, watches the demonstration, and knows that Glim will show it again, is untested.
7. **Glim still has no voice.** "Show me again" replays what was shown and its notes. An instruction in words exists
   only as the caption for the grown-up. Phase 04.
8. **One activity, in one world.** The frame is built for every world and has been used by one.
9. **Travelling is a fade.** Tapping an island still does not take the child there; the page arrives softly and
   shows the same island. A journey across the water was not built.
10. **On a wide screen the activity's cards are bigger than their pictures need.** Legible; not handsome.
11. **The world page is mostly for the grown-up.** For the child it is one picture and one sun button, which is
    enough, but everything below the first screen is text.
12. **Leaving the tab pauses the activity.** Right for a phone; on a desktop, coming back to a "Paused" sheet
    after glancing at another tab may be more than was wanted.
13. **A browser test that follows a 3D test still waits for it in CI** (up to 44.5 of its 60 seconds, in Phase
    02's runs). Not fixed in this phase; `docs/PROGRESS.md` → _Known gaps_.
14. **Twice in CI a page load in WebKit has waited a whole minute**, and passed at once at its second attempt. It
    is not explained. A test that runs out of time now reports what it was still waiting for
    (`docs/TEST_RESULTS.md` → _Continuous integration_).
15. **In a row, the map has no boats, rocks or clouds.** The islands take the whole width; the sea still moves.
16. Everything in Phase 02's list below that is about the hub still stands.

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
