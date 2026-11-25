import type { BuiltPack } from './packs.d.mts';

export const root: string;
export function packPath(pack: BuiltPack): string;
export function packText(pack: BuiltPack): Promise<string>;
export function voiceLinesPath(world: string): string;
export function voiceLinesText(lines: unknown): Promise<string>;

export const lockPath: string;
export const LOCK_ABOUT: string;
export function lessonKey(lesson: { id: string; version: number }): string;
export function lessonMark(lesson: unknown): string;
export function readLock(): Record<string, string>;
export function lockLessons(
  packs: readonly { lessons: readonly { id: string; version: number }[] }[],
  lock: Record<string, string>,
): { lessons: Record<string, string>; changed: string[] };
export function lockText(lessons: Record<string, string>): Promise<string>;
