# PHASE 14 — Production safety, accessibility and performance

Audit every world and shared system. The project is for preschoolers: privacy and predictable behavior matter more than analytics, engagement or monetization.

## Child safety & privacy
- No mandatory user login or personal identification; pseudonyms stored locally. Avoid third-party scripts, ad tech, cross-site pixels, tracking, child chat and risky outbound links.
- No unrestricted generative conversations with children; all shipped questions, narration and feedback come from reviewed local content or a constrained deterministic system. If an optional future AI feature is proposed, require separate parent approval and a security/content/privacy design review.
- No remote recording or transmission from microphones or cameras. If microphone-supported speech activities are ever implemented, keep off by default, obtain parent opt-in and clearly declare actual data flow; manual parent observation always works.
- Assess applicable children's privacy obligations, including COPPA as relevant, before publishing any child-data-collecting service. Local-only design is preferable but does not eliminate the need for policy review.
- No kid-visible purchasing, external social sharing, competitive rankings, persistent nagging or dark patterns.
- Content safety review for physical activities: choking, water, falls and hazards; adult supervision and household materials where relevant.

## Accessibility
- WCAG-informed keyboard/focus/screen-reader support for parent UI, while child activities also have strong visual and audio/gesture models; large target areas, contrast and clear focus states.
- No reading prerequisite, no reliance on color alone, no drag-only interaction (tap-to-select/tap-to-place fallback), audio replay and clear silent-mode help.
- Motion preferences, low visual-stimulation option, captions/illustrated instructions, adjustable narration/music, safe flashing behavior.
- Handle orientation changes, browser zoom, notched device safe areas, 200% text on parent UI, screen reader meaningful labels.

## Web and GPU performance
- Mobile-first code split and defer heavy 3D. No permanent 60fps claim unless measured on a specified device.
- Set documented budgets for initial compressed transfer, memory, GPU draw calls, long tasks and interaction response; choose realistic values after profiling. Track actual numbers and their measurement environment.
- Image compression, texture atlases, LOD/instancing where helpful, motion governors, bounded particles, context loss/recovery, page visibility pause, resume after browser tab termination.
- Fallback when WebGL is unavailable, software renderer is slow, offline resources missing, WebAudio fails, IndexedDB denied, or storage is full.
- PWA must not cache unbounded content or old incompatible game versions. Confirm update and rollback behavior.

## Evidence
Perform dependency/license and security audits, manual child-safe content review, web accessibility passes, network inspector checks for unwanted requests, performance profile on emulated phone plus at least one physical device if available. Distinguish measured vs assumed. File findings and remediate blocker severity before release. Commit.
