import { DRUM_HZ, type Timbre } from '@/audio';
import { pitchOf, type Stimulus } from '@/engine';

/**
 * What the Music Lab's pictures play. A picture of one player has one phrase; a picture of two has two. Nothing here
 * makes a sound: these are the notes, and how long each lasts, for the scripts and the boards to play.
 */

/** A short knock, in milliseconds. A long one is two; one even note of a tune is two as well. */
export const STEP_MS = 270;
/** A breath between one player and the next. */
export const BETWEEN_MS = 380;

export type Voice = 'pipe' | 'bar' | 'drum';

export interface Stroke {
  timbre: Timbre;
  /** A note by name, or, for a drum, a pitch in hertz. */
  pitch: string | number;
  /** How long until the next stroke, in milliseconds. */
  lasts: number;
}

export interface Phrase {
  voice: Voice;
  strokes: Stroke[];
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((each): each is string => typeof each === 'string') : [];
const numbers = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((each): each is number => typeof each === 'number') : [];

function voiceOf(value: unknown): Voice {
  return value === 'bar' || value === 'drum' ? value : 'pipe';
}

function phrase(voice: Voice, notes: unknown, steps: unknown): Phrase {
  if (voice === 'drum') {
    return {
      voice,
      strokes: numbers(steps).map((step) => ({
        timbre: 'drum',
        pitch: DRUM_HZ,
        lasts: step * STEP_MS,
      })),
    };
  }
  return {
    voice,
    strokes: strings(notes).map((note) => ({ timbre: voice, pitch: note, lasts: 2 * STEP_MS })),
  };
}

/** What a picture plays: one phrase for each player in it, in the order they play. Empty for a picture of nothing. */
export function phrasesOf(stimulus: Stimulus): Phrase[] {
  if (stimulus.type !== 'scene') return [];
  const { scene, of } = stimulus;
  if (scene === 'bar') return [phrase('bar', [of.note], undefined)];
  if (scene === 'phrase') return [phrase(voiceOf(of.voice), of.notes, of.steps)];
  if (scene === 'pair') {
    const voice = voiceOf(of.voice);
    return [phrase(voice, of.first, of.firstSteps), phrase(voice, of.second, of.secondSteps)];
  }
  return [];
}

/** How long a phrase takes to play, in milliseconds. */
export function lengthOf(played: Phrase): number {
  return played.strokes.reduce((total, stroke) => total + stroke.lasts, 0);
}

/** How long a chime bar is drawn, as a share of the longest: a low bar is a long bar. */
export function barLength(note: string): number {
  const pitch = pitchOf(note) ?? 60;
  // Middle C is the longest; two octaves above it, a bar is under half as long.
  return Math.max(0.42, Math.min(1, 1 - (pitch - 60) * 0.0235));
}
