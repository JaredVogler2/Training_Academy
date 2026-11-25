import type { ComponentType } from 'react';
import { loadChunk } from '@/app/chunks';
import { addVoice, type Timbre, type VoiceBank } from '@/audio';
import type { Challenge, MakeChallenge, Stimulus, WorldId } from '@/engine';
import type { BoardProps } from '@/game/lesson/frame';
import type { ChooseSituation, MakeSituation, Script } from '@/game/lesson/script';

/**
 * A world's own code: how its challenges are drawn, how its questions are shown off, the boards of the games only
 * it has, and its lines for the voice. Each is a separate chunk, fetched the first time that world is entered and
 * never before.
 */

export interface PictureProps {
  stimulus: Stimulus;
  /** When true, the things in the picture light up one after another: "count them with me". */
  counting?: boolean;
  /** Where it is being shown, for a picture that is drawn differently as a question than as an answer. */
  place?: 'prompt' | 'choice' | 'card';
  /** It is being named or played at this moment. */
  sounding?: boolean;
  /** Which of the things in it is being played, from 0, where it has more than one (two singers side by side). */
  part?: number | undefined;
  /**
   * What it asks has just been answered, and the answer is being shown beside it. A picture with a gap in it — a
   * story with its ending missing — shows what belongs there.
   */
  solved?: boolean;
  /** Given to a picture that is itself something to tap (a sound to hear again): what tapping it asks for. */
  onAgain?: () => void;
}

export interface WorldModule {
  Picture: ComponentType<PictureProps>;
  /**
   * The picture in words, for screen readers: "two snails". Where it is what a question is asked about, the words
   * say so: "the group to match: two snails".
   */
  describe(stimulus: Stimulus, place?: 'prompt' | 'choice' | 'card'): string;
  /** How many separate things the picture holds, where counting them is how this world teaches. */
  countable?(stimulus: Stimulus): number;
  /** How this world shows off a question with choices. Left out, the lesson frame points and lights. */
  chooseScript?(situation: ChooseSituation): Script;
  /**
   * How this world shows off a thing to make, where it has more to say than the board does on its own (a story
   * told card by card). `null` leaves it to the board.
   */
  makeScript?(situation: MakeSituation, challenge: MakeChallenge): Script | null;
  /**
   * The clip a picture makes of its own accord when it is tapped or lit — a drum's thump — where it is a thing
   * that makes a sound. `null` for everything else, which gets the frame's counting notes instead.
   */
  soundOf?(stimulus: Stimulus): string | null;
  /**
   * The note a picture plays when it is tapped or lit, where it is an instrument: a chime bar's own pitch. `null`
   * for everything else.
   */
  toneOf?(stimulus: Stimulus): { timbre: Timbre; pitch: string | number } | null;
  /**
   * Things to echo stand in a row in the order they are written, like the bars of a keyboard, with nothing round
   * them: the board lays them out so, where this says `row`.
   */
  echoLayout?: 'row';
  /**
   * Boards for games only this world has, by what they are for: a kind of task (`program`), or a scene a question
   * is asked about (`scene:map`). The lesson frame has boards of its own for everything else.
   */
  boards?: Readonly<Record<string, ComponentType<BoardProps>>>;
  /**
   * Lines a challenge is told with beside its own instruction, feedback and hints (the lines of a story's
   * pictures), so that they can be fetched before they are wanted.
   */
  linesFor?(challenge: Challenge): string[];
  /** This world's lines for the voice. */
  voice: VoiceBank;
}

const MODULES: Partial<Record<WorldId, () => Promise<{ default: WorldModule }>>> = {
  'reading-cove': () => import('./reading-cove'),
  'number-garden': () => import('./number-garden'),
  'robot-ridge': () => import('./robot-ridge'),
  'memory-forest': () => import('./memory-forest'),
  'inventor-island': () => import('./inventor-island'),
  'explorer-harbor': () => import('./explorer-harbor'),
  'music-lab': () => import('./music-lab'),
};

export function hasWorldModule(world: WorldId): boolean {
  return world in MODULES;
}

export function loadWorldModule(world: WorldId): Promise<WorldModule> {
  const loader = MODULES[world];
  if (!loader) return Promise.reject(new Error(`${world} has no module yet.`));
  return loadChunk(`module:${world}`, loader).then((module) => {
    addVoice(module.default.voice);
    return module.default;
  });
}
