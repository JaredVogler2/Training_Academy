import { useEffect, useState } from 'react';
import { playCount, playCue } from '@/audio';
import type { Beat, Script } from './script';

const REST: Beat = { show: 'rest' };

export interface Playing {
  beat: Beat;
  /** Goes up with every beat, so a picture can start its animation afresh each time it is its turn. */
  turn: number;
}

/**
 * Plays a script on the board: the beat to show now, and its notes as they fall due.
 *
 * A new `run` starts from the top. While `active` is false — the activity is paused, or the page is out of sight —
 * nothing plays, and the script starts from the top when it is active again (a demonstration half-seen is shown
 * whole). With `calm` set nothing moves and nothing is counted aloud: the board goes straight to where the script
 * comes to rest, which shows the same thing standing still.
 */
export function useScript(script: Script, run: string, active: boolean, calm: boolean): Playing {
  const [shown, setShown] = useState<Playing & { run: string }>({ run: '', beat: REST, turn: 0 });

  useEffect(() => {
    if (!active || calm) return;
    let turn = 0;
    const timers = script.moments.map((moment) =>
      window.setTimeout(() => {
        const { sound, beat } = moment;
        if (sound?.kind === 'count') playCount(sound.index);
        else if (sound?.kind === 'cue') playCue(sound.cue);
        if (beat) {
          turn += 1;
          setShown({ run, beat, turn });
        }
      }, moment.at),
    );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [script, run, active, calm]);

  if (calm) return { beat: script.settled, turn: 0 };
  // Until this run's first moment arrives (and whenever it is not playing), the board is at rest.
  return active && shown.run === run ? shown : { beat: REST, turn: 0 };
}
