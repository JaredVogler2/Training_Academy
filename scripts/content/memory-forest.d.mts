import type { BuiltPack } from './packs.d.mts';

export function buildMemoryForestPack(): BuiltPack;
export function buildMemoryForestVoice(): {
  about: string;
  groups: Record<string, Record<string, Record<string, string>>>;
};
