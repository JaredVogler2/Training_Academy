import { dayNumber } from './days';
import { isIndependentProbe, isIndependentSuccess, showsTheSkill } from './evidence';
import type { Attempt } from './schema';

export interface DayDone {
  day: string;
  lessons: Set<string>;
  answers: number;
  alone: number;
  aloneRight: number;
  rightWithHelp: number;
  firstTimeAlone: Set<string>;
}

export function dayByDay(attempts: readonly Attempt[]): DayDone[] {
  const days = new Map<string, DayDone>();
  const seen = new Set<string>();
  const skills = new Set<string>();
  const ordered = [...attempts].sort(
    (a, b) => a.day.localeCompare(b.day) || a.at - b.at || a.id.localeCompare(b.id),
  );
  for (const attempt of ordered) {
    if (seen.has(attempt.id) || dayNumber(attempt.day) === null) continue;
    seen.add(attempt.id);
    const day = days.get(attempt.day) ?? {
      day: attempt.day,
      lessons: new Set<string>(),
      answers: 0,
      alone: 0,
      aloneRight: 0,
      rightWithHelp: 0,
      firstTimeAlone: new Set<string>(),
    };
    days.set(attempt.day, day);
    day.lessons.add(attempt.lessonId);
    day.answers += 1;
    if (isIndependentProbe(attempt)) day.alone += 1;
    if (isIndependentSuccess(attempt)) {
      day.aloneRight += 1;
      if (!skills.has(attempt.skillId)) day.firstTimeAlone.add(attempt.skillId);
      skills.add(attempt.skillId);
    } else if (!isIndependentProbe(attempt) && showsTheSkill(attempt)) {
      day.rightWithHelp += 1;
    }
  }
  return [...days.values()].reverse();
}
