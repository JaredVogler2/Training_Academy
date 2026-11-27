import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildExplorerHarborPack } from '../../scripts/content/explorer-harbor.mjs';
import { buildInventorIslandPack } from '../../scripts/content/inventor-island.mjs';
import {
  CONCEPT_GRAPH_ABOUT,
  conceptGraphPath,
  conceptGraphText,
  loadGraphMaker,
} from '../../scripts/content/lib.mjs';
import { buildMemoryForestPack } from '../../scripts/content/memory-forest.mjs';
import { buildMusicLabPack } from '../../scripts/content/music-lab.mjs';
import { buildNumberGardenPack } from '../../scripts/content/number-garden.mjs';
import { buildReadingCovePack } from '../../scripts/content/reading-cove.mjs';
import { buildRobotRidgePack } from '../../scripts/content/robot-ridge.mjs';
import { hasPack, loadPack } from '@/content';
import { DEFAULT_EVIDENCE_POLICY, WORLD_IDS, type ContentPack } from '@/engine';
import { chanceOf } from '@/engine/chance';
import { auditGraph, conceptsOf, graphOf, parseConceptGraph } from '@/engine/graph';
import { advise } from '@/engine/recommend';
import { WORLDS, isOpen, lessonsOf } from '@/game/worlds';

/**
 * The concept graph is what the game goes by to decide what to offer next. It is a file written from the packs,
 * and everything that follows depends on its being what the packs say and on nothing being out of reach in it.
 */

const built = [
  buildReadingCovePack(),
  buildNumberGardenPack(),
  buildRobotRidgePack(),
  buildMemoryForestPack(),
  buildInventorIslandPack(),
  buildExplorerHarborPack(),
  buildMusicLabPack(),
];
const file = readFileSync(conceptGraphPath, 'utf8');
const parsed = parseConceptGraph(JSON.parse(file));
if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
const graph = parsed.value;

const packs = async (): Promise<ContentPack[]> =>
  Promise.all(WORLD_IDS.filter(hasPack).map((world) => loadPack(world)));

describe('the concept graph', () => {
  it('is in the file exactly as the build writes it from the packs', async () => {
    // The build asks Vite for the engine, and has the engine make the graph of the packs as they are generated.
    const maker = await loadGraphMaker();
    try {
      expect(file).toBe(await conceptGraphText(maker.graphOf(built)));
    } finally {
      await maker.close();
    }
  });

  it('is what the engine makes of the packs the game fetches, to the last entry', async () => {
    expect(graph).toEqual(graphOf(await packs(), CONCEPT_GRAPH_ABOUT));
    expect(file).toBe(await conceptGraphText(graphOf(await packs(), CONCEPT_GRAPH_ABOUT)));
    // In whatever order the packs come.
    expect(graph).toEqual(graphOf([...(await packs())].reverse(), CONCEPT_GRAPH_ABOUT));
  });

  it('gives each skill the chance of a lucky answer to the easiest to guess of the questions it is asked alone', async () => {
    for (const pack of await packs()) {
      for (const skill of pack.skills) {
        const alone: number[] = [];
        const attimes: number[] = [];
        for (const lesson of pack.lessons) {
          for (const challenge of lesson.challenges) {
            if (challenge.skillId !== skill.id) continue;
            if (lesson.plan.demo.includes(challenge.id)) continue;
            if (lesson.plan.guided.includes(challenge.id)) continue;
            (lesson.plan.independent.pool.includes(challenge.id) ? alone : attimes).push(
              chanceOf(challenge),
            );
          }
        }
        const expected = Math.max(...(alone.length > 0 ? alone : attimes));
        expect(graph.skills[skill.id]?.chance, skill.id).toBeCloseTo(expected, 4);
      }
    }
    // A half where there are two pictures; a third where there are three; none for a robot's plan.
    expect(graph.skills['math.comparison.more-to-6']?.chance).toBe(0.5);
    expect(graph.skills['phonics.letters.s-m-a-t']?.chance).toBe(0.3333);
    expect(graph.skills['coding.sequence.plan-short']?.chance).toBe(0);
  });

  it('has the worlds the game has, and each world’s activities in the order its page shows them', () => {
    const open = WORLDS.filter(isOpen);
    expect(graph.worlds.map((world) => world.id)).toEqual(open.map((world) => world.id));
    for (const world of open) {
      expect(graph.worlds.find((each) => each.id === world.id)?.lessons).toEqual(lessonsOf(world));
    }
  });

  it('says which version of each world’s content it was made from', async () => {
    const versions = Object.fromEntries(
      (await packs()).map((pack) => [pack.world, pack.contentVersion]),
    );
    expect(graph.packs).toEqual(versions);
  });

  it('has every skill and every activity of every pack, and nothing else', async () => {
    const all = await packs();
    expect(Object.keys(graph.skills).sort()).toEqual(
      all.flatMap((pack) => pack.skills.map((skill) => skill.id)).sort(),
    );
    expect(Object.keys(graph.lessons)).toEqual(
      all.flatMap((pack) => pack.lessons.map((lesson) => lesson.id)),
    );
    expect(Object.keys(graph.skills)).toHaveLength(81);
    expect(Object.keys(graph.lessons)).toHaveLength(71);
    for (const pack of all) {
      for (const skill of pack.skills) {
        expect(graph.skills[skill.id]?.needs).toEqual(skill.prerequisites);
        expect(graph.skills[skill.id]?.world).toBe(pack.world);
      }
      for (const lesson of pack.lessons) {
        // What an activity says it teaches is what its questions are for, no more and no fewer.
        expect([...(graph.lessons[lesson.id]?.skills ?? [])].sort()).toEqual(
          [...lesson.skillIds].sort(),
        );
      }
    }
  });

  it('has nothing out of reach: the audit finds no fault', () => {
    expect(auditGraph(graph)).toEqual([]);
  });

  it('has every activity ask something alone, in every sitting', () => {
    for (const [id, lesson] of Object.entries(graph.lessons)) {
      expect(lesson.asks.length, id).toBeGreaterThan(0);
    }
  });

  it('builds only on what is met earlier in the same world, or in the same activity', () => {
    for (const world of graph.worlds) {
      const met = new Set<string>();
      for (const id of world.lessons) {
        const skills = graph.lessons[id]?.skills ?? [];
        for (const skill of skills) {
          for (const need of graph.skills[skill]?.needs ?? []) {
            expect(met.has(need) || skills.includes(need), `${skill} builds on ${need}`).toBe(true);
          }
        }
        for (const skill of skills) met.add(skill);
      }
    }
  });
});

describe('what the graph says of the content as it stands', () => {
  const few = Object.entries(graph.skills)
    .filter(([, skill]) => skill.variants < 3)
    .map(([id, skill]) => `${id} (${String(skill.variants)})`);

  it('finds twenty skills with fewer than three presentations: they are named, so that the number is true', () => {
    // The brief asks for three. These have two, and one has one: `docs/CURRICULUM.md` says which and why.
    expect(few).toEqual([
      'phonics.listening.repeat-sound-pattern (2)',
      'phonics.letters.s-m-a-t (2)',
      'phonics.letters.p-i-n-o (2)',
      'phonics.letters.f-l-c-h (2)',
      'phonics.letters.u-e-r (2)',
      'phonics.letters.sh-ch-th (2)',
      'phonics.decoding.read-short-sentence (2)',
      'math.comparison.equal-to-6 (2)',
      'math.bonds.to-5 (2)',
      'math.bonds.to-10 (2)',
      'math.numerals.read-to-5 (2)',
      'math.numerals.read-to-10 (2)',
      'math.numerals.hear-to-10 (2)',
      'math.adding.within-10 (2)',
      'memory.recognition.after-a-while (1)',
      'memory.strategy.linking (2)',
      'memory.strategy.places (2)',
      'engineering.bridge.build (2)',
      'world.space.nearest (2)',
      'world.space.farthest (2)',
    ]);
  });

  it('finds one skill the record can never show as independent: it has a single question', () => {
    const enough = DEFAULT_EVIDENCE_POLICY.provisional.minDistinctVariants;
    const never = Object.entries(graph.skills)
      .filter(([, skill]) => skill.variants < enough)
      .map(([id]) => id);
    expect(never).toEqual(['memory.recognition.after-a-while']);
    // It is not what brings its activity back: the other skill the activity asks alone is.
    expect(graph.lessons['mf-hidden-01']?.asks).toEqual(['memory.recognition.what-was-there']);
  });

  it('finds five skills that are asked only at times, never among the questions drawn for every sitting', () => {
    const always = new Set(Object.values(graph.lessons).flatMap((lesson) => lesson.asks));
    expect(Object.keys(graph.skills).filter((id) => !always.has(id))).toEqual([
      'memory.recognition.after-a-while',
      'memory.unaided.four-after-choosing',
      'memory.delayed.keep-three',
      'memory.delayed.same-day',
      'memory.delayed.another-day',
    ]);
  });
});

describe('what Play would offer, of the content as it stands', () => {
  const TODAY = '2026-11-26';

  it('begins each world, for someone new, at its first activity, and points at the first world', () => {
    const advice = advise({ graph, attempts: [], finished: new Set(), today: TODAY });
    for (const world of WORLDS.filter(isOpen)) {
      expect(advice.byWorld[world.id], world.id).toMatchObject({
        lessonId: lessonsOf(world)[0],
        kind: 'new',
      });
    }
    expect(advice.top?.world).toBe(WORLDS.filter(isOpen)[0]?.id);
  });

  it('begins wherever a grown-up says, in every world, at every activity there is', () => {
    // Whatever an activity builds on was taught before it, so it is taken on their word: no place a grown-up
    // can choose is passed over for something else.
    const elsewhere: string[] = [];
    for (const world of graph.worlds) {
      for (const lesson of world.lessons) {
        const offered = advise({
          graph,
          attempts: [],
          finished: new Set(),
          today: TODAY,
          startAt: { [world.id]: lesson },
        }).byWorld[world.id];
        if (offered?.lessonId !== lesson || offered.kind !== 'new') {
          elsewhere.push(`${lesson}: ${offered?.lessonId ?? 'nothing'} (${offered?.kind ?? ''})`);
        }
      }
    }
    expect(elsewhere).toEqual([]);
  });
});

describe('a concept in full', () => {
  it('is there for every skill, with what a grown-up needs to read of it', async () => {
    for (const pack of await packs()) {
      const concepts = conceptsOf(pack);
      expect(concepts.map((concept) => concept.skillId)).toEqual(
        pack.skills.map((skill) => skill.id),
      );
      for (const concept of concepts) {
        const known = graph.skills[concept.skillId];
        expect(concept.world).toBe(pack.world);
        expect(concept.title.length).toBeGreaterThan(0);
        expect(concept.objective.length).toBeGreaterThan(0);
        expect(concept.prerequisites).toEqual(known?.needs);
        expect(concept.lessons).toEqual(known?.lessons);
        expect(concept.variants).toHaveLength(known?.variants ?? -1);
        // An example for each of its first three presentations, each with words the pack has.
        expect(concept.examples).toHaveLength(Math.min(3, concept.variants.length));
        for (const example of concept.examples) {
          expect(pack.strings.en[example.instruction], example.instruction).toBeDefined();
        }
        // Every question has a ladder of help, and it ends by showing the answer.
        expect(concept.hintLadder.length, concept.skillId).toBeGreaterThan(0);
        expect(concept.hintLadder.at(-1)).toMatch(/^(reveal|model|step)$/);
        const { shown, guided, alone, attimes } = concept.questions;
        const own = pack.lessons.flatMap((lesson) =>
          lesson.challenges.filter((challenge) => challenge.skillId === concept.skillId),
        );
        expect(shown + guided + alone + attimes).toBe(own.length);
        // Asked alone somewhere, or only at times: never nowhere.
        expect(alone + attimes, concept.skillId).toBeGreaterThan(0);
        for (const sitting of concept.sittings) {
          expect(sitting.drawn).toBeGreaterThan(0);
          expect(sitting.drawn).toBeLessThanOrEqual(sitting.from);
        }
      }
    }
  });

  it('names the mistakes its questions can tell apart, where they can', async () => {
    const all = (await packs()).flatMap((pack) => conceptsOf(pack));
    const without = all.filter((concept) => concept.misconceptions.length === 0);
    // Things that are made (a row given out, a plan, a tune) are judged by a rule, and name no mistake.
    expect(all).toHaveLength(81);
    expect(without).toHaveLength(30);
    const letters = all.find((concept) => concept.skillId === 'phonics.letters.s-m-a-t');
    expect(letters?.misconceptions.length).toBeGreaterThan(3);
  });
});
