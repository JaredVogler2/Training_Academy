import { describe, expect, it } from 'vitest';
import {
  EMPTY_GRAPH,
  GRAPH_FORMAT,
  auditGraph,
  conceptsOf,
  graphOf,
  parseConceptGraph,
  type ConceptGraph,
} from '@/engine/graph';
import type { ContentPack } from '@/engine';
import { numberGardenPack } from '../helpers/content';
import { fixturePack } from '../helpers/fixturePack';

const skill = (needs: string[], lessons: string[], variants = 3) => ({
  world: 'reading-cove' as const,
  needs,
  lessons,
  variants,
  chance: 0,
});
const lesson = (skills: string[], asks = skills) => ({
  world: 'reading-cove' as const,
  skills,
  asks,
});

/** Three activities in a row, each building on the one before, and nothing wrong with any of it. */
const SOUND: ConceptGraph = {
  about: 'for a test',
  format: GRAPH_FORMAT,
  schemaVersion: 1,
  packs: { 'reading-cove': 1 },
  worlds: [{ id: 'reading-cove', lessons: ['a1', 'a2', 'a3'] }],
  lessons: {
    a1: lesson(['phonics.s.one']),
    a2: lesson(['phonics.s.two', 'phonics.s.also'], ['phonics.s.two']),
    a3: lesson(['phonics.s.three']),
  },
  skills: {
    'phonics.s.one': skill([], ['a1']),
    'phonics.s.two': skill(['phonics.s.one'], ['a2']),
    // Taught in the same activity as what it builds on, and asked only at times.
    'phonics.s.also': skill(['phonics.s.two'], ['a2']),
    'phonics.s.three': skill(['phonics.s.two', 'phonics.s.one'], ['a3']),
  },
};
const faultsOf = (change: (graph: ConceptGraph) => void) => {
  const graph = structuredClone(SOUND);
  change(graph);
  return auditGraph(graph);
};

describe('the audit of a graph', () => {
  it('finds nothing wrong with a sound one, or with one that has nothing in it', () => {
    expect(auditGraph(SOUND)).toEqual([]);
    expect(auditGraph(EMPTY_GRAPH)).toEqual([]);
  });

  it('finds a skill that builds on one there is not', () => {
    expect(
      faultsOf((graph) => {
        graph.skills['phonics.s.two'] = skill(['phonics.s.nowhere'], ['a2']);
      }),
    ).toContainEqual({ fault: 'unknown-need', skill: 'phonics.s.two', needs: 'phonics.s.nowhere' });
  });

  it('finds a skill that builds on something met later', () => {
    expect(
      faultsOf((graph) => {
        graph.skills['phonics.s.one'] = skill(['phonics.s.three'], ['a1']);
      }),
    ).toContainEqual({
      fault: 'needs-something-later',
      skill: 'phonics.s.one',
      needs: 'phonics.s.three',
    });
  });

  it('finds a skill that builds on one in another world', () => {
    const faults = faultsOf((graph) => {
      graph.worlds.push({ id: 'number-garden', lessons: ['b1'] });
      graph.lessons.b1 = { world: 'number-garden', skills: ['math.s.one'], asks: ['math.s.one'] };
      graph.skills['math.s.one'] = {
        world: 'number-garden',
        needs: ['phonics.s.one'],
        lessons: ['b1'],
        variants: 3,
        chance: 0,
      };
    });
    expect(faults).toEqual([
      { fault: 'needs-something-later', skill: 'math.s.one', needs: 'phonics.s.one' },
    ]);
  });

  it('finds skills that build on one another in a ring, however long the ring', () => {
    const faults = faultsOf((graph) => {
      graph.skills['phonics.s.one'] = skill(['phonics.s.three'], ['a1']);
    });
    expect(faults.filter((each) => each.fault === 'circular').map((each) => each.skill)).toEqual([
      'phonics.s.one',
      'phonics.s.two',
      'phonics.s.three',
    ]);
    expect(
      faultsOf((graph) => {
        graph.skills['phonics.s.one'] = skill(['phonics.s.one'], ['a1']);
      }),
    ).toContainEqual({ fault: 'circular', skill: 'phonics.s.one' });
  });

  it('finds a skill built on from another activity that is never asked alone', () => {
    expect(
      faultsOf((graph) => {
        graph.skills['phonics.s.three'] = skill(['phonics.s.also'], ['a3']);
      }),
    ).toEqual([
      { fault: 'need-never-asked-alone', skill: 'phonics.s.three', needs: 'phonics.s.also' },
    ]);
  });

  it('finds an activity that asks nothing alone', () => {
    expect(
      faultsOf((graph) => {
        graph.lessons.a3 = lesson(['phonics.s.three'], []);
      }),
    ).toContainEqual({ fault: 'asks-nothing', lesson: 'a3' });
  });

  it('finds an activity with a skill there is not, one of another world, and one it asks and does not teach', () => {
    expect(
      faultsOf((graph) => {
        graph.lessons.a3 = lesson(['phonics.s.three', 'phonics.s.nowhere']);
      }),
    ).toContainEqual({ fault: 'unknown-skill', lesson: 'a3', skill: 'phonics.s.nowhere' });
    expect(
      faultsOf((graph) => {
        graph.skills['phonics.s.three'] = { ...skill([], ['a3']), world: 'number-garden' };
      }),
    ).toContainEqual({ fault: 'unknown-skill', lesson: 'a3', skill: 'phonics.s.three' });
    expect(
      faultsOf((graph) => {
        graph.lessons.a3 = lesson(['phonics.s.three'], ['phonics.s.one']);
      }),
    ).toContainEqual({ fault: 'unknown-skill', lesson: 'a3', skill: 'phonics.s.one' });
  });

  it('finds an activity that is not in its world’s order, one there twice, and one the order names that is not there', () => {
    expect(
      faultsOf((graph) => {
        graph.worlds = [{ id: 'reading-cove', lessons: ['a1', 'a2'] }];
      }),
    ).toContainEqual({ fault: 'out-of-order', lesson: 'a3' });
    expect(
      faultsOf((graph) => {
        graph.worlds = [{ id: 'reading-cove', lessons: ['a1', 'a2', 'a3', 'a2'] }];
      }),
    ).toContainEqual({ fault: 'out-of-order', lesson: 'a2' });
    expect(
      faultsOf((graph) => {
        graph.worlds = [{ id: 'reading-cove', lessons: ['a1', 'a2', 'a3', 'a9'] }];
      }),
    ).toContainEqual({ fault: 'out-of-order', lesson: 'a9' });
    expect(
      faultsOf((graph) => {
        graph.worlds = [
          { id: 'reading-cove', lessons: ['a1', 'a2'] },
          { id: 'number-garden', lessons: ['a3'] },
        ];
      }),
    ).toContainEqual({ fault: 'out-of-order', lesson: 'a3' });
  });
});

describe('a graph that is read', () => {
  it('is taken when it is one, and refused when it is not', () => {
    expect(parseConceptGraph(SOUND).ok).toBe(true);
    expect(parseConceptGraph(EMPTY_GRAPH).ok).toBe(true);
    expect(parseConceptGraph({ ...SOUND, format: 'something-else' }).ok).toBe(false);
    expect(parseConceptGraph({ ...SOUND, schemaVersion: 2 }).ok).toBe(false);
    expect(parseConceptGraph({ ...SOUND, extra: true }).ok).toBe(false);
    expect(parseConceptGraph({ ...SOUND, lessons: { a1: { world: 'reading-cove' } } }).ok).toBe(
      false,
    );
    expect(parseConceptGraph({ ...SOUND, worlds: [{ id: 'atlantis', lessons: [] }] }).ok).toBe(
      false,
    );
    expect(parseConceptGraph(null).ok).toBe(false);
    expect(parseConceptGraph('a graph').ok).toBe(false);
  });
});

describe('the graph of some packs', () => {
  const garden = numberGardenPack();

  it('has each activity’s skills, the ones it asks alone, and how many presentations each skill has', () => {
    const graph = graphOf([garden]);
    expect(graph.worlds).toEqual([
      { id: 'number-garden', lessons: garden.lessons.map((each) => each.id) },
    ]);
    expect(graph.lessons['ng-same-amount-01']).toEqual({
      world: 'number-garden',
      skills: ['math.quantity.match-sets-to-3'],
      asks: ['math.quantity.match-sets-to-3'],
    });
    expect(graph.skills['math.quantity.subitize-to-4']).toEqual({
      world: 'number-garden',
      needs: ['math.quantity.match-sets-to-3'],
      lessons: ['ng-glance-01'],
      variants: 10,
      // Three amounts to choose from.
      chance: 0.3333,
    });
    // The first activity's questions that are shown and practised with the guide have two pictures to choose
    // from; those asked alone have three, and only those say how easy the skill is to guess.
    expect(graph.skills['math.quantity.match-sets-to-3']?.chance).toBe(0.3333);
    expect(auditGraph(graph)).toEqual([]);
  });

  it('takes how easy a skill is to guess from the questions drawn for every sitting, and from the rest only where it has none of those', () => {
    const SKILL = 'math.quantity.match-sets-to-3';
    const guessed = (change: (plan: ContentPack['lessons'][number]['plan']) => void) => {
      const changed = structuredClone(garden);
      const first = changed.lessons.find((each) => each.id === 'ng-same-amount-01');
      if (!first) throw new Error('The garden has lost its first activity.');
      change(first.plan);
      return { chance: graphOf([changed]).skills[SKILL]?.chance, concept: conceptsOf(changed)[0] };
    };
    const asideFromTheGuide = (plan: { guided: string[] }) => {
      plan.guided = plan.guided.filter((id) => id !== 'ng-same-amount-01.guided-one');
    };

    // A question with two pictures is taken out of the practice with the guide: it is now asked only at times.
    // The questions drawn for every sitting have three, and they are what counts.
    const aside = guessed(asideFromTheGuide);
    expect(aside.concept?.questions).toEqual({ shown: 1, guided: 1, alone: 5, attimes: 1 });
    expect(aside.chance).toBe(0.3333);
    // With nothing drawn for every sitting, the questions asked at times are all there is to go by: here the
    // five with three pictures. The two practised with the guide have two, and are still not asked alone.
    const undrawn = guessed((plan) => {
      plan.independent.pool = [];
    });
    expect(undrawn.concept?.questions).toEqual({ shown: 1, guided: 2, alone: 0, attimes: 5 });
    expect(undrawn.chance).toBe(0.3333);
    // And with the two-picture question among those asked at times, it is the easiest of them to guess.
    const both = guessed((plan) => {
      asideFromTheGuide(plan);
      plan.independent.pool = [];
    });
    expect(both.chance).toBe(0.5);
  });

  it('gives a concept in full: its questions by how they are used, each mistake they tell apart once, and the longest ladder of help', () => {
    const [matching] = conceptsOf(garden);
    expect(matching).toMatchObject({
      skillId: 'math.quantity.match-sets-to-3',
      lessons: ['ng-same-amount-01'],
      questions: { shown: 1, guided: 2, alone: 5, attimes: 0 },
      sittings: [{ lesson: 'ng-same-amount-01', drawn: 3, from: 5, again: 1 }],
      // Eight questions tell four mistakes apart, most of them several times over.
      misconceptions: ['one-fewer', 'many-more', 'one-more', 'many-fewer'],
      hintLadder: ['model', 'eliminate', 'reveal'],
    });
    expect(matching?.variants).toHaveLength(8);
    expect(matching?.examples.map((example) => example.challengeId)).toEqual([
      'ng-same-amount-01.demo-two',
      'ng-same-amount-01.guided-one',
      'ng-same-amount-01.guided-three',
    ]);

    const concepts = conceptsOf(fixturePack());
    const called = (id: string) => concepts.find((concept) => concept.skillId === id);
    const making = called('memory.fixture.making');
    expect(making?.questions).toEqual({ shown: 2, guided: 3, alone: 14, attimes: 0 });
    expect(making?.sittings).toEqual([
      { lesson: 'fx-make-01', drawn: 11, from: 11, again: 0 },
      { lesson: 'fx-keep-01', drawn: 2, from: 3, again: 1 },
    ]);
    // The last of its questions offers two rungs of help, and one of them a single rung: the ladder is the
    // longest any of them has.
    expect(making?.hintLadder).toEqual(['model', 'step', 'reveal']);
    // Asked straight after another question, at the end of a sitting, or at the start of the next: never drawn.
    expect(called('memory.fixture.unaided')?.questions).toEqual({
      shown: 0,
      guided: 0,
      alone: 0,
      attimes: 5,
    });
    expect(called('memory.fixture.kept')?.questions).toEqual({
      shown: 0,
      guided: 0,
      alone: 0,
      attimes: 9,
    });
    expect(called('memory.fixture.kept')?.sittings).toEqual([]);
  });

  it('leaves out a skill no question is for, and a world with no pack', () => {
    const idle: ContentPack = {
      ...garden,
      skills: [
        ...garden.skills,
        {
          id: 'math.nothing.asks-this',
          world: 'number-garden',
          strand: 'number-sense',
          title: 'Not asked',
          objective: 'Nothing asks this.',
          prerequisites: [],
        },
      ],
    };
    const graph = graphOf([idle]);
    expect(graph.skills['math.nothing.asks-this']).toBeUndefined();
    expect(Object.keys(graph.packs)).toEqual(['number-garden']);
    expect(conceptsOf(idle).map((concept) => concept.skillId)).not.toContain(
      'math.nothing.asks-this',
    );
  });

  it('counts a question asked only at times apart from those asked in every sitting', () => {
    const fixture = fixturePack();
    const graph = graphOf([fixture]);
    const [made] = fixture.lessons;
    expect(made).toBeDefined();
    const concepts = conceptsOf(fixture);
    for (const concept of concepts) {
      const { shown, guided, alone, attimes } = concept.questions;
      const own = fixture.lessons.flatMap((each) =>
        each.challenges.filter((challenge) => challenge.skillId === concept.skillId),
      );
      expect(shown + guided + alone + attimes).toBe(own.length);
      expect(graph.skills[concept.skillId]?.variants).toBe(concept.variants.length);
    }
  });
});
