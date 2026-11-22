# Deployment

**Status: not deployed.** Nothing in this repository has been published to Vercel, and no Vercel project is
connected to it (checked against the owner's Vercel team on 2026-11-22: no project links to
`JaredVogler2/Training_Academy`). Everything below is prepared and tested locally; the parts that only a real
deployment can confirm are listed under _What a first preview must confirm_.

The app is a static site: `npm run build` writes `dist/`, and that folder is the whole product. No server code, no
environment variables, no secrets.

## Connecting the repository to Vercel (a person has to do this)

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

Do not promote anything to production from this phase. Production release is Phase 16, behind its own checklist and
an explicit go-ahead.

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
