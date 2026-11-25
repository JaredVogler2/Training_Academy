import type { Stimulus } from '@/engine';
import type { PictureProps, WorldModule } from '../modules';
import { BeatBoard } from './BeatBoard';
import { TuneBoard } from './TuneBoard';
import { Bar, BeatPicture, Player, Sign } from './pictures';
import type { Voice } from './phrases';
import { chooseScript, makeScript } from './script';
import { musicText } from './text';
import { voice } from './voice';
import styles from './musicLab.module.css';

/** The Music Lab: high and low, a steady beat, a tune of your own. */

const voiceOf = (value: unknown): Voice => (value === 'bar' || value === 'drum' ? value : 'pipe');

function Picture({ stimulus, sounding = false, part }: PictureProps) {
  switch (stimulus.type) {
    case 'sign':
      return <Sign id={stimulus.id} />;
    case 'scene': {
      const { scene, of } = stimulus;
      if (scene === 'bar') return <Bar note={String(of.note)} sounding={sounding} />;
      if (scene === 'phrase') {
        return <Player voice={voiceOf(of.voice)} big={of.big === true} sounding={sounding} />;
      }
      if (scene === 'pair') {
        // Two who play one after the other: each is lifted in its own turn.
        return (
          <span className={styles.pair} data-scene="pair">
            {[0, 1].map((index) => (
              <span
                key={index}
                className={styles.one}
                data-part={index}
                data-sounding={sounding && part === index}
              >
                <Player voice={voiceOf(of.voice)} sounding={sounding && part === index} />
              </span>
            ))}
          </span>
        );
      }
      if (scene === 'beat') return <BeatPicture beats={Number(of.beats)} />;
      return null;
    }
    // Things other worlds draw.
    case 'quantity':
    case 'picture':
    case 'sound':
    case 'letter':
    case 'word':
      return null;
  }
}

/**
 * The picture in words. What someone plays is not said: it is the thing to be listened for, and the page does not
 * give it away to anyone, by any road.
 */
export function describe(stimulus: Stimulus): string {
  switch (stimulus.type) {
    case 'sign':
      return musicText.signs[stimulus.id] ?? '';
    case 'scene': {
      const { scene, of } = stimulus;
      if (scene === 'bar') return musicText.bar(String(of.note));
      if (scene === 'phrase') return musicText.singer(String(of.voice), of.big === true);
      if (scene === 'pair') return musicText.pair(String(of.voice));
      if (scene === 'beat') return musicText.beat(Number(of.tempo));
      return '';
    }
    case 'quantity':
    case 'picture':
    case 'sound':
    case 'letter':
    case 'word':
      return '';
  }
}

/** A chime bar plays its own note when it is tapped. */
function toneOf(stimulus: Stimulus) {
  if (stimulus.type !== 'scene' || stimulus.scene !== 'bar') return null;
  return { timbre: 'bar' as const, pitch: String(stimulus.of.note) };
}

const musicLab: WorldModule = {
  Picture,
  describe,
  chooseScript,
  makeScript,
  toneOf,
  echoLayout: 'row',
  boards: { beat: BeatBoard, tune: TuneBoard },
  voice,
};
export default musicLab;
