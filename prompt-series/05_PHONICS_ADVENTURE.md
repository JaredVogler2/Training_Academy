# PHASE 05 — Phonics Adventure: first sounds to real decoding

This is the flagship learning module. **Assume the starting child may not know the alphabet, individual letter forms, or phoneme–grapheme correspondences.** A beautiful book-world setting is not enough; instruction must be coherent and effective.

## Implement curriculum as a dependency graph
Stage P0 (no printed letters required): distinguish environmental sounds, repeat simple sound patterns, notice rhymes and syllables with pictures, discriminate first sounds by ear; interactive animated demonstration. Do not conflate rhyme, syllable, phoneme, and letter-name recognition.
P1: hear and recognize continuous consonants and common vowels; first group can be /s/ /m/ /a/ /t/ (adjust after expert review), one or two at a time, with multiple examples and clear pronunciation.
P2: introduce the *letter shape* and link it to its phoneme through short, explicit demonstration; discriminate upper/lowercase only after lower-case learning; test name vs sound separately if taught.
P3: blend 2–3 phonemes orally, then using printed letters. Show meaningful motion of sound tokens merging into a word; child hears word, sees a relevant illustration after decoding.
P4: segment simple CVC words; move counters, identify initial/medial/final sounds, drag phoneme tiles into order; avoid unnecessary spelling complexity.
P5: systematic short-vowel and common-consonant progression leading to decodable CVC words, then basic digraphs and later sentence-level reading. Introduce only correspondences already taught; no word memorization mistaken for decoding.
P6: novel-word transfer checks with different graphics and occasional pronounceable pseudowords only when appropriate and never presented as real vocabulary; mark a child reading aloud as parent-observed if reliable speech scoring is unavailable.

## Gameplay
'Sound Sprites' inhabit a forest-library: animated characters visually stretch, pop and connect. Mini-games: Sound Safari (choose one of two illustrations after hearing target), Letter Forge (trace/recognize and sound-match; tracing optional not mandatory), Blend Bridge (bring sounds together), Word Garden (decode to grow items), Sentence Path (short decodable sentence with pictures that verify meaning). Art and animation MUST be authored, lively, coherent, and clearly communicate sound-to-symbol mapping.

Show 1 demonstration, 2 scaffolded trials, then independently sampled mixed exemplars; stop repeating identical pictures. Include neutral feedback for accidental taps and a specific model after errors. Avoid reading clues that give away the answer.

## Data and correctness
- Content records include phoneme symbol, instructional audio file, spelling mapping, example object/word, category (phonemic awareness / letter sound / blending / decoding), taught prerequisites, decodability annotations and distractors.
- Include reviewed initial set of at least 10 distinct phoneme–letter correspondences with meaningful teaching content, at least 25 internally consistent CVC words and 10 short decodable sentences; content counts must be reported truthfully. Do not introduce untaught correspondences into supposedly decodable words.
- Exclude alphabet-song rote sequencing as proof of recognition. Do not present a picture cue as proof of ability to decode a novel printed word.
- Distinguish assisted from independent success. Log attempts with stage, error type and hint tier, without storing child's voice.
- Supply teacher/parent review list and sample pronunciations; audio accuracy is a release gate.

## Tests/acceptance
Prove a zero-letter-knowledge profile can start successfully. Prove unlearned letters are not accidentally required, new word assessment can't be passed only through picture identification, error scaffolds work and independent mastery is not inflated by hints. Capture three actual 390px screens and a full child journey. Commit.
