# PHASE 04 — Reliable voice, accessibility and foundational placement

A learner cannot yet reliably read or identify every letter. Build **audio-first, not audio-only** instruction that works within browser autoplay rules, iOS Safari quirks and unstable networks.

## Audio system
- Use bundled, licensed or original short voice clips for all core instructional prompts, phonemes and feedback. Native speech synthesis may be a convenience but never a required correctness dependency, especially for isolated phonemes.
- Introduce an explicit first user tap to unlock audio; handle play() promise failures, muted devices, permission-free fallback and audio interruption. Display an animated gesture or illustrated instruction if audio cannot play; adult-help mode is always available.
- Central audio queue: no overlapping narration, replay on demand, interrupt on navigation, duck music under narration, per-profile volume and mute; subtle music, limited loud effects, no surprising sounds.
- For phonics use accurate clean phoneme audio: avoid inserting an extra 'uh' after consonants, distinguish letter *name* from sound, include short/long vowel variants where curriculum calls for them. Validate with parent/educator checks.
- Cache small critical voice clips with explicit memory and bundle budgets; recover gracefully when offline/uncached.

## Child onboarding
- Three illustrated 10–20 second play/learn demonstrations: tap to choose, drag an object, tap the speaker. Add skip/repeat and a parent-assist option.
- Parent-only, optional gentle placement sampling: letter *identification* separately from letter *sound*, initial sound listening, object counting to 5, motor/gesture comfort and audio preference. Default to 'not yet observed', never assume mastery; placement never locks worlds.
- Offer avatar/pseudonym selection without a required real name, date of birth or microphone.
- Add automatic contextual hints if multiple errors indicate an interaction problem rather than misunderstanding.

## Test
Play audio under the first-tap restriction; test muting, interrupted playback, repeated tap, Safari/WebKit behavior, blocked WebAudio, keyboard and touch. Capture fallback screens. Validate phoneme clips by reviewed manifest. Record anything not tested on actual devices. Commit.
