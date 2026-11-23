import { lintPack, type LintIssue } from '@/content/lint';
import type { ContentPack } from '@/engine';

/**
 * A pack to break on purpose. It is handed over untyped: the point of these tests is to write what the types would
 * refuse, and see that the lint refuses it too.
 */
export type Loose = Record<string, any>;

export const codes = (issues: LintIssue[]): string[] => issues.map((issue) => issue.code);

/** A deep copy of a pack, broken, and linted with its own world's rules. */
export function breaking(pack: () => ContentPack): (mutate: (pack: Loose) => void) => LintIssue[] {
  return (mutate) => {
    const copy = structuredClone(pack());
    mutate(copy);
    return lintPack(copy);
  };
}

/** The challenge of a pack with this id. */
export function challengeIn(pack: Loose, id: string): Loose {
  for (const lesson of pack.lessons as Loose[]) {
    const found = (lesson.challenges as Loose[]).find((challenge) => challenge.id === id);
    if (found) return found;
  }
  throw new Error(`The pack has no challenge called ${id}.`);
}

/** The names of the rules a source file can report: every hyphenated word in quotes that is not known data. */
export function rulesIn(source: string, data: readonly string[]): string[] {
  return [
    ...new Set([...source.matchAll(/'([a-z]+(?:-[a-z]+)+)'/g)].map((match) => match[1] ?? '')),
  ]
    .filter((name) => !data.includes(name))
    .sort();
}
