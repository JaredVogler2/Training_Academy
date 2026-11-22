# PHASE 12 — Adaptive progression, review and valid evidence

Create a **transparent learning engine** that individualizes practice without producing unsupported cognitive/IQ claims, secretly narrowing opportunity, or confusing time spent with learning.

## Skill model
Implement a versioned concept graph for every world. Each concept includes skill ID, teaching objective, prerequisites, at least 3 example variants, generator rules, misconceptions, hint ladder, independent-probe definition and parent-readable demonstration. Preserve per-skill state: unintroduced -> exploring -> guided -> practicing -> provisionally independent -> consistently independent. 'Mastered' must require evidence across separated sessions and at least two distinct presentations; thresholds are **product heuristics** adjustable in config, not scientifically validated diagnostic cutoffs.

## Recommendation algorithm
- On first encounter teach explicitly, then guide, then run independent practice probes. Never probe an unintroduced concept as if failure were a deficit.
- Initial unknown => not yet observed. Optional quick placement grants early exposure but never automatically sets mastery from one answer.
- Recommend a mixture of achievable successes, one modest challenge, spaced review, and child choice. E.g. target ~70% comfortable and ~30% new/review, but do not claim that ratio is research-proven; make tunable and evaluate.
- Wrong answer -> classify misconception if possible -> offer conceptual example or reduced choices -> repeat with **different** instance. Avoid frustration loops and blind rerolling to easier unrelated skills.
- Separate hint levels, independent probe attempts, device input mistakes, repeated guesses and adult-assistance labels. Avoid making inferences about disability, attention disorders, intelligence or development from game logs.
- Spaced review scheduler based on evidence/confidence and calendar intervals; handle offline time shifts, timezone, repeated same-day sessions and device restore deterministically.
- Child can choose worlds freely; teacher/parent may select concepts but cannot falsify independent success through a 'mark practiced' control.
- Session recommendations should gently stop at adult-set duration; no notification/spam loops or endless completion pressure.

## Instrumentation and storage
Store minimal event records locally: stable skill ID, challenge variant ID, timestamp, coarse outcome, assistance, duration bounded by pause, content version. Never store raw microphone/audio, pictures of children, coordinates or personal data. No outgoing analytics.

Provide parent-friendly explanations: 'Recognized /m/ sound independently in 3 varied activities across 2 days' instead of '92% intelligence'. Confidence categories should show uncertainty and sample size. Export/version migration must preserve these distinctions.

## Verification
Property-based tests for progression invariants, hint contamination, spaced intervals, content migration, repeat-answer exploit, multiple profiles and offline clocks. Simulate novice, rapid guesser, high performer, inconsistent learner, reduced-motor-control learner. Generate explainable recommendations; audit no inaccessible prerequisites. Parent can inspect why a lesson was recommended. Commit.
