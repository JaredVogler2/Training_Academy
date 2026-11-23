import type { Challenge, ContentPack, Lesson } from '@/engine';

export type Severity = 'error' | 'warning';
export type Report = (code: string, message: string, severity?: Severity) => void;

/**
 * A world's own check that each of its challenges is right: that the answer marked is the one and only answer,
 * and that what is offered beside it is wrong for a reason someone chose.
 */
export type WorldRules = (
  challenge: Challenge,
  lesson: Lesson,
  report: Report,
  pack: ContentPack,
) => void;
