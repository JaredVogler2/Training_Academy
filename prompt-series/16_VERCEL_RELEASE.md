# PHASE 16 — Vercel deployment readiness, preview and approved production release

The game **must run in an internet browser and be deployable/hosted on Vercel.** Do not ship a native-app binary or require a backend. Consult current official Vercel deployment/Git integration documentation at execution time; avoid relying on stale platform assumptions.

## Build and Vercel config
- Verify package manager lockfile, Node engine, Vite production build, dist output, routing behavior, asset base paths, favicon/manifest and modern caching semantics.
- Use GitHub + Vercel Git integration as the preferred workflow: branch previews, production deployment from an approved branch, with CI for unit, lint, typecheck, content lint, E2E and visual QA.
- Add only the SPA rewrite(s) actually required. Ensure service-worker scope, JSON/audio paths and cache headers don't break deep links or version migrations.
- Never embed Vercel secrets in client bundles or commit local .env and .vercel files. No runtime secrets needed for default local-only product.
- Set safe HTTP headers (CSP if feasible with tested libraries/assets, X-Content-Type-Options, Referrer-Policy, Permissions-Policy); confirm CSP doesn't block Three shaders/audio/assets/PWA.
- Size budgets, image preload priorities, edge delivery where applicable; do not incorrectly turn a static client app into a Vercel Function for no reason.
- Provide short setup instructions for connecting the repository to Vercel, framework preset, build command, output directory, preview/production branch settings.
- Confirm no backend/LLM service is required for core learning. App should remain usable offline after caching if offline mode is advertised; test that claim.

## Release workflow and approval boundary
1. Verify intended Vercel account/team/project and repo/commit/branch.
2. Build the app and run all required tests.
3. If connected and authorized, deploy a **preview** first and examine actual URL, routes, assets, console and performance; capture remote screenshots and correct regressions.
4. Present evidence and request explicit approval before production deployment or production-domain promotion, unless such authorization has already been given.
5. After authorized production release, confirm exact HTTPS URL, deployment status, commit SHA, mobile opening, errors, cache version and rollback procedure.
6. If credentials, permissions or integration are missing, give exact user action needed; do not claim deployment.

## Artifacts
vercel.json if needed; .github/workflows/ci.yml; docs/DEPLOYMENT.md, docs/RELEASE_CHECKLIST.md, docs/TEST_RESULTS.md, docs/CONTINUE_HERE.md. Keep CI secrets out of logs/artifacts; use protected branch and trusted reviewed actions. Verify actual preview build before setting release status. Commit.
