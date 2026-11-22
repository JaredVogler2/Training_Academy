# PHASE 01 — Architecture, tooling and Vercel-ready foundation

Read 00_MASTER_BRIEF.md and the existing repository. Build a production-minded browser foundation from scratch (unless code already exists). Make all architectural choices explicit; favor the simplest system that supports premium rendering, offline-friendly content and credible learning measurements.

## Baseline stack
- React + TypeScript + Vite SPA with modular routes/scenes, strict TS, ESLint, Prettier and Vitest.
- Three.js + React Three Fiber + Drei for a rich diorama hub and selected mini-games; use performant 2D SVG/Canvas/DOM for instructional controls or scenes where precise legibility matters.
- Small, testable headless learning domain engine (pure TS) separated from rendering/input. Seeded question selection where useful; no rendering-driven scoring.
- Persist versioned learner progress in IndexedDB with a safe localStorage fallback, durable migrations, transactional updates and parent-controlled reset/export/import.
- Runtime validation of saved data and authored content (e.g. schema validator chosen with bundle impact in mind).
- Playwright Chromium + WebKit desktop/mobile emulation; add CI and Vercel preview-aware smoke tests.
- Static deployment to Vercel, output directory dist. Configure SPA rewrites as actually required, secure production headers, correct asset paths and fallback behavior.
- Optional PWA manifest + versioned service worker after offline caching policy is tested. No heavyweight SSR, server login or subscription stack unless a measured need arises.

## Implement now
1. Bootstrap project structure: src/app, src/game, src/engine, src/content, src/render, src/ui, src/audio, src/storage, src/parent, public/assets, tests, e2e, docs, scripts.
2. Add home shell with a fully working route/navigation skeleton, reduced-motion and sound toggles, focus-visible controls, error boundary and a no-WebGL fallback.
3. Define typed Skill, Lesson, Challenge, Attempt, Evidence, Profile, LessonSession schemas; stable IDs and content versioning.
4. Create API for deterministic lesson progression: getNextChallenge, submitAttempt, getHint, getSkillEvidence; do not fake mastery based on view counts.
5. Implement and test first local profile CRUD and current-session save/restore. Never cache identifiable child data on a server.
6. Set bundle splitting so 3D hub is lazy-loaded and each module loads only on entry. Add performance instrumentation without transmitting telemetry.
7. Provide npm scripts for dev, typecheck, lint, test, test:e2e, build, preview, verify:release.
8. Create vercel.json only if needed for SPA/history routes, cache rules and security headers; avoid breaking service-worker updates. Create environment-independent preview and production builds.

## Deliverables
README startup instructions; docs/ARCHITECTURE.md, docs/CURRICULUM.md skeleton, docs/CONTINUE_HERE.md, docs/PROGRESS.md; sample versioned challenge and passing engine test; true Vite production build. Initial shell must render correctly on 390x844, 844x390, 768x1024 and 1366x768.

## Verification
Run lint, typecheck, unit tests, build, preview server, and Playwright on the shell; capture/screenshots at phone portrait and desktop, confirm no hydration/console errors; simulate refresh and lost storage. State exactly what has and has not been verified in iOS Safari (WebKit emulation is not a physical iPhone). Commit.

Done only when a real browser displays and navigates the foundation and repo is ready for phase 02. Do not claim actual Vercel deployment.
