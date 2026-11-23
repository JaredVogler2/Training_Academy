# Deployment

**Status: the owner has deployed it.** The repository is connected to a Vercel project, `training-academy`, by its
owner. Production is the `main` branch, at `https://training-academy-dun.vercel.app`.

- **What is live** is what `main` has: the map, the voice, and Number Garden with all seven of its activities.
  The other five worlds say they are not open. Checked on 2026-11-23, after the owner merged pull request #5:
  the sixteen smoke tests passed against that address in Chromium as a desktop and as a phone
  (`BASE_URL=https://training-academy-dun.vercel.app npx playwright test`) — the security headers, addresses at
  any depth, caching, the installable-app files, a missing file answered with a 404, and the game starting with
  no error, no warning and no request to anywhere else — and Number Garden's first activity, opened by a tap,
  fetched its six recordings from the site itself.
- **The other five worlds are not live.** They are on pull request
  [#6](https://github.com/JaredVogler2/Training_Academy/pull/6). Merging it publishes them, and that is
  the owner's decision: nothing was promoted, merged or changed in the Vercel project from a session like this
  one.
- **A preview of the pull request is built by Vercel**, at an address of its own behind Vercel's sign-in. It was
  not opened from a session like this one: reaching a protected preview from outside means putting a share link
  on the deployment, and that is the owner's to ask for. _If the preview is protected_, below, says how to run
  the smoke tests against it with a bypass secret.

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

| #   | Do                                                                                                                                                                     | It should                                                                                                                                               | If not                                                                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open the address                                                                                                                                                       | Show the front door within a few seconds: Glim, and six pictures                                                                                        | A notice about an old browser after 8 s means the device is too old                                                                                                                                                              |
| 2   | Tap a picture, with the sound switch in the top bar on                                                                                                                 | Play three rising notes on that very tap, and open the map                                                                                              | No sound at all: go to 3. Sound from the second tap only: note it                                                                                                                                                                |
| 3   | iPhone only: put the ring/silent switch to silent, reload, tap a picture                                                                                               | Still play                                                                                                                                              | Silent on silent is how it behaved before this phase; note the iOS version                                                                                                                                                       |
| 4   | Look at the map                                                                                                                                                        | Become 3D after a moment and move smoothly. Then hold "Grown-ups", open Diagnostics, and note Frames, Graphics tier, Scene                              | A still picture means the device was judged too weak, or 3D failed: note the reason shown                                                                                                                                        |
| 5   | Rest a finger on an island for two seconds, then on a picture inside an activity                                                                                       | Do nothing but lift the island: no menu, no "Open in new tab", no text selected, no "Save image"                                                        | Note what appeared, and on which system                                                                                                                                                                                          |
| 6   | Tap Number Garden, then Play                                                                                                                                           | Show Glim counting two snails and two leaves with a note for each; "My turn" arrives at the end                                                         |                                                                                                                                                                                                                                  |
| 7   | Play to the end, tapping one wrong choice on the way                                                                                                                   | Never show red or a cross; the wrong choice is counted and set aside; the end shows flowers and a way home                                              |                                                                                                                                                                                                                                  |
| 8   | In the middle of an activity, switch to another app for a few seconds and come back                                                                                    | Show "Paused"; "carry on" resumes, with sound                                                                                                           | No sound after coming back: note it                                                                                                                                                                                              |
| 9   | Turn the phone sideways on the front door, the map, the world page and inside an activity; an iPhone both ways round                                                   | Fit, with the one thing to do on the first screen and nothing under the notch or the home bar. On most phones the map becomes one row of islands        | Note the screen and what was cut off                                                                                                                                                                                             |
| 10  | Refresh in the middle of an activity                                                                                                                                   | Come back to the same step, with the same choices set aside                                                                                             |                                                                                                                                                                                                                                  |
| 11  | Add it to the home screen (Share → Add to Home Screen; Chrome's "Install app"), open it there                                                                          | Open without the browser's bars, and work the same. (On an iPhone the app on the home screen is expected to keep its own progress, apart from Safari's) |                                                                                                                                                                                                                                  |
| 12  | On Vercel only: open it once, switch to aeroplane mode, open it again                                                                                                  | Open, with progress kept                                                                                                                                | Offline needs HTTPS, so this cannot be tried from the local address                                                                                                                                                              |
| 13  | Hold the phone with a thumb resting on the edge of the screen (or lean a hand on a tablet) and, with the other hand, tap a picture at the door, an island and a choice | Answer every tap, once                                                                                                                                  | Nothing happens: note the system and the browser. On a desk, Chrome ignored such taps until this phase answered them; on an iPhone neither has been seen                                                                         |
| 14  | Press a choice slowly: hold it for about half a second, then lift                                                                                                      | Count, like a tap                                                                                                                                       | Nothing happens: a phone takes this for a long press, and the game's answer to that has never met a real one. Note the system and the browser. (Held for more than a second it is meant to do nothing: that is a finger resting) |
| 15  | Drag a finger down from the top of the map, and about inside an activity                                                                                               | Not reload the page, and not bounce                                                                                                                     | Note which, and the browser                                                                                                                                                                                                      |
| 16  | Put two fingers on the map and spread them, then try to get back                                                                                                       | Zoom: it is not prevented, on purpose                                                                                                                   | If a child's hand does it by accident and cannot undo it, say so: it can be switched off on the map and in an activity with one rule                                                                                             |
| 17  | Open an activity with the sound switch on, and listen to Glim                                                                                                          | Say what is written beside it, once, starting within a second of the picture; never two lines at once; stop when the pause button is pressed            | No voice at all: note the system. Late or cut off: note the connection. **Say how it sounds**: this is the first time anyone has heard it                                                                                        |
| 18  | Open Reading Cove with the sound switch off, then tap an activity                                                                                                      | Show one button, "Turn the sound on", and start when it is tapped                                                                                       | The activity starts in silence, or the button does nothing: note it                                                                                                                                                              |
| 19  | In Explorer Harbor, open "Which flag is on the water?" upright and sideways, and tap a flag                                                                            | Answer the flag that was tapped, every time, however small the map                                                                                      | A tap answers a different flag, or none: note the phone and which way up                                                                                                                                                         |
| 20  | In Robot Ridge, Memory Forest and Inventor Island, play one activity each to the end                                                                                   | Reach the end with nothing cut off, nothing too small to press, and nothing that needs reading                                                          | Note the activity, the step and the screen                                                                                                                                                                                       |
| 21  | Hold "Grown-ups", open "The voice: listen to every recording", and play some                                                                                           | Play each, and keep a mark of "sounds right" or "sounds wrong" after the page is closed and opened again                                                | This list is how the voice gets reviewed: the wrong ones are listed at the foot of it to send on                                                                                                                                 |

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
BASE_URL=https://<your-preview>.vercel.app npx playwright test
```

(In that mode only the specs tagged `@smoke` run, and no local server is started.) Or run the **Preview smoke test**
workflow from the Actions tab with the URL. They check:

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
