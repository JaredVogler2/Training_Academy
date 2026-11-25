/** Words in the Music Lab's own boards. They are for the grown-up alongside and for screen readers. */

const NAMES: Readonly<Record<string, string>> = {
  c: 'C',
  d: 'D',
  e: 'E',
  f: 'F',
  g: 'G',
  a: 'A',
  b: 'B',
};

/** A note in words: "C", "high C", "very high E". */
export function noteWord(note: string): string {
  const octave = Number(note[1]);
  const where = octave <= 3 ? 'low ' : octave === 4 ? '' : octave === 5 ? 'high ' : 'very high ';
  return `${where}${NAMES[note[0] ?? ''] ?? note}`;
}

const list = (words: readonly string[]) =>
  words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1) ?? ''}`;

export const musicText = {
  drum: 'The drum: tap it with the beat',
  strip: (lead: number, beats: number) =>
    `The beat: ${String(lead)} beats to listen to, then ${String(beats)} to tap`,
  bar: (note: string) => `Chime bar: ${noteWord(note)}`,
  takeBack: 'Take the last note back',
  playTune: 'Play my tune',
  tuneSoFar: (notes: readonly string[], length: number) =>
    notes.length === 0
      ? `A tune of ${String(length)} notes: none chosen yet`
      : `A tune of ${String(length)} notes. So far: ${list(notes)}`,
  singer: (voice: string, big: boolean) =>
    voice === 'drum'
      ? big
        ? 'The big drum'
        : 'A little drum'
      : voice === 'bar'
        ? big
          ? 'The big chime bars'
          : 'Little chime bars'
        : big
          ? 'The big bird'
          : 'A little bird',
  pair: (voice: string) =>
    voice === 'drum'
      ? 'Two drums, to listen to one after the other'
      : voice === 'bar'
        ? 'Two sets of chime bars, to listen to one after the other'
        : 'Two birds, to listen to one after the other',
  beat: (tempo: number) => `A steady beat, ${String(tempo)} to the minute`,
  room: {
    title: 'Just play',
    back: 'Back to the Music Lab',
    keys: 'Chime bars, lowest first',
    drum: 'The drum',
    beatOn: 'Start the beat',
    beatOff: 'Stop the beat',
    lights: 'The beat, four at a time',
    note: 'For grown-ups: nothing is asked here and nothing is kept. It is for playing.',
    needsSound: 'This room is for making sounds. Turn the sound on to play.',
    soundOn: 'Turn the sound on',
  },
  signs: {
    high: 'Which one is high?',
    low: 'Which one is low?',
    same: 'The same',
    different: 'Different',
    up: 'A tune that goes up',
    down: 'A tune that goes down',
    hill: 'A tune that goes up and then comes down',
    twice: 'A tune that says the same thing twice',
    home: 'A tune that ends on the biggest bar',
  } as Readonly<Record<string, string>>,
} as const;
