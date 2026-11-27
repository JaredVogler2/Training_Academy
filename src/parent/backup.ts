import { loadPack } from '@/content';
import { WORLDS, lessonsOf } from '@/game/worlds';
import type { ExportBundle } from '@/storage/transfer';

/** Published lessons retain their challenge identifiers across releases. Load only the worlds a copy refers to. */
export async function checkBackupContent({
  attempts,
  sessions,
}: ExportBundle): Promise<string | null> {
  const referenced = new Set([...sessions, ...attempts].map(({ lessonId }) => lessonId));
  const worlds = WORLDS.filter((world) => lessonsOf(world).some((id) => referenced.has(id)));
  const packs = await Promise.all(worlds.map(({ id }) => loadPack(id)));
  const lessons = new Map(
    packs.flatMap(({ lessons }) => lessons.map((lesson) => [lesson.id, lesson] as const)),
  );
  for (const id of referenced) {
    if (!lessons.has(id)) return `The file refers to an unknown lesson (${id}).`;
  }

  const challenges = new Map(
    [...lessons].map(([id, lesson]) => [
      id,
      new Map(lesson.challenges.map((challenge) => [challenge.id, challenge.skillId])),
    ]),
  );
  for (const attempt of attempts) {
    if (challenges.get(attempt.lessonId)?.get(attempt.challengeId) !== attempt.skillId) {
      return `The file refers to an unknown question (${attempt.challengeId}).`;
    }
  }
  for (const session of sessions) {
    const known = challenges.get(session.lessonId);
    const steps = session.steps.flatMap(({ challengeId, reprobeOf }) =>
      reprobeOf ? [challengeId, reprobeOf] : [challengeId],
    );
    const unknown = [...steps, ...session.reserve].find((id) => !known?.has(id));
    if (unknown) return `The file refers to an unknown question (${unknown}).`;
  }
  return null;
}
