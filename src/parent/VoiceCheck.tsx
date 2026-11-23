import { useEffect, useState } from 'react';
import { addVoice, sayLine } from '@/audio';
import { bankOf } from '@/audio/voice';
import { IconPlay } from '@/ui/icons';
import manifestUrl from '@/voice/manifest.json?url';
import styles from './GrownUps.module.css';

/**
 * Every line the game can say, for a grown-up to listen to.
 *
 * The voice is made by a machine, ahead of time, and checked by another machine that writes down what it heard.
 * Neither can tell whether a clip sounds right to a child. This page is where a person does: each clip can be
 * played, and one that sounds wrong can be marked. The marks stay on this device; the list at the foot of the page
 * is for sending to whoever looks after the game.
 */

interface Clip {
  group: string;
  kind: 'line' | 'word';
  text: string;
  heard: string;
  check: 'matches' | 'in-sentence' | 'differs';
  reviewed: string | null;
}

const files = import.meta.glob<string>('../assets/voice/en/*/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

const MARKS_KEY = 'training-academy.voice-marks.v1';

const text = {
  intro:
    'These recordings were made by a speech synthesiser and checked by a speech recogniser. No person had listened to them when this version was made, unless a line says otherwise. Play any of them. If one sounds wrong, unclear or unkind, mark it: the list at the foot of this page is what to send on.',
  loading: 'Fetching the list…',
  failed: 'The list of recordings could not be fetched. Check the connection and open this again.',
  play: (line: string) => `Play: ${line}`,
  wrong: 'Sounds wrong',
  machine: {
    matches: 'A recogniser heard these words.',
    'in-sentence': 'A recogniser heard this word in a sentence, but not on its own.',
    differs: 'A recogniser heard something else: ',
  },
  person: (date: string | null) =>
    date === null ? 'Not yet listened to by a person.' : `Listened to and passed on ${date}.`,
  marked: (count: number) =>
    count === 0 ? 'Nothing is marked.' : `Marked as sounding wrong (${String(count)}):`,
  soundOff: 'Sound is switched off, so nothing will play. Switch it on at the top of the page.',
};

function readMarks(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(MARKS_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((key) => typeof key === 'string') : [];
  } catch {
    return [];
  }
}

export default function VoiceCheck() {
  const [clips, setClips] = useState<[string, Clip][] | null | 'failed'>(null);
  const [marks, setMarks] = useState<string[]>(readMarks);

  useEffect(() => {
    let current = true;
    addVoice(bankOf(files, {}));
    fetch(manifestUrl)
      .then((response) => response.json())
      .then(
        (manifest: { clips: Record<string, Clip> }) => {
          if (current) setClips(Object.entries(manifest.clips));
        },
        () => {
          if (current) setClips('failed');
        },
      );
    return () => {
      current = false;
    };
  }, []);

  const toggle = (key: string) => {
    const next = marks.includes(key) ? marks.filter((other) => other !== key) : [...marks, key];
    setMarks(next);
    try {
      localStorage.setItem(MARKS_KEY, JSON.stringify(next));
    } catch {
      // The marks last for this visit only.
    }
  };

  if (clips === null) return <p className={styles.small}>{text.loading}</p>;
  if (clips === 'failed') return <p className={styles.small}>{text.failed}</p>;

  const groups = [...new Set(clips.map(([, clip]) => clip.group))];
  return (
    <div data-testid="voice-check">
      <p className={styles.small}>{text.intro}</p>
      {groups.map((group) => (
        <section key={group} aria-label={group}>
          <h3 className={styles.voiceGroup}>{group.replace(/-/g, ' ')}</h3>
          <ul className={styles.voiceList}>
            {clips
              .filter(([, clip]) => clip.group === group)
              .map(([key, clip]) => (
                <li key={key} className={styles.voiceRow} data-check={clip.check}>
                  <button
                    type="button"
                    className={styles.voicePlay}
                    aria-label={text.play(clip.text)}
                    onClick={() => sayLine(key)}
                  >
                    <IconPlay size={20} />
                  </button>
                  <div>
                    <p>{clip.text}</p>
                    <p className={styles.small}>
                      {text.machine[clip.check]}
                      {clip.check === 'differs' && `“${clip.heard}”`} {text.person(clip.reviewed)}
                    </p>
                  </div>
                  <label className={styles.voiceMark}>
                    <input
                      type="checkbox"
                      checked={marks.includes(key)}
                      onChange={() => toggle(key)}
                    />
                    <span>{text.wrong}</span>
                  </label>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <p className={styles.small} role="status">
        {text.marked(marks.length)}
      </p>
      {marks.length > 0 && (
        <textarea
          className={styles.voiceMarked}
          readOnly
          rows={Math.min(8, marks.length)}
          value={marks.join('\n')}
          aria-label={text.marked(marks.length)}
        />
      )}
    </div>
  );
}
