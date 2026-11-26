# Assets and licences

Everything the game shows or plays is either original to this project or listed here with its licence. Nothing is
hot-linked: every file is served from the game's own origin, and the Content-Security-Policy would block anything
else.

The list itself is `docs/assets.manifest.json`, and it is checked by the unit tests
(`tests/config/assets.test.ts`):

- a file in `src/assets/` or `public/` that the manifest does not list fails the tests;
- so does a listed path that does not exist, or a picture, font, sound or model found anywhere else in `src/`;
- anything from elsewhere must name its source, its copyright holder and a licence from a short allowed list;
- no shipped file may contain the address of another site.

## Third-party assets that are shipped

| Asset                   | Where it comes from                                                           | Licence                   | What is shipped                              |
| ----------------------- | ----------------------------------------------------------------------------- | ------------------------- | -------------------------------------------- |
| Fredoka (variable font) | npm `@fontsource-variable/fredoka` 5.3.0 — © 2016 The Fredoka Project Authors | SIL Open Font License 1.1 | the Latin subset, one `.woff2` (about 30 kB) |
| Nunito (variable font)  | npm `@fontsource-variable/nunito` 5.3.0 — © The Nunito Project Authors        | SIL Open Font License 1.1 | the Latin subset, one `.woff2` (about 39 kB) |

The licence texts are in each package (`node_modules/@fontsource-variable/*/LICENSE`). The fonts are bundled by Vite
from `src/styles/fonts.css`; the font files are unmodified.

Those two fonts are the only third-party files that are shipped as they came. There are no stock images, no
downloaded 3D models, no texture packs, no icon sets and no audio libraries.

One thing more is shipped that was **made from** someone else's work: the outlines of the continents.

| What is shipped                                                                                             | What it was made from                                                                                                                                                                                                                                                                        | Licence                                                                                                                                                                                                                                                                                                                                           | How                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/content/explorer-harbor/atlas.json`: seven continents as 122 outlines of 2117 points, 31 kB as shipped | Natural Earth, _Admin 0 – Countries_ at 1:110 million: the file `ne_110m_admin_0_countries.geojson` of the `nvkelso/natural-earth-vector` repository on GitHub (`geojson/`, branch `master`), fetched 2026-11-26. SHA-256 `6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f` | Public domain. The repository's own `LICENSE.md`, read 2026-11-26: "All versions of Natural Earth raster + vector map data found on this website are in the public domain. You may use the maps in any manner, including modifying the content and design"; "No permission is needed to use Natural Earth. Crediting the authors is unnecessary." | `scripts/atlas/make_atlas.mjs`, run by hand. The source file is not in the repository: the script is given it, and writes what is shipped. The checksum of what it was given is written into the atlas |

**What the script does to the map**, since what is shipped is not what was fetched. It melts the countries
of each continent into one, so that no border of any country is left: the globe shows seven lands and the
sea. It moves five things between the continents the source files them under: Russia east of 60 degrees
east is Asia, to its far end past 180 degrees; French Guiana is South America; the half of New Guinea that
is Indonesia's is Oceania, with the other half; Hawaii is Oceania; and the scattered islands the source
calls "Seven seas" are left out. It makes the outlines coarser, to about a third of a degree, and drops
specks. **Which continent a country is in is the source's choice but for those five**, and nothing here is
a statement about any border: none is drawn. The tests hold what the script wrote to the world, by name
(`tests/content/atlas.test.ts`).

**Where the fifteen famous places are** (`src/content/explorer-harbor/places.json`) was written down by
hand, and then compared with the coordinates on each place's English Wikipedia article by
`scripts/atlas/check_places.mjs`, which asks Wikipedia's API for the numbers and for nothing else. Thirteen
agreed to a hundredth of a degree. The Great Wall's did not, being a long wall with the article's point on
another stretch of it, and the article's point is now the one used. The article "Mount Kilimanjaro" gave the
script no coordinates, and Wikipedia then stopped answering for a while, so **Kilimanjaro's place was
compared with nothing**. No text, picture or data of Wikipedia's is in the game: fifteen pairs of numbers
were compared with fifteen pairs of numbers, and one was corrected. The check is run by hand, with a
connection; nothing in the build or the tests goes to another site. (UNESCO's list could not be reached from
where this was built, and Wikidata could not either.)

## Made here, with tools and a voice model from elsewhere

The voice is 660 recordings that this project made and owns. They were made with other people's tools and with a
voice model that this project did not train. None of the tools or the model is shipped; the recordings are.

| What was used                          | Where it comes from                                                                                                | Licence, as far as it was read                                                                              | Used for                                                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| piper-tts 1.8.0                        | PyPI                                                                                                               | GPL-3.0. A tool run on a desk; no part of it is in the game                                                 | saying each line                                                                                                                                    |
| the voice model `en_US-kristin-medium` | `rhasspy/piper-voices` on Hugging Face; SHA-256 `5849957f929cbf720c258f8458692d6103fff2f0e3d3b19c8259474bb06a18d4` | The repository is MIT. The model's card says it was trained on LibriVox recordings, which are public domain | the voice itself                                                                                                                                    |
| onnx 1.23.2                            | PyPI                                                                                                               | Apache-2.0. A tool run on a desk; no part of it is in the game                                              | letting the synthesiser say which of its samples are which sound, so that a word can be cut into its beats and a clip marked where its sounds begin |
| faster-whisper, model `small.en`       | PyPI; `Systran/faster-whisper-small.en`                                                                            | MIT                                                                                                         | listening to each clip, as a check                                                                                                                  |
| ffmpeg, with `libmp3lame`              | the operating system's package                                                                                     | LGPL / GPL. A tool                                                                                          | encoding each clip as MP3                                                                                                                           |

**What has not been checked.** I read the repository's licence file and the model's card, and no further. Nobody
with legal training has confirmed that a voice synthesised from this model may be shipped in a product for
children, or that the model's own training left it free of any other claim. That should be settled before a public
release (Phase 14). If the answer is no, or if a person is to record the voice instead, every line that needs
replacing is in one list: `src/voice/manifest.json`.

## Original work

| What                                                                                                                      | Where                                                                 | How it was made                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand mark, favicon, app icons                                                                                            | `src/ui/art.tsx`, `public/favicon.svg`, `public/assets/icons/`        | Hand-written SVG; the PNG icons are rendered from it by `npm run icons`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Seven world emblems, six player pictures                                                                                  | `src/ui/art.tsx`                                                      | Hand-written SVG                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Interface icons                                                                                                           | `src/ui/icons.tsx`                                                    | Hand-written SVG                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Glim, the guide                                                                                                           | `src/ui/Guide.tsx`, `Guide.module.css`                                | One hand-written SVG, rigged in parts; poses and motion in CSS                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| The modelling kit, and what floats                                                                                        | `src/render/hub3d/kit.ts`, `floating.ts`, `islands/parts.ts`          | Written in code on three.js geometry                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Academy Rock and the six islands                                                                                          | `src/render/hub3d/islands/*.ts`                                       | Sculpted in code with the kit. No model files. Academy Rock has the Music Lab's chime bars and notes on it                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| The painted material and its brush texture                                                                                | `src/render/hub3d/paint.ts`                                           | A shader patch on three.js's matte material; the texture is generated on the device from a seed                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| The water                                                                                                                 | `src/render/hub3d/Sea.tsx`                                            | An original shader                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| The hub's pictures (seven islands, boats, a rock, a cloud)                                                                | `src/assets/hub/*.webp`, `sprites.json`                               | Rendered from the island models by `npm run art:sprites`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| The picture's sea                                                                                                         | `src/render/HubPicture.module.css`                                    | A CSS gradient matched to the 3D water, and a small inline SVG of wave marks                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Counting pictures (apple, leaf, snail, acorn, bird, mouse, frog); blocks, frames of five and ten, numbered stones, a bell | `src/game/worlds/number-garden/`                                      | Hand-written SVG                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| The picture kit: 68 things, 15 drawn letters and the ten numerals                                                         | `src/art/pictures.tsx`, `src/art/letters.tsx`, `src/art/numerals.tsx` | Hand-written SVG. What each is called, how it is spelt and how it is clapped is `src/art/lexicon.json`. sh, ch and th are drawn from the fifteen letters, two to a tile. The numerals are the shapes a child is taught to write: an open 4, a 7 with no bar, a 9 with a straight stick                                                                                                                                                                                                                                                            |
| Each world's own drawings                                                                                                 | `src/game/worlds/<world>/`                                            | Hand-written SVG: sound cards, a clap, a line of print, and one thing of the kit put on or in another; a robot and its ground; a bridge, a ramp, a beam, a tub; 37 story pictures; maps drawn from numbers                                                                                                                                                                                                                                                                                                                                        |
| Explorer Harbor's globe, and fifteen famous places                                                                        | `src/game/worlds/explorer-harbor/Globe.tsx`, `landmarks.tsx`          | The globe is drawn from the atlas's outlines (above) by arithmetic written here (`src/content/explorer-harbor/globe.ts`): no map library, no tiles, no projection borrowed. The fifteen places are hand-written SVG, drawn from no photograph and from no other drawing: the pyramids, Kilimanjaro, Table Mountain, the Eiffel Tower, the Colosseum, Big Ben, the Great Wall, the Taj Mahal, Mount Fuji, the Statue of Liberty, the pyramid of Chichen Itza, Machu Picchu, Angel Falls, the Sydney Opera House and Uluru. None has a person in it |
| Interface sounds                                                                                                          | `src/audio/audioEngine.ts`                                            | Synthesised at run time with the Web Audio API                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| The Music Lab's instruments: chime bars, a pipe, a drum, a click                                                          | `src/audio/audioEngine.ts` (`strokeOf`)                               | Synthesised at run time, each from two or three oscillators. No samples, no sound fonts, no recordings: see _Audio_ below                                                                                                                                                                                                                                                                                                                                                                                                                         |
| The Music Lab's phrases: about sixty tunes and drum patterns                                                              | `scripts/content/music-lab.mjs`                                       | Written for this project: steps and skips of two to four notes. No song is quoted                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| The Music Lab's drawings                                                                                                  | `src/game/worlds/music-lab/pictures.tsx`                              | Hand-written SVG: chime bars, a bird, a drum, nine signs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| The voice, and six sounds that are not speech                                                                             | `src/assets/voice/en/`                                                | Made ahead of time by `scripts/voice/make_voice.py`: see above, and _Audio_ below                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Curriculum content                                                                                                        | `src/content/packs/`, `src/content/explorer-harbor/`                  | Written for this project, from tables, by the generators in `scripts/content/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

No images, 3D models, textures, shaders, audio recordings, icon sets, illustrations or code were copied from Epoch60
or from any other source. Epoch60's documents were read for its working practices (a written visual standard,
quality tiers, screenshot review against a rubric, plain reporting of what is unverified), as the prompt series
asks. Its screenshots were looked at and none was kept.

The guide's name, **Glim**, is provisional: no check has been made that it is free to use
(`docs/ART_DIRECTION.md`).

## Software that is shipped (bundled into the build)

| Package            | Version | Licence |
| ------------------ | ------- | ------- |
| react, react-dom   | 19.3.1  | MIT     |
| three              | 0.187.0 | MIT     |
| @react-three/fiber | 9.8.2   | MIT     |
| @react-three/drei  | 10.7.9  | MIT     |
| valibot            | 1.5.0   | MIT     |

Only the parts actually imported are bundled. Development tools (Vite, TypeScript, ESLint, Vitest, Playwright and
the rest of `devDependencies`) are not shipped. One was added in Phase 02: **sharp** 0.35.5 (Apache-2.0; it installs
a prebuilt libvips, LGPL-3.0-or-later), used only by `npm run art:sprites` to encode the hub's pictures. Neither is
part of the game. A full dependency and licence audit is part of Phase 14.

## How assets are made

There is one way to make each kind of asset. Each is small enough to describe in a paragraph, and each has a check
that fails when the rules are broken.

### Vector: icons, emblems, characters, pictures in activities

Written by hand as SVG inside the component that draws it. No drawing program, no export step, no optimiser: the
source is the asset.

- Icons: a 24-unit grid, 2.4-unit strokes, round joins, `currentColor`.
- Pictures: flat shapes, at most one soft gradient each, the eight role colours (`docs/ART_DIRECTION.md`).
- A drawing that appears twice on a page gives its gradients unique ids (`useId`).
- Anything that moves is moved by CSS on a named group, never by rewriting the drawing.
- Decorative by default (`aria-hidden`); the control that holds it carries the name.
- _Checked by:_ the accessibility tests (axe) on every screen; the component tests for the guide.

### Texture

There is one, and it is not a file. `createPaintTexture()` in `paint.ts` builds a 128 × 128 texture from seeded,
tiling noise — blotches, dry-brush streaks and grain in three channels — once, on the device. Every solid surface
samples it from three directions, so nothing has to be unwrapped.

- A new texture must tile, come from a fixed seed, and stay at or under 256 pixels square.
- _Checked by:_ the renderer's own count of textures, shown under Diagnostics and recorded per tier in
  `docs/QUALITY_REPORT.md`: three at most (the brush, and the shadow map where there are shadows).

### Low-poly 3D

Sculpted in code with the kit (`kit.ts`): rounded blocks, lathe-turned shapes, balls, cones, hulls, flat outlines
given thickness; trees, palms, toadstools, tufts and stones built from those. A model is a function from "how much
detail" to one merged mesh, plus a short list of parts that move.

1. Make the land with `landmass` (a shore that wanders, a beach, a plateau, painted paths, contact shade).
2. Place shapes on it with `Sculpture.add(shape, colour or gradient, where)`.
3. Dress the ground with `dress` (tufts and pebbles, the same every time).
4. Return `finish(sculpture, land, movers)`.

Rules: everything is rounded; every shape is a gradient from its foot to its top; landmarks stand in the middle; a
thing that glows is a window, a lamp or an eye. See an island close up at `/studio/<name>` in the running build.

- _Checked by:_ `tests/render/islands.test.ts` — every model stays inside the room the layout gives it (followed
  through the motion of its moving parts), is under 40,000 triangles, builds identically every time, and is lighter
  on the lowest tier.

### Shaders

Two, both in TypeScript template strings beside the code that feeds them: the paint material (patches spliced into
three.js's matte shader) and the sea. No shader files, no includes of our own, no build step.

- One program per material: the paint material sets a fixed cache key so every island shares it.
- Every loop has a fixed upper bound and leaves early when it can.
- Colours go in as uniforms from the palette, not as numbers in the shader.
- _Checked by:_ the browser tests, which fail on any console message (a shader that does not compile is one), and
  the renderer's count of programs under Diagnostics: three.

### Sprites: the hub's pictures

The hub is a picture before it is 3D, and stays a picture where 3D is unavailable. The pictures are rendered from
the models, so the two cannot drift apart:

```bash
npm run build
```

```bash
npm run art:sprites
```

```bash
npm run build
```

`scripts/render-sprites.mjs` opens each island in the studio at 80 pixels to the world unit on a clear background,
with the water around it fading out, captures it in headless Chromium, and writes WebP (quality 82) and
`sprites.json`: each picture's size, the point in it that is the island's middle, and a hash of the sources it was
rendered from.

- The pictures are committed, because a software renderer does not produce the same bytes on every machine.
- _Checked by:_ `tests/render/sprites.test.ts` — fails if any model, material or water source has changed since the
  pictures were rendered, if one is missing, or if one is the wrong size; `npm run verify:dist` holds them to 330 kB
  in all (they are 284 kB); a browser test checks that picture and 3D scene put every island in the same place.

### Audio

Interface sounds are synthesised on the device: each is two or three notes from one scale, as oscillators with a
soft envelope (`src/audio/audioEngine.ts`). The motifs are listed in `docs/ART_DIRECTION.md`.

**The Music Lab's instruments are synthesised on the device too, and that is the whole of their licensing:
there is no source audio.** Nothing was sampled, downloaded or recorded. Each stroke is built when it is
played (`strokeOf`):

| Instrument | What it is made of                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| chime bar  | a sine at the note, dying away over about a second; a quieter sine two octaves above that dies in a fifth of that; a touch of triangle an octave above |
| pipe       | a triangle wave held for a fifth of a second, sliding up into its note over the first twentieth, with a quiet octave above                             |
| drum       | a sine that drops from well above its pitch to 150 hertz in a fourteenth of a second and dies in a third; a short knock three times higher             |
| click      | a triangle wave at 1150 hertz for a fourteenth of a second                                                                                             |

Notes are equal-tempered from the A above middle C at 440 hertz (`frequencyOf`, `src/engine/music.ts`), white
keys only, and the content rules refuse any note below middle C or above the E two octaves over it: a phone's
speaker gives almost nothing below, and a pipe is shrill above. Nothing is louder than three tenths of full
scale.

**Nobody chose these sounds by ear.** They are numbers picked from what such instruments are known to be made
of, and no person has heard one. If a chime bar sounds like a door bell, or the drum cannot be heard on a
phone, the place to change it is that one function.

**With the sound off**, the Music Lab's three listening activities and its room to play in say they need sound
and offer one button that turns it on; the beat, the notes to play back and the tune to make can be followed by
eye (`docs/CURRICULUM.md`).

**The voice is recorded ahead of time**, by `scripts/voice/make_voice.py` (`scripts/voice/README.md` says how to
run it; it needs tools the game does not ship and CI does not install).

- **What is said** is every line of every content pack, the lines every activity shares (`src/voice/lines.json`),
  and what a world needs besides (`src/voice/lines/<world>.json`): single words, words with their first sound
  drawn out, words said slowly, words said in their beats, sentences read aloud, and the lines a story is told
  with. Nothing else is ever said.
- **How each is made.** A sentence is said and trimmed. A single word is said at the end of a carrier sentence
  and cut out, because a synthesiser says a word alone badly. A drawn-out first sound and a slow word are made
  from the same word. A word in its beats is the word cut where the synthesiser says its sounds are, with a
  breath put between the pieces. Six sounds for Reading Cove's listening games (a drum, a bell, a shaker, a
  whistle, a bird, a clock) are a few lines of arithmetic each. Every clip is brought to one loudness and
  encoded as mono MP3.
- **Marks.** A slow word, a word in beats and a sentence read aloud each come with the moments their sounds,
  beats or words begin (`marks` in the manifest; `src/voice/marks/<world>.json` for the game), so that a place
  can light, a clap can pop and a finger can move in time with what is said. They are the synthesiser's own
  account of its speech. A word is cut in the silence before it and not where that account says it begins,
  because a soft first sound starts earlier than it says: "ship" cut there was heard as "chip".
- **How each is checked.** A speech recogniser listens to every spoken clip, and what it heard is written into
  `src/voice/manifest.json` beside what was meant: `matches`; `in-sentence` for a single word that was
  recognised in its carrier sentence and not when cut out (14 of them); `made` for the six sounds. A word in
  its beats is listened to before the breaths go in (with them a recogniser hears three short words, or
  none), so `matches` says of it that the right word was cut up, and nothing about where. A line heard
  as other words is reworded and made again; none is shipped. One word is helped and not reworded: the
  synthesiser said "Uluru" as something the recogniser wrote down as "uru", "urul" or "bulru" in thirteen takes
  of fifteen, and is given it spelt "Oolooroo", which it says as "uluru" in eight of nine (`SAID_AS`, in the
  script). What is shown is the word, and what is heard is still held to the word. `npm test` fails if a clip
  is missing, stale, left over, changed since it was made, or heard differently.
- **What that is worth.** It catches a wrong word, a cut-off ending, noise. It says nothing about whether a clip
  sounds clear, natural or kind. **No person has listened to any of the 660**, and nobody has checked a mark against the sound it marks. Each has `reviewed: null` in the
  manifest, and the grown-ups' area lists them all to be played and marked.
- **Size.** 660 clips, 7.7 MB in all, the largest under 60 kB; budgets in `scripts/verify-dist.mjs`. A clip is
  fetched the first time its line is wanted, never with the first screen.

No recording of a real person is in the game. If one is ever added, it needs that person's written consent on
file before it is committed.

## Adding an asset

1. Prefer making it, in one of the ways above. If it must come from elsewhere, it needs a licence that allows
   redistribution in a product for children.
2. Add it to `docs/assets.manifest.json` **in the same commit**: what it is, where it is, how it was made or where
   it came from, and its licence. The tests fail until it is there.
3. Put it where it will be served from this origin: imported from `src/` (hashed, cached forever) or under
   `public/assets/` (kept under its own name, revalidated).
4. No hot-links, no CDNs, no fonts or scripts fetched from other sites.
5. A recording of a real person needs their written consent on file before it is committed.
6. A new line needs a recording: `scripts/voice/README.md`.
