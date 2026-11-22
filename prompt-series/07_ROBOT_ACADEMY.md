# PHASE 07 — Robot Academy: prereading algorithms and debugging

Build a polished 2.5D or 3D miniature world with an adorable robot navigating tactile grid/maze environments. No text instructions, typing, keyboard, code syntax, or prior numeracy assumed.

## Scaffolding
R0: tap a big arrow and observe one move; discover orientation and forward vs turn. Demonstrate using animated ghost previews.
R1: sequence 2–3 commands by dragging large icons into a tray; run, rewind, edit and retry.
R2: plan 4–10 commands with visible destination and obstacles; offer reversible play-by-play execution.
R3: introduce repeat as a concrete 'do this again' icon, first with illustrated 2x/3x counts before symbolic loops; teach variable length of action vs length of instruction.
R4: identify a broken sequence, pause at first error, choose an edit; distinguish debugging from random trial-and-error.
R5: conditionals as simple sensory rules ('if the bridge is up ...'), only when loop/sequence comprehension is established; optional enrichment.

## Core engine
Implement a deterministic grid interpreter with typed command AST, movement constraints, collision, reachable-state solver, solution validator and seeded puzzle generator. Generate puzzles with at least one verified solution and bounded difficulty. Where a particular concept is targeted, ensure it's actually needed: don't award loop mastery from a puzzle that can be solved trivially without a loop. Avoid arbitrary pass/fail on multiple valid solutions.

## Game feel
Visually satisfying robot movement, anticipation, light environment interaction, path highlights, animated goal and subtle celebratory response. Buttons are oversize and contrast with scenery; run/reset/undo never confusing. Corrective feedback can highlight the first divergence from intended route, then offer one cue at a time. No countdowns or punishments.

## Testing and acceptance
Seeded puzzle solvability tests, undo/reset correctness, orientation edge cases, blocked path handling, deterministic run and run/pause/resume. Playwright on touch phone and pointer desktop. Demonstrate a child can complete two-arrow path without knowing a single letter. Include 10 authored intro puzzles and a tested generator for further levels; screenshot a complete run. Commit.
