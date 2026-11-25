import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { settingsStore } from '@/app/settings';
import { DRUM_HZ, TICK_HZ, audio, playTone } from '@/audio';
import { OCTAVE } from '@/engine/music';
import { Guide } from '@/ui/Guide';
import { ActionButton, ActionLink } from '@/ui/controls';
import { IconBack, IconPause, IconPlay, IconSoundOn } from '@/ui/icons';
import { Bar } from './pictures';
import { usePressNow } from './press';
import { musicText } from './text';
import music from './musicLab.module.css';
import styles from './room.module.css';

/** The beat there is to play along to: slow and steady, and lit four at a time. */
export const ROOM_TEMPO = 72;
const LIGHTS = 4;
/** How long a bar stays lit after it is struck (ms). */
const LIT_FOR = 260;

/** One chime bar. It sounds the moment it is touched. */
function Key({ note, index }: { note: string; index: number }) {
  const [lit, setLit] = useState(false);
  const dark = useRef(0);
  useEffect(() => () => window.clearTimeout(dark.current), []);
  const press = usePressNow(() => {
    playTone('bar', note);
    setLit(true);
    window.clearTimeout(dark.current);
    dark.current = window.setTimeout(() => setLit(false), LIT_FOR);
  });
  return (
    <li>
      <button
        type="button"
        className={music.key}
        style={{ '--order': index } as CSSProperties}
        data-note={note}
        data-lit={lit}
        aria-label={musicText.bar(note)}
        {...press}
      >
        <Bar note={note} sounding={lit} />
      </button>
    </li>
  );
}

/**
 * A steady click to play along to, for as long as it is switched on. Each click is put on the audio's own clock a
 * beat ahead, and the lights follow the same clock. `run` names this switching-on (`null` is off); what comes
 * back is how many beats of it have sounded.
 */
function useBeat(run: number | null): number {
  const [state, setState] = useState<{ run: number | null; sounded: number }>({
    run: null,
    sounded: 0,
  });
  useEffect(() => {
    if (run === null) return;
    const period = 60_000 / ROOM_TEMPO;
    const origin = performance.now() + 150;
    const heardLate = (audio().clock?.latency ?? 0) * 1000;
    let beat = 0;
    let timer = 0;
    const click = (index: number) => {
      const clock = audio().clock;
      if (!clock) return;
      const due = origin + index * period;
      // The first of every four is a little higher, as a bar line is.
      playTone('tick', index % LIGHTS === 0 ? TICK_HZ * 1.26 : TICK_HZ, {
        at: clock.now + (due - performance.now()) / 1000,
        level: 0.16,
      });
    };
    const next = () => {
      const moment = origin + heardLate + beat * period;
      timer = window.setTimeout(
        () => {
          beat += 1;
          setState({ run, sounded: beat });
          click(beat);
          next();
        },
        Math.max(0, moment - performance.now()),
      );
    };
    click(0);
    next();
    return () => window.clearTimeout(timer);
  }, [run]);
  return run !== null && state.run === run ? state.sounded : 0;
}

/**
 * The Music Lab's room for playing in: the whole octave of chime bars, a drum, and a beat to play along to.
 * Nothing is asked here, nothing is right or wrong, and nothing is kept.
 */
export default function Room() {
  const state = useSyncExternalStore(audio().subscribe, () => audio().state);
  // Which switching-on of the beat this is, or `null` while it is off.
  const [run, setRun] = useState<number | null>(null);
  const runs = useRef(0);
  const beating = run !== null;
  const sounded = useBeat(state === 'muted' ? null : run);
  const [struck, setStruck] = useState(0);
  const drum = usePressNow(() => {
    playTone('drum', DRUM_HZ);
    setStruck((count) => count + 1);
  });

  // A phone put down, or another app opened on top: the beat stops, and waits to be started again.
  useEffect(() => {
    const whenHidden = () => {
      if (document.visibilityState === 'hidden') setRun(null);
    };
    document.addEventListener('visibilitychange', whenHidden);
    return () => document.removeEventListener('visibilitychange', whenHidden);
  }, []);

  const silent = state === 'muted';
  const lit = sounded > 0 ? (sounded - 1) % LIGHTS : -1;
  return (
    <article className={styles.room} data-role="music" data-testid="music-room">
      <div className={styles.bar}>
        <ActionLink
          to={{ name: 'world', world: 'music-lab' }}
          round
          icon={<IconBack />}
          className={styles.barButton}
          aria-label={musicText.room.back}
          data-tip={musicText.room.back}
          data-tip-align="start"
        />
        <h1 className={styles.title}>{musicText.room.title}</h1>
        <span />
      </div>

      {silent ? (
        // A room for making sounds, with the sound switched off: one large thing to press, as an activity for
        // listening has.
        <section className={styles.gate} data-testid="room-needs-sound">
          <Guide state="point" aim={62} className={styles.gateGuide} />
          <ActionButton
            tone="sun"
            big
            round
            className={styles.gateButton}
            icon={<IconSoundOn size={56} />}
            aria-label={musicText.room.soundOn}
            onClick={() => {
              settingsStore().set({ sound: true });
              audio().unlock();
            }}
          />
          <p className={styles.note}>{musicText.room.needsSound}</p>
        </section>
      ) : (
        <>
          <ul className={styles.keys} aria-label={musicText.room.keys}>
            {OCTAVE.map((note, index) => (
              <Key key={note} note={note} index={index} />
            ))}
          </ul>

          <div className={styles.low}>
            <div className={music.drumRoom}>
              <button
                type="button"
                className={music.drum}
                aria-label={musicText.room.drum}
                {...drum}
              >
                <svg viewBox="-60 -60 120 120" aria-hidden="true" focusable="false">
                  <circle r="56" fill="#ff8f7a" stroke="#c94f3b" strokeWidth="5" />
                  <circle r="44" fill="#fff6e3" stroke="#c94f3b" strokeWidth="3" />
                  <circle r="20" fill="none" stroke="#ffd9b8" strokeWidth="4" />
                </svg>
                {sounded > 0 && (
                  <span
                    key={`pulse-${String(sounded)}`}
                    className={music.pulse}
                    aria-hidden="true"
                  />
                )}
                {struck > 0 && (
                  <span key={`tap-${String(struck)}`} className={music.ripple} aria-hidden="true" />
                )}
              </button>
            </div>
            <div className={styles.beat}>
              <ActionButton
                tone={beating ? 'sun' : 'plain'}
                big
                round
                className={styles.beatButton}
                icon={beating ? <IconPause size={32} /> : <IconPlay size={32} />}
                aria-label={beating ? musicText.room.beatOff : musicText.room.beatOn}
                aria-pressed={beating}
                data-tip={beating ? musicText.room.beatOff : musicText.room.beatOn}
                data-tip-side="top"
                onClick={() => {
                  runs.current += 1;
                  setRun(beating ? null : runs.current);
                }}
              />
              <ol className={styles.lights} aria-label={musicText.room.lights} data-going={beating}>
                {Array.from({ length: LIGHTS }, (_, index) => (
                  <li
                    key={index}
                    className={music.light}
                    aria-hidden="true"
                    data-kind="tap"
                    data-light={index}
                    data-now={index === lit}
                  />
                ))}
              </ol>
            </div>
          </div>
          <p className={styles.note} data-selectable>
            {musicText.room.note}
          </p>
        </>
      )}
    </article>
  );
}
