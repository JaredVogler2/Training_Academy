import { useEffect, useState } from 'react';
import { hushVoice, playCount, playCue, sayLine } from '@/audio';
import { REST, type Beat, type Script } from './script';

export interface Playing {
  beat: Beat;
  /** Goes up with every beat, so a picture can start its animation afresh each time it is its turn. */
  turn: number;
}

/**
 * Plays a script on the board: the beat to show now, and its notes and spoken lines as they fall due.
 *
 * A new `run` starts from the top. While `active` is false — the activity is paused, or the page is out of sight —
 * nothing plays, and the script starts from the top when it is active again (a demonstration half-seen is shown
 * whole). With `calm` set nothing moves and nothing is counted: the board goes straight to where the script comes
 * to rest, which shows the same thing standing still. The lines are still spoken, in their order: someone who has
 * asked for less movement has not asked for silence. A script that is `essential` — one where what is shown *is*
 * the task, like a group to be taken in at a glance — plays even then.
 */
export function useScript(
  script: Script,
  run: string,
  active: boolean,
  calm: boolean,
  essential = false,
): Playing {
  const [shown, setShown] = useState<Playing & { run: string }>({ run: '', beat: REST, turn: 0 });
  const still = calm && !essential;

  useEffect(() => {
    if (!active) return;
    let turn = 0;
    const timers = script.moments.map((moment) =>
      window.setTimeout(() => {
        const { sound, beat } = moment;
        if (sound?.kind === 'say') sayLine(sound.key);
        else if (still) return;
        else if (sound?.kind === 'count') playCount(sound.index);
        else if (sound?.kind === 'cue') playCue(sound.cue);
        if (beat && !still) {
          turn += 1;
          setShown({ run, beat, turn });
        }
      }, moment.at),
    );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      // Whatever was being said belonged to what was being shown.
      hushVoice();
    };
  }, [script, run, active, still]);

  if (still) return { beat: script.settled, turn: 0 };
  // Until this run's first moment arrives (and whenever it is not playing), the board is at rest.
  return active && shown.run === run ? shown : { beat: REST, turn: 0 };
}
