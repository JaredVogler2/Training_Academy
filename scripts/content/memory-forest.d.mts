import type { BuiltPack } from './packs.d.mts';

export function buildMemoryForestPack(): BuiltPack;
export function buildMemoryForestVoice(): {
  about: string;
  groups: Record<string, Record<string, Record<string, string>>>;
};

/** What Glim calls each way of looking at things to remember, by the key of its recording. */
export const WAY_LINES: {
  readonly 'mf.ways.groups': string;
  readonly 'mf.ways.story': string;
  readonly 'mf.ways.places': string;
};
