# Training Academy — sequential build prompts

This directory is an executable implementation program for a coding agent (requested target: Claude Fable 5.2). The product is a beautiful, responsive, Vercel-hosted browser game for ages roughly 3.5–6, with an initial four-year-old learner who may recognize **few or only some letters and letter sounds**.

**Repository state at prompt creation:** no application has been implemented. Never imply that prompts, screenshots, unit tests, or deployment already exist unless actually created and verified.

## Execute in order
1. [00_MASTER_BRIEF.md](00_MASTER_BRIEF.md) — binding product contract and definition of done
2. [01_TECH_FOUNDATION.md](01_TECH_FOUNDATION.md) — Vercel-ready app and deterministic learning engine
3. [02_PREMIUM_ART_DIRECTION.md](02_PREMIUM_ART_DIRECTION.md) — outstanding visuals and verifiable art gates
4. [03_WORLD_AND_PLAYER_JOURNEY.md](03_WORLD_AND_PLAYER_JOURNEY.md) — polished navigation and first playable vertical slice
5. [04_AUDIO_AND_PRE_READER_ONBOARDING.md](04_AUDIO_AND_PRE_READER_ONBOARDING.md) — child-readable UI, spoken instructions and initial placement
6. [05_PHONICS_ADVENTURE.md](05_PHONICS_ADVENTURE.md) — sound-first early reading
7. [06_MATH_EXPLORERS.md](06_MATH_EXPLORERS.md) — number sense before arithmetic fluency
8. [07_ROBOT_ACADEMY.md](07_ROBOT_ACADEMY.md) — visual programming and debugging
9. [08_MEMORY_EXPLORER.md](08_MEMORY_EXPLORER.md) — recall and explicit mnemonic strategies
10. [09_INVENTORS_LAB.md](09_INVENTORS_LAB.md) — engineering, scientific reasoning and offscreen builds
11. [10_STORYTELLING_AND_GEOGRAPHY.md](10_STORYTELLING_AND_GEOGRAPHY.md) — narration and world geography
12. [11_MUSIC_AND_ADDITIONAL_SKILLS.md](11_MUSIC_AND_ADDITIONAL_SKILLS.md) — rhythm, spatial puzzles, chess starter, astronomy, languages and emotional intelligence
13. [12_ADAPTIVE_MASTERY_ENGINE.md](12_ADAPTIVE_MASTERY_ENGINE.md) — per-skill evidence, review, difficulty and safeguards
14. [13_PARENT_DASHBOARD.md](13_PARENT_DASHBOARD.md) — transparent parent controls, export/import and offline extensions
15. [14_ACCESSIBILITY_PRIVACY_PERFORMANCE.md](14_ACCESSIBILITY_PRIVACY_PERFORMANCE.md) — child privacy, browser robustness and rendering budgets
16. [15_TEST_AND_VISUAL_QA.md](15_TEST_AND_VISUAL_QA.md) — automated and human evidence gates
17. [16_VERCEL_RELEASE.md](16_VERCEL_RELEASE.md) — production-readiness and approved deployment
18. [17_POLISH_EXPANSION_AND_HANDOFF.md](17_POLISH_EXPANSION_AND_HANDOFF.md) — final product quality and next roadmap

## How to invoke the coding agent

Start a fresh session by reading 00 plus the currently numbered phase; implement **one phase at a time** while keeping the site playable. Do not merely write a plan: create working source, tests, assets, screenshots, docs, and commits for the phase. Continue only after actual acceptance checks pass. A phase cannot be marked complete because code compiles or the page looks plausible.

Suggested first instruction:

> Read prompt-series/README.md, prompt-series/00_MASTER_BRIEF.md, and prompt-series/01_TECH_FOUNDATION.md. Implement phase 01 end-to-end in this repository, verify it in a real browser, write evidence and the exact next action in docs/CONTINUE_HERE.md, and commit your work. Do not implement later phases until phase 01 acceptance criteria are met.

For later sessions replace phase 01 with the next prompt; also read docs/CONTINUE_HERE.md and any dependency documents named in the prompt.

## Non-negotiable process
- Preserve earlier functionality and progression data. Keep meaningful playable slices at each phase.
- State what was implemented, commands/tests run, exact screenshots, gaps, and commit SHA. Never claim unexecuted tests.
- Maintain docs/PROGRESS.md, docs/CONTINUE_HERE.md, docs/ART_DIRECTION.md, docs/CURRICULUM.md, docs/QUALITY_REPORT.md, and docs/TEST_RESULTS.md.
- Every child-facing instruction must work without reading, without knowledge of the alphabet, and with audio unavailable.
- Content is authored, age-appropriate and deterministic in the shipped game; no mandatory remote AI, no free-form child chatbot.
- Follow Vercel browser delivery (not Roku, Electron, React Native, Unity desktop, or a mobile-store build).
- Reference Epoch60 art documentation and code paths for engineering *ideas*, not code/asset copying. Current Epoch60 documentation explicitly warns that some artistic quality goals were not yet met; aim to surpass the aspirational standard.
- Parent can pause, exit, clear profile, and choose reduced motion. Encourage real-world practice, not endless screen time.
- If credentials, accounts or a deployment approval are needed, produce the ready-to-run result and report the blocker; do not invent success.

## Reference documents in Epoch60
- https://github.com/JaredVogler2/Epoch60/blob/main/docs/3D_VISUAL_STANDARD.md
- https://github.com/JaredVogler2/Epoch60/blob/main/docs/3D_IMPLEMENTATION_PLAN.md
- https://github.com/JaredVogler2/Epoch60/blob/main/docs/3D_QUALITY_REPORT.md
- https://github.com/JaredVogler2/Epoch60/blob/main/docs/ARCHITECTURE.md
- https://github.com/JaredVogler2/Epoch60/tree/main/docs/review

**Do not copy images or source into this repo.** Explicitly document any third-party licensed assets that are independently acquired.
