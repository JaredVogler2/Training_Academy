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

/** What every activity is called and about how many minutes it takes: `src/content/lessonList.json`. */
export const lessonListPath: string;
export function lessonList(packs: readonly BuiltPack[]): {
  about: string;
  lessons: Record<string, { title: string; minutes: number }>;
};
export function lessonListText(packs: readonly BuiltPack[]): Promise<string>;

/** What is taught, what each skill builds on and which activity teaches it: `src/content/concepts.json`. */
export const conceptGraphPath: string;
export const CONCEPT_GRAPH_ABOUT: string;
export function loadGraphMaker(): Promise<{
  graphOf(packs: readonly BuiltPack[]): unknown;
  close(): Promise<void>;
}>;
export function conceptGraphText(graph: unknown): Promise<string>;
