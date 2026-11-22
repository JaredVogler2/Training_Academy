# Assets and licences

Everything the game shows or plays is either original to this project or listed here with its licence. Nothing is
hot-linked: every file is served from the game's own origin, and the Content-Security-Policy would block anything
else.

## Third-party assets that are shipped

| Asset                   | Where it comes from                                                           | Licence                   | What is shipped                              |
| ----------------------- | ----------------------------------------------------------------------------- | ------------------------- | -------------------------------------------- |
| Fredoka (variable font) | npm `@fontsource-variable/fredoka` 5.3.0 — © 2016 The Fredoka Project Authors | SIL Open Font License 1.1 | the Latin subset, one `.woff2` (about 30 kB) |
| Nunito (variable font)  | npm `@fontsource-variable/nunito` 5.3.0 — © The Nunito Project Authors        | SIL Open Font License 1.1 | the Latin subset, one `.woff2` (about 39 kB) |

The licence texts are in each package (`node_modules/@fontsource-variable/*/LICENSE`). The fonts are bundled by Vite
from `src/styles/fonts.css`; the font files are unmodified.

## Original work (made for this project in Phase 01)

| What                                          | Where                                                          | How it was made                                                                                                                       |
| --------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Brand mark, favicon, app icons                | `src/ui/art.tsx`, `public/favicon.svg`, `public/assets/icons/` | Hand-written SVG; the PNG icons are rendered from it by `npm run icons`                                                               |
| Six world emblems                             | `src/ui/art.tsx`                                               | Hand-written SVG                                                                                                                      |
| Six player pictures                           | `src/ui/art.tsx`                                               | Hand-written SVG                                                                                                                      |
| Interface icons                               | `src/ui/icons.tsx`                                             | Hand-written SVG                                                                                                                      |
| Illustrated hub ("Academy Isle")              | `src/render/IllustratedHub.tsx`                                | Hand-written SVG                                                                                                                      |
| 3D hub                                        | `src/render/hub3d/`                                            | Built in code from primitive shapes and vertex colours, with two small original shaders (sky, water). No textures and no model files. |
| Counting pictures (apple, leaf, snail, acorn) | `src/game/worlds/number-garden/`                               | Hand-written SVG                                                                                                                      |
| Interface sounds                              | `src/audio/audioEngine.ts`                                     | Synthesised at run time with the Web Audio API. There are no audio files.                                                             |
| Curriculum content                            | `src/content/packs/`                                           | Written for this project                                                                                                              |

No images, 3D models, textures, audio recordings, icon sets, illustrations or code were copied from Epoch60 or from
any other source. Epoch60's documents were read for its working practices (quality tiers, screenshot review,
plain-spoken reporting of what is unverified), as the prompt series asks.

## Software that is shipped (bundled into the build)

| Package            | Version | Licence |
| ------------------ | ------- | ------- |
| react, react-dom   | 19.3.1  | MIT     |
| three              | 0.187.0 | MIT     |
| @react-three/fiber | 9.8.2   | MIT     |
| @react-three/drei  | 10.7.9  | MIT     |
| valibot            | 1.5.0   | MIT     |

Only the parts actually imported are bundled. Development tools (Vite, TypeScript, ESLint, Vitest, Playwright and the
rest of `devDependencies`) are not shipped. A full dependency and licence audit is part of Phase 14.

## Adding an asset

1. Prefer making it. If it must come from elsewhere, it needs a licence that allows redistribution in a product for
   children, and the source and licence go in the table above **in the same commit**.
2. Put it where it will be served from this origin: imported from `src/` (hashed, cached forever) or under
   `public/assets/` (kept under its own name, revalidated).
3. No hot-links, no CDNs, no fonts or scripts fetched from other sites.
4. Recorded voices of real people need their written consent on file before they are committed (Phase 04).
