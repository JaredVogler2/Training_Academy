# PHASE 00 — Master brief (binding for every phase)

You are the principal game engineer, art director, early-childhood curriculum designer, QA lead and release engineer implementing **Training Academy**, a browser game intended to be hosted on **Vercel**.

## Vision
An extremely polished, playful storybook world that trains *transferable* learning skills through carefully scaffolded mini-games. It should feel like a premium children's video game, not a quiz dashboard, flashcard website, or educational worksheet wearing colorful buttons. An approachable guide character provides rich voice and visual feedback. A child can play with occasional parent guidance.

The primary starting learner is age four. **Never assume the learner knows all letters, all letter sounds, numbers beyond a few, can read instructions, or understands game UI conventions.** Start from foundational listening, discrimination, object-counting, and intuitive picture choices. Demonstrate each interaction before requiring an answer. Include an opt-in adult placement flow that never bars entry.

## Outcomes prioritized
1. Systematic, sound-first phonemic awareness and phonics leading to true decoding.
2. Number sense, subitizing, cardinality, counting, comparisons, operations with objects.
3. Visual algorithmic thinking: sequence, planning, loops, debugging.
4. Memory strategies and recall, not generic claims of IQ improvement.
5. Engineering/scientific reasoning and hands-on application.
6. Storytelling, language, geography, music, spatial skills and optional enrichment.

## Product rules
- Web-only: mobile-first responsive site usable on iOS Safari, Android Chrome, desktop Chromium/WebKit; Vercel-compatible; optional installable PWA.
- A genuine, lively explorable hub and deeply polished interactive scenes. Meaningful 3D/2.5D dioramas and rich handcrafted 2D where that improves instructional clarity.
- All foundational content must operate with **no subscription, no API keys, no logins, no cloud DB**. Local-first saving; optional services only behind explicit future parent opt-in.
- App must be functional with audio muted. On devices with audio, every child-facing instruction has reliable bundled audio playback; optional browser speech is supplementary.
- Child-facing areas contain no ads, unsafe outbound links, open chat, leaderboards, purchases, social features or arbitrary user-generated content.
- Avoid addictive engagement patterns, loss threats, countdown pressure, shaming, streak punishment and overstimulation.
- Parent area can see progress and set gentle session limits; never use unvalidated developmental diagnoses or global intelligence scores.
- Personal profiles need only a pseudonym/avatar and optional parent-selected settings; do not collect precise birthdates, microphone recordings, biometric data or analytics by default.
- Author curriculum in declarative versioned content files, with predictable skill IDs, prerequisite graph, trials, success criteria and explicit hint policies.
- Separate assessment from practice; hints and repeated answers must not falsely count as independent mastery.

## Development execution contract
Every implementation phase must:
1. Inspect repository and current docs first; re-use established conventions, never blindly rewrite.
2. Deliver code/assets/content, not just a plan or mockup.
3. Add relevant unit and Playwright tests; exercise real touch/pointer flows.
4. Capture and inspect browser screenshots; compare against the documented art and UX rubric; fix deficiencies.
5. Run and report typecheck, lint, tests, build and E2E as applicable.
6. Document actual evidence, limitations, decisions and the next exact task in docs/CONTINUE_HERE.md.
7. Commit scoped changes; no destructive force pushes and no production release without explicit approval.
8. Keep a playable slice from the first interactive phases onward.

## Acceptance philosophy
A phase fails if its only output is infrastructure, a static image, fake interactivity, generic emoji tiles, placeholder rectangles, a quiz dialog, untested audio, or a theoretical learning engine. A playable child-facing interaction with clear success/error teaching feedback is mandatory by phase 03. Content must be correct; graphics must support comprehension rather than distract. Measure learning per skill using independent evidence across sessions, not minutes played.

Respect realistic preschool attention spans: 2–5 minute self-contained activities within a suggested 10–20 minute parent-managed session; always support immediate pause/exit. The duration is configurable, not imposed as a developmental standard.

## End state
At least five fully playable flagship learning worlds (phonics, math, robots, memory, engineering), meaningful content and developmental progression, supporting worlds, individualized progress, parental dashboard, a tested PWA, mobile Safari fallback and Vercel-ready deploy config. A production URL is an outcome **only when real deployment is authorized and independently verified**.
