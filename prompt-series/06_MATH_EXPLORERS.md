# PHASE 06 — Math Explorers: quantity first, numerals later

Build Number Garden, an enchanting hands-on world of fruit stands, small animals, growing gardens and physical-looking countable objects. Start from no numeral knowledge and no reading.

## Sequence
M0: visually distinguish a single item, same/different sets, one-to-one matching; intuitive touch instructions.
M1: subitize tiny sets (1–3), distinguish count from area/size, and relate spoken number to quantity.
M2: one-to-one counting 1–5 then 1–10, last-word cardinality; prevent advancing by rapid random tapping.
M3: visual ten-frame, five-frame, number line, group comparisons (more/less/equal) and conservation across rearrangements.
M4: numeral recognition as a *representation* of already-understood quantity, including 0; match symbol, spoken number, and set without relying on counting-word sequence alone.
M5: number bonds to 5, then 10; combine/split concrete sets and then pictorial models.
M6: addition/subtraction within 5 and 10 with meaningful stories; move gradually from manipulatives toward mental strategies without forcing speed.
M7 optional: patterns, shapes, measurements, estimation, coins using real contexts.

## Minigames
'Feed the Friends' (drag exactly N items), 'Garden Harvest' (compare two baskets), 'Ten-frame Constellations' (complete a quantity), 'Toy Shop' (use correct amounts, no real-money upsell), 'Build a Bridge' (number bonds). Build physically coherent object interactions with light physics-like animations but deterministic scoring.

## Content guarantees
- Challenge generators must sample diverse quantities, layouts, colors, object sizes, order and distractors, without visual shortcuts. Multiple rendered representations of each concept.
- Objects must remain clearly countable and distinct on small screens; prevent occlusion and pile-up; offer deliberate placement slots.
- Voice narration of values/operations from bundled audio plus visually demonstrable instructions. Entire M0–M3 usable without reading numerals.
- Wrong answers model *why*: visually count objects, align one-to-one, split/recombine; never just flash a correct answer.
- Maintain independent evidence for counting, cardinality, comparison, symbol recognition and arithmetic. Fast guessing is not mastery; no timed pressure.

## Verification
Unit/property tests for generated answers and distractors across many seeds; touch drag tests; distractors unaffected by cosmetic rearrangement; zero-numeral baseline path. Desktop/mobile screenshot review and parent playtest script. Include at least 50 parametrically varied trials over early levels, without repetitive layouts. Commit.
