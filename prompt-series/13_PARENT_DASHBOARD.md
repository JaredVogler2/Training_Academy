# PHASE 13 — Parent dashboard, controls and offline skill transfer

Create a purposeful grown-up dashboard isolated from the child experience. It should explain **what the learner can demonstrate** rather than decorate a chart of playtime.

## Design and navigation
A small deliberate parent-entry challenge (hold-to-unlock + arithmetic/reading prompt if appropriate) deters accidental child entry, but **do not misrepresent it as secure authentication**; local data protection is by device/browser controls. No external auth required. Parent can always exit to the child hub.

Dashboard sections:
1. Profiles: create a local pseudonym/avatar, switch profiles, import/export, reset with a clear warning.
2. Skill trees: show introduced, practiced, provisionally independent, consistently independent with evidence counts, last review and next suggested lesson.
3. Learning history: compact per-day practice and independent success, not leaderboards or comparison to arbitrary 'gifted' age ranks.
4. Concepts: see exact content, guided lessons, target prerequisites and difficulty settings; skip/enable optional worlds without false mastery.
5. Session management: parent-set suggested limit, audio/music/reduced-motion toggles, breaks and screen-time hygiene; not manipulative enforcement or streak threats.
6. Offline connection: printable/onscreen parent guides for sound hunts, counting snacks, building block bridges, walking observation, narrating stories, clapping rhythms; required adult help/safety clearly indicated.
7. Data control: readable export JSON with schema version, verified import, local deletion, documented absence of server account or tracking.

## Engineering
Charts are supported by actual event records; provide empty/loading/low-data states and clearly label sample size. Save operations are atomic and recover after interrupted writes. Never expose data by default through public share links. Import validates type, schema, size, integrity and all challenge references; handle migrations, corrupted data and duplicates safely.

## Acceptance
Playwright end-to-end: new learner -> complete guided + independent challenges -> dashboard reveals correct distinctions -> export -> delete -> import -> identical verified progress. Test profile isolation and cannot edit a child's log merely by tapping badges. Parent UI itself fully accessible and responsive on phone and desktop. Commit.
