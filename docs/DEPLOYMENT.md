# Deployment

**Status: the owner has deployed it.** The repository is connected to a Vercel project, `training-academy`, by its
owner. Production is the `main` branch, at `https://training-academy-dun.vercel.app`.

- **What is live** is what `main` has: since 2026-11-23 all six worlds, and since 2026-11-25 the Music Lab as
  well (below). The six worlds went live when the owner merged pull
  request #5 (the map, the voice, Number Garden's seven activities) and then pull request
  [#6](https://github.com/JaredVogler2/Training_Academy/pull/6) (the other five worlds). Nothing was promoted,
  merged or changed in the Vercel project from a session like this one: a merge is the owner's decision, and
  Vercel deploys `main` when there is one.
- **What was checked on the live site**, a few minutes after the second merge, from the container this was
  built in, in Chromium:
  - Vercel's own record: the production deployment of the merge commit `0e836eb` is "Ready".
  - The service worker the site serves is, byte for byte, the one a local build of that commit makes. It names
    every file of the build by a hash of its contents, so what is live is the build that was tested.
  - Every world's page, opened by its address as a phone: 10, 7, 4, 6, 4 and 8 activities offered, 39 in all,
    each page with Play, and none saying it is not open.
  - The first activity of each of the five new worlds, opened by a tap as a phone: each started, and fetched
    its recordings from the site itself (each a 200 and `audio/mpeg`), with no error, no warning and no request
    to anywhere else.
  - 52 browser tests against the address (`BASE_URL=https://training-academy-dun.vercel.app npx playwright test
--project=desktop --project=phone --project=android`): the sixteen smoke tests as a desktop and as a phone —
    the security headers, addresses at any depth, caching, the installable-app files, a missing file answered
    with a 404, and the game starting with no error, no warning and no request to anywhere else — and the 36
    tests of the Pixel 7 screen, which play something in every world.
- **What that does not show.** It was a browser on a desk. Nobody has listened to a recording there, Safari's
  engine has never been pointed at the live address, and the whole suite runs against a local build of the same
  commit, not against the site.
- **Three faults were on the live site for two days, and are gone from it.** One tap on Glim took the first
  showing away from every later step of an activity; a tap before a showing was over took that showing away,
  and an order being shown could be tapped in its pauses; and a world's page opened by its own address showed
  nothing as finished. They were fixed in pull request #7, which the owner merged on 2026-11-25. **Checked on
  the live site a few minutes after that merge:** Vercel's record of the deployment of `71d66e0` said "Ready";
  the service worker the site served was byte for byte the one a local build of that commit makes; an
  activity finished there showed as finished on its world's page opened by its address; after one tap on Glim
  in "How many, at a glance" the next two steps still uncovered their groups; and the same 52 browser tests
  passed against the address.
- **The Music Lab went live on 2026-11-25**, when the owner merged pull request
  [#8](https://github.com/JaredVogler2/Training_Academy/pull/8) as it stood at its first commit: the seventh
  world and its six activities. What was pushed to that pull request afterwards was not in the merge, and went
  into pull request [#9](https://github.com/JaredVogler2/Training_Academy/pull/9): the room to play in, the
  documents, and a fix for phones held sideways. **Checked on the live site half an hour after the merge:** Vercel's record of the
  production deployment of the merge commit `765be14` said "Ready"; and of 56 browser tests run against the
  address as a desktop, a phone and a Pixel 7 (the smoke tests, and the Pixel's tests that play something in
  every world, the Music Lab's among them), 55 passed. The one that did not is the test of the Music Lab's room,
  which is not live yet: the test was ahead of the site, not the site at fault. (By accident the same was first
  run with no screens named, which runs every layout test on five more screen shapes against the site: 114
  passed and two failed before I stopped it at seven minutes, and both were that same test.) The update itself
  was **not rehearsed before this merge**; a new visit was checked afterwards, as above, and a returning
  player's update was not.
- **Number Garden's numerals, the Music Lab's room and four fixes went live on 2026-11-25**, when the owner
  merged pull request [#9](https://github.com/JaredVogler2/Training_Academy/pull/9), a quarter of a minute
  after the last of its checks went green. **The update had been rehearsed before that push** and passed, 18
  of 18, after it had first found a fault that would have reached children: an activity left half-way in
  Number Garden would have begun again from its first step (`docs/TEST_RESULTS.md` → _An update, rehearsed_).
  **Checked on the live site afterwards:** Vercel's record of the production deployment of the merge commit
  `dbbdbc3` said "Ready"; of 60 browser tests run against the address as a desktop, a phone and a Pixel 7 (the
  smoke tests, and the Pixel's tests that play something in every world), 60 passed, the Music Lab's room and
  four of Number Garden's new activities among them; Number Garden's page offers 18 activities and the Music
  Lab's has its way to the room; and CI's run on `main` was green in all seven jobs with no test run twice.
- **The two faults that were live on phones held sideways are gone from the site.** In Number Garden's "Which
  has more?", the two groups to choose between were a strip 48 pixels high (20 on the narrowest phones);
  measured on the live site after the merge they are 317 by 241 at 844×390 and 237 by 107 at 640×256. The
  other, Memory Forest's "Things that go together" with cards 49 pixels high on the narrowest phones, was
  fixed by the same change and was not measured on the site.
- **Reading Cove's six later activities went live on 2026-11-25**, when the owner merged pull request
  [#10](https://github.com/JaredVogler2/Training_Academy/pull/10), thirteen minutes after the last of its
  checks went green: rhyme, the beats of a word, building a word, sh ch th, words with those in them, and a
  sentence. With them, 25 recordings that had been live were replaced: the words said slowly, made again so
  that each says where its sounds begin. They are the same words, and each was heard by the recogniser as it
  was before; a phone that has the old ones keeps them until it has the new build. **The update had been
  rehearsed before that push** and passed, 18 of 18. **Checked on the live site two and a half hours after
  the merge:** Vercel's record of the production deployment of the merge commit `8288833` said "Ready"; of 65
  browser tests run against the address as a desktop, a phone and a Pixel 7 (that commit's own tests: the
  smoke tests, and the Pixel's tests that play something in every world), 65 passed, with the five that answer
  a rhyme, clap a word, build one, meet sh ch th and read a sentence among them; Reading Cove's page offers 16
  activities; "Read the sentence" is set on two lines on a phone held upright, its shortest word 18 pixels
  high on a phone 320 wide; and CI's run on `main` was green in all seven jobs with no test run twice.
- **The help for a first visit went live on 2026-11-26**, when the owner merged pull request
  [#11](https://github.com/JaredVogler2/Training_Academy/pull/11), four minutes after the last of its checks
  went green: "how to play", help when taps land on nothing, the switch a grown-up holds, and "where to
  begin". **The update had been rehearsed** before its first push and passed, 18 of 18; its second commit
  changed nothing a child sees and nothing that is stored. **Checked on the live site an hour and a half
  after the merge:** Vercel's record of the production deployment of the merge commit `ed3efd6` said "Ready";
  of 69 browser tests run against the address as a desktop, a phone and a Pixel 7 (that commit's own tests:
  the smoke tests, and the Pixel's tests that play something in every world), 69 passed, with "how to play"
  where the front door leads, each of its three things shown and then done, passed by and not shown again,
  and "where to begin" among them; and CI's run on `main` was green in all eight jobs, with two tests passing
  only at a second attempt (`docs/TEST_RESULTS.md` → _Run 45_).
- **Since then, some children are shown "how to play" at their next visit and some are not.** A player who
  has begun any activity is not: they know how. A player who has only ever chosen a picture, and anyone new,
  is, once; the house at the top left passes it by. Nothing is asked of the owner.
- **One small fault went live with it, and its fix is not live.** A child who passes "how to play" by with the
  house, and whose page is closed or loaded again in that same moment, is shown it again at the next visit:
  passing it by was written down as the page was left, where it should have been written first. Nothing is
  lost and nothing looks wrong. CI's tests met it four times in two runs, each time passing at a second
  attempt, which is how it was found.
- **What is on pull request [#12](https://github.com/JaredVogler2/Training_Academy/pull/12) is not live**: Robot Ridge's three later activities (a longer way,
  a long way round, wait for the bridge), the fix for the fault above, and whatever else that pull request
  gains. Its own description says how far it has got. The update from what is live (`ed3efd6`) to it was
  rehearsed on 2026-11-26 and passed, 18 of 18. It should be rehearsed again after anything more is added
  (_Before a release_, below).
- **There is one Vercel project for this repository: `training-academy`.** For two days there was a second,
  `voice`, rooted at `scripts/voice` and set up as a Python app. That folder is the offline tool that makes the
  recordings (`make_voice.py`, a `requirements.txt`, a README), and nothing in it is meant to be deployed. The
  project never built, and it put a failed check on every commit, `main`'s included, without touching the
  game. The owner deleted it on 2026-11-25. Its failed check stays on the commits it was put on. If
  that folder is ever offered as a project again, it is one to decline.
- **A preview of each pull request is built by Vercel**, at an address of its own behind Vercel's sign-in. None
  has been opened from a session like this one: reaching a protected preview from outside means putting a share
  link on the deployment, and that is the owner's to ask for. _If the preview is protected_, below, says how to
  run the smoke tests against it with a bypass secret.

**The requirement, since Phase 03: it must work on Android and iOS devices when deployed on Vercel.** The owner has
opened the live site on an iPhone, which is the first time this project has been seen on a real device. Nothing
has been played or heard there to my knowledge, and what is left to check on a device is the first thing below.

## Trying it on a real phone and tablet

The live site has been opened on an iPhone by its owner. Beyond that, "works on iOS and Android" is still a claim
about emulators and reasoning, and with a voice in the game there is now more to check by ear. There are two ways
to put a build on a phone; the second is the one that tests the real thing.

**On your own network, without deploying** (ten minutes; everything works except offline use, which browsers
switch off for a plain-HTTP address):

```bash
npm ci
```

```bash
npm run build
```

```bash
npx vite preview --host
```

Open the address it prints on a phone on the same Wi-Fi.

**On Vercel** (what the requirement is about). Connect the repository as described in the next section. Then note:

- A **preview** deployment is behind Vercel's login by default. A phone that is not signed in to Vercel sees a login
  page, not the game. Either sign in on the phone, or use a shareable link (Project → Settings → Deployment
  Protection), or switch protection off for previews of this project while testing.
- The **production** deployment (from `main`) has no such wall. It is also public. Pages carry `noindex`, and there
  is nothing on the site but the game, but it is a release in Vercel's sense and is the owner's call (Phase 16).

**What to do on the device, in order.** An iPhone, an iPad if there is one, and an Android phone; in Safari and
Chrome as they come. Each line is something this phase did that only a device can confirm.

| #   | Do                                                                                                                                                                     | It should                                                                                                                                                                                                              | If not                                                                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the address                                                                                                                                                       | Show the front door within a few seconds: Glim, and six pictures                                                                                                                                                       | A notice about an old browser after 8 s means the device is too old                                                                                                                                                              |
| 2   | Tap a picture, with the sound switch in the top bar on                                                                                                                 | Play three rising notes on that very tap, and open the map                                                                                                                                                             | No sound at all: go to 3. Sound from the second tap only: note it                                                                                                                                                                |
| 3   | iPhone only: put the ring/silent switch to silent, reload, tap a picture                                                                                               | Still play                                                                                                                                                                                                             | Silent on silent is how it behaved before this phase; note the iOS version                                                                                                                                                       |
| 4   | Look at the map                                                                                                                                                        | Become 3D after a moment and move smoothly. Then hold "Grown-ups", open Diagnostics, and note Frames, Graphics tier, Scene                                                                                             | A still picture means the device was judged too weak, or 3D failed: note the reason shown                                                                                                                                        |
| 5   | Rest a finger on an island for two seconds, then on a picture inside an activity                                                                                       | Do nothing but lift the island: no menu, no "Open in new tab", no text selected, no "Save image"                                                                                                                       | Note what appeared, and on which system                                                                                                                                                                                          |
| 6   | Tap Number Garden, then Play                                                                                                                                           | Show Glim counting two snails and two leaves with a note for each; "My turn" arrives at the end                                                                                                                        |                                                                                                                                                                                                                                  |
| 7   | Play to the end, tapping one wrong choice on the way                                                                                                                   | Never show red or a cross; the wrong choice is counted and set aside; the end shows flowers and a way home                                                                                                             |                                                                                                                                                                                                                                  |
| 8   | In the middle of an activity, switch to another app for a few seconds and come back                                                                                    | Show "Paused"; "carry on" resumes, with sound                                                                                                                                                                          | No sound after coming back: note it                                                                                                                                                                                              |
| 9   | Turn the phone sideways on the front door, the map, the world page and inside an activity; an iPhone both ways round                                                   | Fit, with the one thing to do on the first screen and nothing under the notch or the home bar. On most phones the map becomes one row of islands                                                                       | Note the screen and what was cut off                                                                                                                                                                                             |
| 10  | Refresh in the middle of an activity                                                                                                                                   | Come back to the same step, with the same choices set aside                                                                                                                                                            |                                                                                                                                                                                                                                  |
| 11  | Add it to the home screen (Share → Add to Home Screen; Chrome's "Install app"), open it there                                                                          | Open without the browser's bars, and work the same. (On an iPhone the app on the home screen is expected to keep its own progress, apart from Safari's)                                                                |                                                                                                                                                                                                                                  |
| 12  | On Vercel only: open it once, switch to aeroplane mode, open it again                                                                                                  | Open, with progress kept                                                                                                                                                                                               | Offline needs HTTPS, so this cannot be tried from the local address                                                                                                                                                              |
| 13  | Hold the phone with a thumb resting on the edge of the screen (or lean a hand on a tablet) and, with the other hand, tap a picture at the door, an island and a choice | Answer every tap, once                                                                                                                                                                                                 | Nothing happens: note the system and the browser. On a desk, Chrome ignored such taps until this phase answered them; on an iPhone neither has been seen                                                                         |
| 14  | Press a choice slowly: hold it for about half a second, then lift                                                                                                      | Count, like a tap                                                                                                                                                                                                      | Nothing happens: a phone takes this for a long press, and the game's answer to that has never met a real one. Note the system and the browser. (Held for more than a second it is meant to do nothing: that is a finger resting) |
| 15  | Drag a finger down from the top of the map, and about inside an activity                                                                                               | Not reload the page, and not bounce                                                                                                                                                                                    | Note which, and the browser                                                                                                                                                                                                      |
| 16  | Put two fingers on the map and spread them, then try to get back                                                                                                       | Zoom: it is not prevented, on purpose                                                                                                                                                                                  | If a child's hand does it by accident and cannot undo it, say so: it can be switched off on the map and in an activity with one rule                                                                                             |
| 17  | Open an activity with the sound switch on, and listen to Glim                                                                                                          | Say what is written beside it, once, starting within a second of the picture; never two lines at once; stop when the pause button is pressed                                                                           | No voice at all: note the system. Late or cut off: note the connection. **Say how it sounds**: this is the first time anyone has heard it                                                                                        |
| 18  | Open Reading Cove with the sound switch off, then tap an activity                                                                                                      | Show one button, "Turn the sound on", and start when it is tapped                                                                                                                                                      | The activity starts in silence, or the button does nothing: note it                                                                                                                                                              |
| 19  | In Explorer Harbor, open "Which flag is on the water?" upright and sideways, and tap a flag                                                                            | Answer the flag that was tapped, every time, however small the map                                                                                                                                                     | A tap answers a different flag, or none: note the phone and which way up                                                                                                                                                         |
| 20  | In Robot Ridge, Memory Forest and Inventor Island, play one activity each to the end                                                                                   | Reach the end with nothing cut off, nothing too small to press, and nothing that needs reading                                                                                                                         | Note the activity, the step and the screen                                                                                                                                                                                       |
| 21  | Hold "Grown-ups", open "The voice: listen to every recording", and play some                                                                                           | Play each, and keep a mark of "sounds right" or "sounds wrong" after the page is closed and opened again                                                                                                               | This list is how the voice gets reviewed: the wrong ones are listed at the foot of it to send on                                                                                                                                 |
| 22  | In Number Garden's "How many, at a glance", tap Glim once, answer, and go on                                                                                           | Uncover the next group for a look, as it did the first: a tap on Glim says the words again and takes nothing away                                                                                                      | The next group stays covered: the fix for it has not reached this device. Load the page again                                                                                                                                    |
| 23  | Finish an activity, then load its world's page again with the browser's own button                                                                                     | Still show the tick on it, and send Play to the next one                                                                                                                                                               | No tick, and Play at the first activity again: likewise                                                                                                                                                                          |
| 24  | In Memory Forest's "The same order", tap a card while the order is still being shown                                                                                   | Do nothing: no mark fills below the cards until the last light has gone out                                                                                                                                            | A mark fills, or the answer is taken early: note the phone                                                                                                                                                                       |
| 25  | Tap the lighthouse on the map                                                                                                                                          | Open the Music Lab. (On a phone held sideways, where the places stand in one row, the lighthouse has no name under it and is still the way in)                                                                         | The lighthouse has been a button since the Music Lab was put in it                                                                                                                                                               |
| 26  | In the Music Lab, tap _Just play_, and play the eight bars from left to right, then the drum                                                                           | Sound at once on each touch, not when the finger lifts: a scale climbing from a low note to the same note higher, each like a small struck bar; the drum a soft low knock that can be heard on the phone's own speaker | **Nobody has heard these.** They are made by arithmetic as they are played (`strokeOf`, `src/audio/audioEngine.ts`), and a phone's speaker gives little below middle C                                                           |
| 27  | In _Just play_, start the beat and tap the drum along with it                                                                                                          | Click steadily, with the four lights taking turns exactly with the clicks, not ahead of them or behind                                                                                                                 | The click is put on the audio's clock and the light on the page's, with the browser's own figure for how late its sound is heard between them. On a Bluetooth speaker that figure is large                                       |
| 28  | Play _Tapping with the beat_, tapping as steadily in time as you can; then again, tapping at random                                                                    | Say "Yes. You kept the beat." the first time, on every phone, and not the second                                                                                                                                       | The allowance for a late speaker and a late screen is worked out from the taps themselves. Whether it is right for a real phone, and for a child, has not been tried                                                             |
| 29  | Play _High and low_ to the end                                                                                                                                         | Play each note while the bar or bird that makes it is lifted, take no tap until both have sounded, and play it all again when Glim is tapped                                                                           | Three of the Music Lab's activities are nothing but listening                                                                                                                                                                    |
| 30  | With the sound switch off, open the Music Lab's _Tapping with the beat_, then _High and low_                                                                           | Let the beat be played by eye, by its lights; and show one button, "Turn the sound on", for the other                                                                                                                  | A beat that is lit needs no sound; a question that is only heard does                                                                                                                                                            |
| 31  | On a phone held sideways, open Number Garden's "Which has more?"                                                                                                       | Show the two groups filling the height of the screen                                                                                                                                                                   | They were a strip a finger's width high until pull request #9 (not merged when this was written)                                                                                                                                 |
| 32  | In a private window, so that nobody has played: open the address and tap a picture                                                                                     | Go to "how to play". Glim says "Let me show you how to play", a hand taps the sun that is the same, and then it is the child's turn. **Listen for one line running into the next**: none should                        |
| 33  | In "how to play": tap a picture while Glim is still showing; and tap the tick before both pictures are in their places                                                 | Do nothing, both times                                                                                                                                                                                                 |
| 34  | In any activity, tap the picture that is asked about three times quickly, instead of an answer                                                                         | Ring every answer in yellow for a few seconds, write "Tap one of these." where Glim's words are, and say it once                                                                                                       |
| 35  | Pause an activity. Tap the grown-up's mark; then hold a finger on it for a second and a half                                                                           | Do nothing at the tap. Switch on at the hold, say so in words, and show the mark on the pause button afterwards                                                                                                        |
| 36  | Hold "Grown-ups", find "Where … begins", say that five things have been counted, take what is suggested, and open Number Garden                                        | Offer "Counting to five, then ten" (its second part) on Play, with every activity still on the page and none ticked                                                                                                    |

Anything that does not do what the middle column says is a fault to fix, and the notes above are what makes it
quick to find.

The app is a static site: `npm run build` writes `dist/`, and that folder is the whole product. No server code, no
environment variables, no secrets.

## Connecting the repository to Vercel (done by the owner; kept for reference)

1. Vercel dashboard → **Add New… → Project** → import `JaredVogler2/Training_Academy`.
2. Accept what `vercel.json` already states:

   | Setting               | Value                                      |
   | --------------------- | ------------------------------------------ |
   | Framework preset      | Vite                                       |
   | Install command       | `npm ci`                                   |
   | Build command         | `npm run build` (type-checks, then builds) |
   | Output directory      | `dist`                                     |
   | Root directory        | the repository root                        |
   | Node.js version       | 22.x (from `engines` in `package.json`)    |
   | Environment variables | none                                       |

3. Production branch: `main`. Every other branch and pull request gets a preview deployment.
4. Recommended project settings for this product:
   - **Switch the Vercel Toolbar off** (Project → Settings, or set `VERCEL_PREVIEW_FEEDBACK_ENABLED=0` for Preview).
     It is a third-party script from `vercel.live`; this site's Content-Security-Policy refuses it, and a children's
     product should not be loading a collaboration widget in any case.
   - Leave **Web Analytics** and **Speed Insights** off. The game sends nothing anywhere by design.
   - Keep **Deployment Protection** on for previews.

Production follows `main`, so merging a pull request is a release. Phase 16's checklist for a public release has
not been worked through; until it has, treat the live site as the owner's own preview of the game.

## What `vercel.json` does

- **One rewrite** — `/((?!immutable/|assets/).*)` → `/index.html`. Page addresses (`/world/number-garden`,
  `/grown-ups`, …) open the app at any depth and survive a refresh. A request for a file that does not exist under
  `/immutable/` or `/assets/` is a 404 instead of the app's HTML, which is what lets the game say "this part could not
  be loaded" after a new deployment has replaced the chunk an open page was about to fetch.
- **Cache rules** — `/immutable/*` (everything Vite emits, content-hashed) is cached for a year and marked immutable.
  `/sw.js` is never cached. Everything else uses Vercel's default for static files (revalidate every time).
- **Security headers** on every response — a Content-Security-Policy limited to this origin with no inline script or
  style; `Permissions-Policy` switching off camera, microphone, geolocation, payment, USB, MIDI, screen capture and
  topics; `Referrer-Policy: no-referrer`; `X-Content-Type-Options: nosniff`; `X-Frame-Options: DENY`;
  `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy: same-origin`.

If a later phase needs something the policy forbids (for example `blob:` in `connect-src` for a model loader, or the
microphone for a parent-enabled speech activity), change the header deliberately and say why in the commit.

## How this was tested without Vercel

`vite preview` (and so every browser test) serves `dist/` through `scripts/vite/vercel-parity.ts`, which compiles
`vercel.json` with Vercel's own route compiler (`@vercel/routing-utils`) and applies the result: the same headers,
the same rewrite, the same 404s. `tests/config/vercel.test.ts` checks the routing table directly. This is a faithful
model of the documented behaviour, not Vercel's edge network.

## What a first preview must confirm

Run the smoke tests against the preview URL:

```bash
BASE_URL=https://<your-preview>.vercel.app npx playwright test --project=desktop --project=phone
```

(With an address given, no local server is started, and those two screens run only the specs tagged `@smoke`.
Name the screens: the others keep their own choice of tests whatever the address, so the command without
`--project` runs some two hundred layout tests against the deployment as well, and takes ten minutes.) Or run the
**Preview smoke test** workflow from the Actions tab with the URL. They check:

| Check                                                                   | Why it needs the real thing                                                                         |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Vercel accepts the rewrite pattern and deep links return the app        | The pattern was compiled with Vercel's library, but only a deployment proves the platform takes it. |
| The security headers arrive as written                                  | Platform defaults or project settings could add to or override them.                                |
| `/immutable/*` is `immutable`, `/sw.js` and the page are `max-age=0`    | Same.                                                                                               |
| A missing `/immutable/` file is a 404 and not HTML                      | Same.                                                                                               |
| The game starts with no console errors and no request to another origin | The Vercel Toolbar, analytics or other injected scripts would show up here.                         |

Also check by hand, once: the manifest's content type, that the site installs to a phone's home screen, and that it
opens offline after one visit.

### If the preview is protected

Preview deployments are behind Vercel's Deployment Protection by default, so an automated browser sees a login page.
Create a **Protection Bypass for Automation** secret (Project → Settings → Deployment Protection) and provide it:

```bash
VERCEL_AUTOMATION_BYPASS_SECRET=… BASE_URL=https://… npx playwright test
```

For the workflow, add it to the GitHub repository as the secret `VERCEL_AUTOMATION_BYPASS_SECRET`. It is sent as the
`x-vercel-protection-bypass` header and is never written to the logs.

### Automatic smoke tests after each deployment

`.github/workflows/preview-smoke.yml` listens for Vercel's `vercel.deployment.success` event
(`repository_dispatch`). For that to fire: the repository must be connected to the Vercel project through the Vercel
GitHub integration, and the workflow file must be on the default branch (so it starts working after this pull request
is merged).

## Before a release: rehearse the update

Every browser test starts from an empty browser and one build. A phone that already has the game does not: it
has the old build's service worker, what the child has done, perhaps an activity left half-way, perhaps a tab
left open. What happens when the next build arrives at the same address is rehearsed with:

```bash
npm run rehearse:update -- origin/main
```

Give it the commit that is live. It builds that commit in a scratch checkout and this tree beside it, serves
the old one, plays on it as a phone, leaves one activity half-way and two more tabs open, then serves the new
one at the same address, as a deployment does, and checks eighteen things: the open tabs carry on; a tab that
asks for a part it never fetched says so and offers to load the page again; the site opened again is the new
build at once; a world's page still shows what was finished and Play goes on from there; the half-finished
activity is taken up where it was left; nothing stored has gone; with the old tabs closed the new worker takes
over and clears the old build out; and what was opened then opens with no connection.

It rebuilds `dist/`, so do not run it while the browser tests are running. It runs in Chromium, the one engine
in which a service worker and the network can be driven together: it shows that the update is sound, not how
Safari on a phone times it. The first time it was run, from the build before the six worlds to the six worlds,
it found a fault that had been live since Phase 03 (`docs/TEST_RESULTS.md` → _An update, rehearsed_).

**What a phone that has the old version does, and what to tell someone who still sees it.** A page that is
loaded gets the new build at once, if the phone is online: pages are fetched from the network first. A tab
that was simply left open is still the old build until it is loaded again, and so is a copy on the home screen
that the phone kept in memory. Nothing in the game says "there is a new version" yet (`docs/PROGRESS.md` →
_Known gaps_), and pulling the page down does not reload it, on purpose. So: reload the tab, or close the
home-screen copy from the app switcher and open it again. An old tab that asks for something the new build no
longer has says "This part could not be loaded" and offers to load the page again, which brings the new build.

## The service worker: updates, rollback, and how to remove it

- **Update.** Each build's `sw.js` differs exactly when its files do. A device online gets the new page straight away
  (pages are network-first); the new worker installs in the background and takes over once the old tabs are closed,
  then deletes what the new build no longer contains.
- **Rollback.** Promote the previous deployment in Vercel. Its `sw.js` is "new" again to devices that had moved on,
  and the same update path applies in reverse.
- **Removal.** If the worker ever has to go, deploy this as `public/sw.js` (and stop generating one) so that existing
  installs clean up after themselves:

  ```js
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      (async () => {
        for (const name of await caches.keys()) await caches.delete(name);
        await self.registration.unregister();
        for (const client of await self.clients.matchAll()) client.navigate(client.url);
      })(),
    );
  });
  ```

## Before any public release (later phases)

- Phase 14: review the children's-privacy obligations that apply (including COPPA where relevant). The design is
  local-only, which helps, but does not replace that review.
- Phase 16: the release checklist, a verified preview, and explicit approval before production.
- Pin the GitHub Actions in `.github/workflows` to commit SHAs.
