import { useEffect, useState } from 'react';
import { hushVoice, playCount, playCue, playTone, sayLine } from '@/audio';
import { REST, type Beat, type Script } from './script';

export interface Playing {
  beat: Beat;
  /** Goes up with every beat, so a picture can start its animation afresh each time it is its turn. */
  turn: number;
  /**
   * Something has been uncovered for a look in this run. Until it has, a board that is waiting for that look
   * offers nothing to answer with.
   */
  glanced: boolean;
  /**
   * This run of the script has played to its end: everything it shows has been shown, and the board is where it
   * comes to rest. A board says so on the page (`data-shown`), for anything that would measure the board or
   * read it: until then one of its pictures may be lifted, lit or half-way somewhere.
   */
  over: boolean;
}

/**
 * Plays a script on the board: the beat to show now, and its notes and spoken lines as they fall due.
 *
 * A new `run` starts from the top. While `active` is false — the activity is paused, or the page is out of sight —
 * nothing plays, and the script starts from the top when it is active again (a demonstration half-seen is shown
 * whole). With `calm` set nothing moves and nothing is counted: the board goes straight to where the script comes
 * to rest, which shows the same thing standing still. The lines are still spoken, in their order: someone who has
 * asked for less movement has not asked for silence. A script that is `essential` — one where what is shown *is*
 * the task, like a group to be taken in at a glance, or a tune to listen to — plays even then: the board says so,
 * or the script does.
 */
export function useScript(
  script: Script,
  run: string,
  active: boolean,
  calm: boolean,
  essential = false,
): Playing {
  const [shown, setShown] = useState<Playing & { run: string }>({
    run: '',
    beat: REST,
    turn: 0,
    glanced: false,
    over: false,
  });
  const still = calm && !(essential || script.essential === true);

  useEffect(() => {
    if (!active) return;
    let turn = 0;
    let glanced = false;
    const timers = script.moments.map((moment) =>
      window.setTimeout(() => {
        const { sound, beat } = moment;
        if (sound?.kind === 'say') sayLine(sound.key);
        else if (still) return;
        else if (sound?.kind === 'count') playCount(sound.index);
        else if (sound?.kind === 'cue') playCue(sound.cue);
        else if (sound?.kind === 'tone') playTone(sound.timbre, sound.pitch);
        if (beat && !still) {
          turn += 1;
          glanced ||= beat.show === 'glance';
          setShown({ run, beat, turn, glanced, over: false });
        }
      }, moment.at),
    );
    // After the last of them, at the moment the script comes to rest: this run is over. (Asked for last, so that
    // of two things due at the same moment it is the later.)
    timers.push(
      window.setTimeout(() => {
        setShown((now) =>
          now.run === run
            ? { ...now, over: true }
            : { run, beat: script.settled, turn, glanced, over: true },
        );
      }, script.length),
    );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      // Whatever was being said belonged to what was being shown.
      hushVoice();
    };
  }, [script, run, active, still]);

  // Standing still, nothing will be uncovered: whatever a look would have shown is not waited for.
  if (still) return { beat: script.settled, turn: 0, glanced: true, over: true };
  if (active && shown.run === run) return shown;
  // Until this run's first moment arrives, the board shows what the script opens with, if it opens with
  // anything at its very start (a story as it stood before anyone moved), and otherwise is at rest. That moment
  // is at most a frame away; without this, that frame would show a story already over. Whenever nothing is
  // playing, the board is at rest.
  const opening = active
    ? script.moments.find((moment) => moment.at === 0 && moment.beat !== undefined)?.beat
    : undefined;
  return { beat: opening ?? REST, turn: 0, glanced: false, over: false };
}
