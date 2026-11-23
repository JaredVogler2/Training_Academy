import type { BuiltPack } from './packs.d.mts';

export const root: string;
export function packPath(pack: BuiltPack): string;
export function packText(pack: BuiltPack): Promise<string>;
