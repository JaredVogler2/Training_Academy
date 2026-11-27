import { useEffect, useState } from 'react';
import { loadChunk } from '@/app/chunks';
import { recordError } from '@/app/diagnostics';
import { hasPack, loadPack } from '@/content';
import { loadConceptGraph } from '@/content/concepts';
import {
  WORLD_IDS,
  type Attempt,
  type ContentPack,
  type Profile,
  type Skill,
  type WorldId,
} from '@/engine';
import { getRepository } from '@/game/services';
import type { ConceptGraph } from '@/engine/graph';

/** Something that has to be fetched before anything can be said: not here yet, here, or not to be had. */
export type Fetched<T> = { state: 'waiting' } | { state: 'trouble' } | { state: 'here'; value: T };

export const WAITING = { state: 'waiting' } as const;
export const TROUBLE = { state: 'trouble' } as const;

type WorldSkills = { world: WorldId; skills: Skill[]; pack: ContentPack };

/** What each world with content teaches, world by world, in the order the worlds are met. */
export function useSkills(): Fetched<WorldSkills[]> {
  const [skills, setSkills] = useState<Fetched<WorldSkills[]>>(WAITING);
  useEffect(() => {
    let current = true;
    Promise.all(WORLD_IDS.filter(hasPack).map((world) => loadPack(world))).then(
      (packs) => {
        if (!current) return;
        setSkills({
          state: 'here',
          value: packs.map((pack) => ({ world: pack.world, skills: pack.skills, pack })),
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

/**
 * Every answer recorded for a player. It is read again whenever the player's entry is read again (a copy has
 * been loaded into it, perhaps with more answers); what was read before stays on the page until the new reading
 * is in. What was read for one player is never given for another.
 */
export function useRecord(profile: Profile | null): Fetched<Attempt[]> {
  const [read, setRead] = useState<{ of: string; record: Fetched<Attempt[]> } | null>(null);
  useEffect(() => {
    if (!profile) return;
    const { id } = profile;
    let current = true;
    getRepository()
      .then((repository) => repository.listAttempts(id))
      .then(
        (attempts) => {
          if (current) setRead({ of: id, record: { state: 'here', value: attempts } });
        },
        (error: unknown) => {
          recordError('storage', error);
          if (current) setRead({ of: id, record: TROUBLE });
        },
      );
    return () => {
      current = false;
    };
  }, [profile]);
  return read !== null && read.of === profile?.id ? read.record : WAITING;
}
