import { loadPack } from '@/content';
import type { Lesson } from '@/engine';
import { WORLDS, lessonsOf } from '@/game/worlds';
import type { ExportBundle } from '@/storage/transfer';

/**
 * Whether everything a saved copy refers to is in this game: every activity its answers and sittings name, and,
 * in each, the questions they name, with the skill each question was written for. Only the worlds the copy refers
 * to are loaded. It says what is wrong, in words for a grown-up, or `null` when nothing is.
 *
 * A lesson that changes is given a new version (`lessons.lock.json`), and a copy can hold answers and sittings
 * from a version this game no longer has: a child's own record, saved before an update. Those are checked as far
 * as they can be (the activity is here, and each question's id is one of that activity's own), and are never
 * refused for a question the newer version has dropped. Only what was played in the version this game has is
 * checked question by question. A copy holding a version newer than this game's was saved by a newer game, and is
 * refused with a word on how to update.
 */
export async function checkBackupContent({
  attempts,
  sessions,
}: ExportBundle): Promise<string | null> {
  const referenced = new Set([...sessions, ...attempts].map(({ lessonId }) => lessonId));
  const worlds = WORLDS.filter((world) => lessonsOf(world).some((id) => referenced.has(id)));
  const packs = await Promise.all(worlds.map(({ id }) => loadPack(id)));
  const lessons = new Map<string, Lesson>(
    packs.flatMap(({ lessons }) => lessons.map((lesson) => [lesson.id, lesson] as const)),
  );
  for (const id of referenced) {
    if (!lessons.has(id)) return `The file refers to an unknown activity (${id}).`;
  }
  const skillOf = new Map(
    [...lessons].map(([id, lesson]) => [
      id,
      new Map(lesson.challenges.map((challenge) => [challenge.id, challenge.skillId])),
    ]),
  );

  /** What is wrong with one question named in the copy, as played in `version` of `lessonId`; `null` if nothing. */
  const question = (
    lessonId: string,
    version: number,
    challengeId: string,
    skillId?: string,
  ): string | null => {
    const lesson = lessons.get(lessonId);
    if (!lesson) return `The file refers to an unknown activity (${lessonId}).`;
    if (version > lesson.version) return NEWER;
    const unknown = `The file refers to an unknown question (${challengeId}).`;
    if (!challengeId.startsWith(`${lessonId}.`)) return unknown;
    if (version < lesson.version) return null;
    const written = skillOf.get(lessonId)?.get(challengeId);
    if (written === undefined) return unknown;
    return skillId === undefined || written === skillId ? null : unknown;
  };

  for (const attempt of attempts) {
    const wrong = question(
      attempt.lessonId,
      attempt.lessonVersion,
      attempt.challengeId,
      attempt.skillId,
    );
    if (wrong) return wrong;
  }
  for (const session of sessions) {
    // A sitting just begun may name no question yet: its version is enough to know it is from a newer game.
    if (session.lessonVersion > (lessons.get(session.lessonId)?.version ?? 0)) return NEWER;
    const named = session.steps.flatMap(({ challengeId, reprobeOf }) =>
      reprobeOf ? [challengeId, reprobeOf] : [challengeId],
    );
    for (const challengeId of [...named, ...session.reserve]) {
      const wrong = question(session.lessonId, session.lessonVersion, challengeId);
      if (wrong) return wrong;
    }
  }
  return null;
}

const NEWER =
  'This copy was saved by a newer version of Training Academy. Open the game while online so that it can update, then load the copy again.';
