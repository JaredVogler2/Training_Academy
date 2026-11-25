export interface BuiltPack {
  world: string;
  contentVersion: number;
  lessons: { id: string; version: number; [key: string]: unknown }[];
  [key: string]: unknown;
}
