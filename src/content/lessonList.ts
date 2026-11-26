import list from './lessonList.json';

/**
 * What an activity is called and about how many minutes it takes, known before its world's content has been
 * fetched: a page that lists activities is whole from its first moment, and nothing on it moves when the content
 * arrives. (`npm run content` writes the list from the packs, and a test holds the two together.)
 */
const LESSONS: Readonly<Record<string, { title: string; minutes: number }>> = list.lessons;

export function lessonCalled(id: string): { title: string; minutes: number } | null {
  return Object.hasOwn(LESSONS, id) ? (LESSONS[id] ?? null) : null;
}
