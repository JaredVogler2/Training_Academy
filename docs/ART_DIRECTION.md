# Art direction

**Status: interim.** Phase 01 needed a shell that looks deliberate and reads well on a phone; it did not set out to
define the game's look. Phase 02 (`prompt-series/02_PREMIUM_ART_DIRECTION.md`) owns that, and should treat everything
here as a starting point it is free to replace. What is written below is what the code does today.

The honest assessment of how the current build looks is in `docs/QUALITY_REPORT.md`.

## The idea so far

A small, sunny island — Academy Isle — where each of the six worlds is a place you can see from the home screen: a
cove, a garden, a ridge, a forest, a workshop island, a harbour. The home screen is the island itself, with the six
worlds as large picture buttons docked along the bottom (portrait) or the side (landscape).

Tone: warm, calm, rounded, unhurried. Nothing flashes, nothing counts down, and nothing is coloured as "wrong".

## What is fixed in code today

All values live in `src/styles/tokens.css`. Components use the tokens; nothing hard-codes a colour except artwork.

### Colour

| Role          | Tokens                                                                                                    | Use                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Ink and paper | `--ink` #22304f, `--ink-soft`, `--paper` #fffaf0, `--white`                                               | All text is ink on paper, white or a light tint. No light text on mid tones.      |
| Sky and sea   | `--sky-top` … `--sea-deep`, `--sun`                                                                       | Page backgrounds, the illustrated island and the 3D island share the same values. |
| Six worlds    | `--reading`, `--number`, `--robot`, `--memory`, `--inventor`, `--explorer`, each with `-deep` and `-tint` | One role colour per world: mid tone for shapes, deep for rims, tint for surfaces. |
| Feedback      | `--yes` (warm yellow), `--try` (soft periwinkle)                                                          | "That's it" and "let's look again". There is deliberately no red for a wrong tap. |

Colour never carries meaning alone: a chosen picture also has a heavy ring and lifts; a removed choice also fades and
shrinks; a status also has words.

### Type

- **Fredoka** (variable, rounded) for headings, buttons and world names. **Nunito** (variable) for running text.
  Both are bundled, Latin subset only (`docs/ASSETS.md`).
- Body text is 16 px at weight 600; nothing a grown-up must read is below 14 px. Child-facing screens carry almost no
  text: captions are for the adult alongside and for screen readers.
- Text may wrap anywhere it has to. Button labels wrap inside the button and long names break rather than widen the
  page (checked by the browser tests with the longest name the form accepts).

### Shape

- Large radii (12 / 20 / 28 px, pills for buttons) and a 5 px "lip" under raised things, so that anything pressable
  looks pressable and visibly goes down when pressed.
- Touch targets: 56 px for anything a child presses, 48 px for grown-up controls; the browser tests measure them.
  Choices in an activity are at least 96 × 72 px and never touch each other.
- One focus ring everywhere: dark with a white halo, visible on every background.

### Motion

- Two speeds (`--quick` 140 ms, `--gentle` 320 ms) and two curves. Movement explains something: a press goes down, a
  right answer hops once, a removed choice shrinks away, the guide's hand points.
- The island moves a little at rest (water, clouds, a slow camera sway). It is ambience, not spectacle; a test
  bounds how much of the picture may change between frames. In the illustrated island the same kind of movement runs
  in small steps, a few times a second, because every change repaints the whole drawing.
- **Calm motion** (the switch in the top bar, or the device's own setting) stops all of it: CSS animation collapses,
  and the 3D scene draws a single still frame. The hold-to-open progress bar keeps its timing, because it is
  information.

### Sound

Six short synthesised cues (tap, on, off, success, try again, step). No music, no voices yet. Everything works with
the sound off. Narration is Phase 04.

## The island

- **Illustrated** (`src/render/IllustratedHub.tsx`): flat SVG, drawn by hand in code. It is what every visit sees
  first and what a device without WebGL keeps.
- **3D** (`src/render/hub3d/`): the same island as a low-poly diorama built from primitive shapes with vertex colours,
  a gradient sky with a sun, and a stylised water shader. No textures, no models, no post-processing. Three quality
  tiers.

The two are the same place in the same palette, but they are not yet matched shape for shape.

## What Phase 02 has to decide

These are open, not settled:

1. **The guide character.** There is none. Activities currently use a pointing hand.
2. **The real look of the island.** Primitives were enough to prove the pipeline (lazy loading, tiers, fallback,
   framing on every screen shape). They are not the finished art. Models, materials, lighting and a consistent
   silhouette language are all still to do.
3. **Whether the world pictures are 2D or 3D**, and how a world's inside relates to its place on the island.
4. **Counting pictures.** Apple, leaf, snail and acorn are plain single shapes on purpose (nothing extra to count).
   Their final style, and deliberate variation of size across a set, are open (`docs/CURRICULUM.md`).
5. **Emblems and icons.** Hand-written SVG, serviceable, not yet a family.
6. **Review gates.** `npm run screens` captures a fixed set of real screens at five sizes into `docs/review/`. Phase 02
   should add its rubric and pass/fail criteria on top of that, and may add image comparison.

## Rules Phase 02 should keep

- Nothing child-facing depends on reading, on sound, or on colour alone.
- No "wrong" colour, no shaking, no buzzers, no timers.
- Calm motion must leave every screen fully usable.
- Assets are original or licensed and listed in `docs/ASSETS.md` in the same commit; nothing is fetched from another
  site.
- The first screen appears without the 3D code; the 3D code arrives afterwards and its absence is never an error.
