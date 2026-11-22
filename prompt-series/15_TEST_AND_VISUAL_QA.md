# PHASE 15 — Comprehensive QA and release evidence, not optimistic checkboxes

Establish regression coverage that proves the game teaches, works and looks premium. The screenshot gate is intentionally as important as a test pass.

## Automated contract
- Unit tests: all domain graph prerequisites, phonics content decodability and unique options, math answer properties, pathfinding/puzzles, memory reveal/order, engineering outcome invariants, local persistence/migrations and hints vs mastery.
- Content lint: missing audio, mislabelled sound, duplicate answers, misleading picture/distractor, untaught letter in decodable text, inaccessible worlds, malformed language strings, factual geography error.
- E2E: Chromium desktop (1366x768), portrait phone (390x844), small phone (360x740), landscape phone (844x390), tablet (768x1024) and WebKit emulation. Core flows from first visit and empty profile to guided trial, wrong answer, independent success, return, refresh, export/import.
- Failure modes: audio blocked, network disconnected after load, denied storage, reduced motion, high-contrast setting, resize mid-drag, double tap, hidden tab, GPU/context loss and page refresh.
- Regression harness seeded lesson replay; screenshots from *running app*, no fake image mockups. Include perceptual screenshot differences with human review for intended art changes.

## Visual quality review
Take evidence screenshots of hub and each flagship module at phone portrait, landscape and desktop, with at least one active instruction, hint, success and failure feedback frame. Rate 1–5 with concrete notes: cohesion, illustrated/3D craftsmanship, spatial depth, atmosphere and lighting, motion, informational hierarchy, legibility, animation responsiveness, touch hit zones and low-tier graphics. Target every category >=4 on actual reviewed captures; don't pass merely because overall average is 4. Budget three inspect/fix loops for weakest screens.

## Pedagogical acceptance journeys
A. Child starts with **zero letter knowledge** and successfully completes listening/sound discrimination without accidental print requirements.
B. Letter sound acquisition is separately measured from letter name and from sight-picture memory.
C. A child who can count 3 objects but cannot identify '3' learns quantities without seeing a numeral as a prerequisite.
D. Robot 2-step command is accessible without keyboard or typed text.
E. Assisted/hinted success never becomes independent mastery automatically.
F. A parent can review actual evidence and complete a safe off-screen prompt.

## Reporting
Write docs/TEST_RESULTS.md with exact command, platform, outcome, captured path, known gaps, date and commit. Write docs/QUALITY_REPORT.md with scores + evidence and explicitly distinguish desktop emulation from a real iPhone Safari test. Run production preview, not just dev. Block release for misleading progress data, phonics errors, broken touch, privacy leak or unusable media. Commit.
