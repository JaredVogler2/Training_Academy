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

Those two fonts are the only third-party assets. There are no stock images, no downloaded 3D models, no texture
packs, no icon sets and no audio libraries.

## Original work

| What                                                       | Where                                                          | How it was made                                                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Brand mark, favicon, app icons                             | `src/ui/art.tsx`, `public/favicon.svg`, `public/assets/icons/` | Hand-written SVG; the PNG icons are rendered from it by `npm run icons`                         |
| Six world emblems, six player pictures                     | `src/ui/art.tsx`                                               | Hand-written SVG                                                                                |
| Interface icons                                            | `src/ui/icons.tsx`                                             | Hand-written SVG                                                                                |
| Glim, the guide                                            | `src/ui/Guide.tsx`, `Guide.module.css`                         | One hand-written SVG, rigged in parts; poses and motion in CSS                                  |
| The modelling kit, and what floats                         | `src/render/hub3d/kit.ts`, `floating.ts`, `islands/parts.ts`   | Written in code on three.js geometry                                                            |
| Academy Rock and the six islands                           | `src/render/hub3d/islands/*.ts`                                | Sculpted in code with the kit. No model files.                                                  |
| The painted material and its brush texture                 | `src/render/hub3d/paint.ts`                                    | A shader patch on three.js's matte material; the texture is generated on the device from a seed |
| The water                                                  | `src/render/hub3d/Sea.tsx`                                     | An original shader                                                                              |
| The hub's pictures (seven islands, boats, a rock, a cloud) | `src/assets/hub/*.webp`, `sprites.json`                        | Rendered from the island models by `npm run art:sprites`                                        |
| The picture's sea                                          | `src/render/HubPicture.module.css`                             | A CSS gradient matched to the 3D water, and a small inline SVG of wave marks                    |
| Counting pictures (apple, leaf, snail, acorn)              | `src/game/worlds/number-garden/`                               | Hand-written SVG                                                                                |
| Interface sounds                                           | `src/audio/audioEngine.ts`                                     | Synthesised at run time with the Web Audio API. There are no audio files.                       |
| Curriculum content                                         | `src/content/packs/`                                           | Written for this project                                                                        |

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
soft envelope (`src/audio/audioEngine.ts`). There are no audio files, so there is nothing to compress, license or
download. The motifs are listed in `docs/ART_DIRECTION.md`.

Recorded audio arrives with the voices in Phase 04. The rules it will be held to, none of them exercised yet:
files served from this origin only; a recording of a real person needs their written consent on file before it is
committed; each file listed in the manifest with who recorded it; one loudness for all; a size budget in
`scripts/verify-dist.mjs` like every other kind of asset.

## Adding an asset

1. Prefer making it, in one of the ways above. If it must come from elsewhere, it needs a licence that allows
   redistribution in a product for children.
2. Add it to `docs/assets.manifest.json` **in the same commit**: what it is, where it is, how it was made or where
   it came from, and its licence. The tests fail until it is there.
3. Put it where it will be served from this origin: imported from `src/` (hashed, cached forever) or under
   `public/assets/` (kept under its own name, revalidated).
4. No hot-links, no CDNs, no fonts or scripts fetched from other sites.
5. Recorded voices of real people need their written consent on file before they are committed (Phase 04).
