# Release audit

## Privacy and data

| Surface                             | Data and destination                                                                                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Players and progress                | Nicknames, selected avatars, settings, lesson sessions, play times and answers stay in IndexedDB on the device. The app falls back to localStorage and then to memory if required.                            |
| Device preferences and voice checks | Sound, motion and graphics choices and the local listening checklist use localStorage.                                                                                                                        |
| Offline operation                   | The service worker precaches the app shell and keeps same-origin versioned assets that the browser has used. It removes obsolete cached assets when an update activates.                                      |
| Export and restore                  | A grown-up downloads a readable JSON file locally. It may contain a nickname and detailed progress. Restore checks shape, size, integrity, ownership and published challenge references before writing.       |
| Diagnostics                         | Rendering, app timings, errors and storage fallback information stay in the current browser session.                                                                                                          |
| Hosting                             | Vercel serves the app and can process ordinary HTTP request data such as the visitor’s IP address. The app uses no account, ads, analytics SDK, microphone, camera, child chat, payments, or upload endpoint. |

Grown-ups can remove one player or erase all player records. An exported copy is managed by whoever saved it. Shared-device access depends on the browser or operating system. The press-and-hold gate is a way to separate screens for children and grown-ups.

This audit covers the app’s implementation and the reviewed deployment behavior. The operator owns the privacy notice, hosting terms and applicable child-privacy review. Reassess this before adding collection, third-party services, new tracking or accounts.

## Security and availability

- The production CSP restricts scripts, network connections and workers to the Academy origin. The Permissions Policy disables camera, microphone, geolocation and payments. The build verifier and smoke tests exercise these headers and the deep-link and missing-asset behavior.
- Backups are data. The checksum detects accidental changes. Keep copies private, and import copies from a device you trust. Invalid references and duplicate records are refused. An insert-only write prevents a backup from overwriting another player’s sitting through an ID collision.
- The release audit found the path-to-regexp advisory in the preview routing tool. The lockfile now resolves that tool’s transitive dependency to 6.3.0. The repeat npm audit reported zero known vulnerabilities on 27 November 2026. [Published advisory](https://github.com/advisories/GHSA-9wv6-86v2-598j)
- Storage, WebGL, audio, and offline fallbacks are covered by existing tests. Record real-device checks separately, especially on shared tablets and when a device is low on storage.

## Dependency and asset licenses

Vite publishes notices for the JavaScript it bundles at `/assets/dependency-licenses.txt`. The distributed font licenses and upstream React Three Fiber text are in `/assets/additional-licenses.txt`. The installed runtime dependency declarations are MIT, Apache-2.0, ISC, BSD-3-Clause and OFL-1.1. The one runtime lockfile entry without a license field, `webgl-constants@1.1.1`, supplies an MIT LICENSE in its package. The offline voice tooling and design tools are separate from the deployed app. See [Assets and attribution](ASSETS.md) for fonts, artwork, voice and source data.

## Content and accessibility review

The authored curriculum has seven world packs. The built-in content and engine checks exercise schema, triggers, answer logic, teaching order, versioned challenge IDs, prerequisite graphs, and synthetic music. The activity guides were reviewed for their materials and adult supervision. Water, ice and glass handling belongs to the grown-up. The wind activity uses hand-fanned card and a large soft block.

The 736 narration clips were checked against their declared hashes and decoded with FFmpeg. That is 25.8 minutes of recordings. The existing machine review records 716 automatic matches, 14 words recovered from sentence context and 6 assembled clips. The human review count is zero in the source manifest. The release checklist calls for human listening and an educator’s review of instruction and age fit.

The app uses keyboard-operable native controls, independent motion, graphics and sound preferences, and plain-text evidence. The quieter-settings shortcut combines pictures, calm motion and sound off. Real device and real screen-reader results belong in the release checklist alongside the automated checks.
