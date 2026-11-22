# PHASE 03 — World navigation and first truly playable vertical slice

Build the playable learning archipelago. Use the visual standard from phase 02, plus the child-first contract in phase 00.

## User flow
A simple splash animation -> select locally stored avatar -> choose or be gently guided to a world -> mascot demonstrates a task -> child interacts -> feedback explains/reveals the correct idea -> celebration -> next challenge or go home. Before reading skills exist, communicate using pictures, animation, sounds, and a visible repeat-instruction button. Parent can access settings from a separate intentional parental control, not an easily tapped child item.

## Implement
- Animated hub with clear interactable landmarks for Reading Cove, Number Garden, Robot Ridge, Memory Forest, Inventor Island, and Story/Explorer Harbor.
- Distinct, meaningful illustrations of what tapping each world does, plus hover/focus/touch states and keyboard activation.
- A polished cross-world lesson frame, shared pause/replay audio/home controls, soft page transitions, feedback and celebration states; no intrusive confetti every tap.
- One **complete** playable vertical slice with 4–6 authored visual challenges, teaching (not just assessing) an initial concept without literacy prerequisites. Suggested slice: listen to a first sound and choose matching picture with an explicit guided demonstration and corrective feedback.
- Persist the session, play through start -> demo -> guided attempt -> independent attempt -> calm completion -> hub; reload resumes safely.
- Avoid fake activity buttons. If a world is not implemented, show an honest parent-readable 'coming later' preview, without presenting it as finished.

## Interaction contract
Start with low-motor precision demand; touch targets do not overlap; avoid timed questions or speed-based accuracy. Wrong answers trigger a helpful scaffold (fewer choices or replay demonstration), not a red X or loss. Child can exit at any point. Prevent double-submit race conditions.

## Acceptance
Two E2E tests on desktop and mobile touch: (a) brand-new pre-reader completes a concept without text, (b) hint/incorrect-answer path and pause/resume work. Capture real interactions, click maps, tooltips and responsive screens. Document actual content IDs and replay-safe progression. Commit.
