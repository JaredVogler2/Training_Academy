import type { BuiltPack } from './packs.d.mts';

export function buildExplorerHarborPack(): BuiltPack;
export function buildExplorerHarborVoice(): {
  about: string;
  groups: Record<string, Record<string, Record<string, string>>>;
};
