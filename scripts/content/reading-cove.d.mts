import type { BuiltPack } from './packs.d.mts';

export const LETTER_LESSONS: string[][];
export function buildReadingCovePack(): BuiltPack;
export function buildReadingCoveVoice(): {
  about: string;
  groups: Record<string, Record<string, Record<string, string>>>;
};
