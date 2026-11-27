import { useEffect, useState } from 'react';
import { loadChunk } from '@/app/chunks';
import { recordError } from '@/app/diagnostics';
import { hasPack, loadPack } from '@/content';
import { loadConceptGraph } from '@/content/concepts';
import { WORLD_IDS, type Skill, type WorldId } from '@/engine';
import type { ConceptGraph } from '@/engine/graph';

/** Something that has to be fetched before anything can be said: not here yet, here, or not to be had. */
export type Fetched<T> = { state: 'waiting' } | { state: 'trouble' } | { state: 'here'; value: T };

export const WAITING = { state: 'waiting' } as const;
export const TROUBLE = { state: 'trouble' } as const;

/** What each world with content teaches, world by world, in the order the worlds are met. */
export function useSkills(): Fetched<{ world: WorldId; skills: Skill[] }[]> {
  const [skills, setSkills] = useState<Fetched<{ world: WorldId; skills: Skill[] }[]>>(WAITING);
  useEffect(() => {
    let current = true;
    Promise.all(WORLD_IDS.filter(hasPack).map((world) => loadPack(world))).then(
      (packs) => {
        if (!current) return;
        setSkills({
          state: 'here',
          value: packs.map((pack) => ({ world: pack.world, skills: pack.skills })),
        });
      },
      (error: unknown) => {
        recordError('chunk', error);
        if (current) setSkills(TROUBLE);
      },
    );
    return () => {
      current = false;
    };
  }, []);
  return skills;
}

/** The concept graph: what each skill builds on, and how easy its questions are to get right by luck. */
export function useGraph(): Fetched<ConceptGraph> {
  const [graph, setGraph] = useState<Fetched<ConceptGraph>>(WAITING);
  useEffect(() => {
    let current = true;
    loadChunk('concepts', loadConceptGraph).then(
      (value) => {
        if (current) setGraph({ state: 'here', value });
      },
      () => {
        if (current) setGraph(TROUBLE);
      },
    );
    return () => {
      current = false;
    };
  }, []);
  return graph;
}
