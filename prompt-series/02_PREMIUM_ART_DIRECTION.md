# PHASE 02 — Premium visual identity and art production pipeline

Read the Epoch60 reference repo, specifically docs/3D_VISUAL_STANDARD.md, docs/3D_IMPLEMENTATION_PLAN.md, docs/3D_QUALITY_REPORT.md, docs/ARCHITECTURE.md and docs/review screenshots. Extract methods and lessons: intentional diorama composition, authored silhouettes, painterly color, warm/cool light, soft shadows, atmosphere, life, quality tiers, visual regression and evidence-based inspection. **Epoch60's existing build self-reports some missing quality gates. Use its aspirational standard and QA process, not an uncritical assumption that the screenshots are perfect.**

## Original direction
Build **a magical miniature learning archipelago**: six inviting themed islands arranged around a lively storybook harbor, unique animated guide character, coherent architecture, layered foreground/midground/background, polished tactile UI and joyful micro-animations. Different from Epoch60's adult civilization look. No copyrighted characters or copied Epoch60 assets. Choose a palette and shape language that reads beautifully to a preschooler without cheap clip-art, excessive saturation, excessive glow or toy-store chaos.

Target quality: a curated children's game with hand-authored charm, rich visual depth and polished motion. Favor fewer highly finished scenes over many empty islands.

## Produce
1. Write docs/ART_DIRECTION.md: reference mood, silhouettes, 6–8 role colors, contrast, typography, lighting, staging, character turnaround/emotion set, 2D illustration language, transitions and sound motifs.
2. Create an asset manifest, sources/license tracking, production pipeline for vector, texture, sprite, low-poly 3D, shaders and optimized audio; no hotlink dependencies or unsourced assets.
3. Build a **real-time rendered** hero hub or compact scene, not a pre-rendered hero screenshot masquerading as interactive game. It needs depth, interaction-ready elements and subtle ambient animation.
4. Produce one distinct character with idle, celebrate, think, gentle retry and point states, including transparent backgrounds where appropriate; animation must be responsive to events.
5. Add semantic lighting, cast/receive shadows, ambient atmosphere, animated foliage/clouds/water or relevant scene life, spatial hierarchy and readable interactive hotspots.
6. Deliver adaptive low/medium/high visual tiers; cap DPR; manage GPU resources, dispose assets correctly; respect reduced motion and no-WebGL fallback.
7. Create accessible child-scale UI: 48–64px or bigger targets, legible contrast, no instructional text solely in 3D, icons plus optional labels, visually clear feedback.

## Mandatory art gate
Capture real gameplay screenshots, not design slides, at 390x844 portrait, 844x390 landscape, 768x1024 tablet and 1366x768 desktop. Include a 360px-wide target. Rate each on 1–5 for composition, craft/materials, cohesive palette, depth/lighting, liveliness, interface legibility, motion quality, child comprehension and device performance. Aim >=4 in each category; record deficient categories in docs/QUALITY_REPORT.md and iterate at least twice.

Acceptance: no untextured prim-only islands, no generic emojis as final art, no stock hero image covering an inert UI, no giant empty gradients, no illegible hotspots. Check actual interaction and pointer hit areas. Save before/after screenshots and commit.
