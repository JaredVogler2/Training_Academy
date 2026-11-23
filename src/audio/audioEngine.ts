/**
 * The game's sounds: a handful of soft, synthesised cues. No audio files, no network, and nothing a lesson depends
 * on — the game is fully usable muted. Phase 04 adds recorded narration on top of the same unlock and mute handling.
 *
 * Browsers only let a page make sound after the person has touched it, and iOS Safari suspends audio whenever it
 * likes: a phone call, another app, the screen locking. So the context is created on the first gesture and woken on
 * every later one if it has been suspended. Waking takes a moment, so a cue asked for in that moment waits for it
 * (the sound of the very tap that woke the audio would otherwise always be lost); any other cue that cannot play is
 * simply skipped.
 */

export type Cue =
  'tap' | 'on' | 'off' | 'success' | 'again' | 'step' | 'hello' | 'sail' | 'ask' | 'same' | 'done';

/** The part of the Web Audio API this engine uses, so tests can supply a fake. */
export interface AudioContextLike {
  readonly state: string;
  readonly currentTime: number;
  readonly destination: unknown;
  resume(): Promise<void>;
  createOscillator(): OscillatorLike;
  createGain(): GainLike;
}

interface ParamLike {
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  exponentialRampToValueAtTime(value: number, time: number): unknown;
}

export interface OscillatorLike {
  type: string;
  frequency: ParamLike;
  connect(destination: unknown): unknown;
  start(when?: number): void;
  stop(when?: number): void;
}

export interface GainLike {
  gain: ParamLike;
  connect(destination: unknown): unknown;
}

export type AudioState =
  /** Sound is switched off; no audio context exists. */
  | 'muted'
  /** Sound is on, waiting for the first touch. */
  | 'locked'
  | 'ready'
  /** This browser has no usable Web Audio. */
  | 'unavailable';

interface Note {
  frequency: number;
  /** Seconds after the cue starts. */
  at: number;
  seconds: number;
  level: number;
}

/** Gentle, short and quiet by design: nothing here should startle a small child. */
const CUES: Record<Cue, { wave: OscillatorType; notes: Note[] }> = {
  tap: { wave: 'sine', notes: [{ frequency: 620, at: 0, seconds: 0.07, level: 0.16 }] },
  on: {
    wave: 'sine',
    notes: [
      { frequency: 523.25, at: 0, seconds: 0.09, level: 0.16 },
      { frequency: 783.99, at: 0.08, seconds: 0.14, level: 0.16 },
    ],
  },
  off: {
    wave: 'sine',
    notes: [
      { frequency: 587.33, at: 0, seconds: 0.09, level: 0.14 },
      { frequency: 392, at: 0.08, seconds: 0.14, level: 0.14 },
    ],
  },
  success: {
    wave: 'triangle',
    notes: [
      { frequency: 523.25, at: 0, seconds: 0.14, level: 0.18 },
      { frequency: 659.25, at: 0.11, seconds: 0.14, level: 0.18 },
      { frequency: 783.99, at: 0.22, seconds: 0.26, level: 0.18 },
    ],
  },
  // "Have another look": two soft, level notes. Not a buzzer, not a falling "wrong" sound.
  again: {
    wave: 'sine',
    notes: [
      { frequency: 440, at: 0, seconds: 0.12, level: 0.13 },
      { frequency: 440, at: 0.16, seconds: 0.16, level: 0.11 },
    ],
  },
  step: { wave: 'sine', notes: [{ frequency: 698.46, at: 0, seconds: 0.1, level: 0.14 }] },
  // Glim's own three notes, skipping up: the guide saying hello.
  hello: {
    wave: 'triangle',
    notes: [
      { frequency: 659.25, at: 0, seconds: 0.09, level: 0.15 },
      { frequency: 783.99, at: 0.09, seconds: 0.09, level: 0.15 },
      { frequency: 1046.5, at: 0.18, seconds: 0.2, level: 0.14 },
    ],
  },
  // Setting sail for an island: a low note and the fifth above it, like a small horn.
  sail: {
    wave: 'sine',
    notes: [
      { frequency: 392, at: 0, seconds: 0.12, level: 0.15 },
      { frequency: 587.33, at: 0.1, seconds: 0.22, level: 0.15 },
    ],
  },
  // The question being asked, or asked again: two notes that end up, as a voice does.
  ask: {
    wave: 'sine',
    notes: [
      { frequency: 659.25, at: 0, seconds: 0.1, level: 0.14 },
      { frequency: 880, at: 0.12, seconds: 0.2, level: 0.13 },
    ],
  },
  // "These two are the same": two notes sounding together.
  same: {
    wave: 'triangle',
    notes: [
      { frequency: 523.25, at: 0, seconds: 0.24, level: 0.11 },
      { frequency: 659.25, at: 0, seconds: 0.24, level: 0.11 },
    ],
  },
  // The end of an activity: the "yes" notes, and home to the note above them.
  done: {
    wave: 'triangle',
    notes: [
      { frequency: 523.25, at: 0, seconds: 0.13, level: 0.17 },
      { frequency: 659.25, at: 0.11, seconds: 0.13, level: 0.17 },
      { frequency: 783.99, at: 0.22, seconds: 0.13, level: 0.17 },
      { frequency: 1046.5, at: 0.33, seconds: 0.34, level: 0.15 },
    ],
  },
};

/** One note for each thing counted, climbing: the same five-note scale every cue is drawn from. */
const COUNTING_NOTES = [
  523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760,
];

/** How long a cue will wait for the audio to wake before it is too late to be the sound of that touch. */
const WAIT_FOR_WAKE_MS = 900;

export class AudioEngine {
  private context: AudioContextLike | null = null;
  private enabled: boolean;
  private failed = false;
  /** True from asking the context to wake until it answers. */
  private waking = false;
  /** The cue asked for while the context was waking, and when. Only the latest is kept. */
  private waiting: { wave: OscillatorType; notes: Note[]; since: number } | null = null;
  private readonly listeners = new Set<() => void>();
  /** Cues actually scheduled, and cues skipped because of an error. */
  readonly stats = { played: 0, failed: 0 };

  constructor(
    private readonly createContext: () => AudioContextLike | null,
    enabled: boolean,
    /** Milliseconds, from any steady clock. */
    private readonly clock: () => number = () => Date.now(),
  ) {
    this.enabled = enabled;
  }

  get state(): AudioState {
    if (!this.enabled) return 'muted';
    if (this.failed) return 'unavailable';
    return this.context?.state === 'running' ? 'ready' : 'locked';
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) this.waiting = null;
    this.emit();
  }

  /** Call from inside a touch, click or key handler. Creates the context the first time, and wakes it afterwards. */
  unlock(): void {
    if (!this.enabled || this.failed) return;
    try {
      if (!this.context) {
        this.context = this.createContext();
        if (!this.context) {
          this.failed = true;
          this.emit();
          return;
        }
      }
      if (this.context.state !== 'running') {
        this.waking = true;
        void this.context.resume().then(
          () => {
            this.waking = false;
            this.playWhatWaited();
            this.emit();
          },
          () => {
            // Still not allowed; the next gesture tries again.
            this.waking = false;
            this.waiting = null;
          },
        );
      }
    } catch {
      this.failed = true;
    }
    this.emit();
  }

  /** Play a cue if sound is on and allowed. Returns whether it was scheduled now; never throws. */
  play(cue: Cue): boolean {
    const { wave, notes } = CUES[cue];
    return this.sound(wave, notes);
  }

  /** One climbing note for the thing being counted: `index` 0 is the first thing. */
  count(index: number): boolean {
    const step = Math.min(COUNTING_NOTES.length - 1, Math.max(0, Math.floor(index)));
    const frequency = COUNTING_NOTES[step] ?? 523.25;
    return this.sound('sine', [{ frequency, at: 0, seconds: 0.16, level: 0.15 }]);
  }

  private playWhatWaited(): void {
    const waited = this.waiting;
    this.waiting = null;
    if (waited && this.clock() - waited.since <= WAIT_FOR_WAKE_MS) {
      this.sound(waited.wave, waited.notes);
    }
  }

  private sound(wave: OscillatorType, notes: Note[]): boolean {
    const context = this.context;
    if (!this.enabled || this.failed || !context) return false;
    if (context.state !== 'running') {
      // Woken by this very touch and not yet awake: keep the cue for the moment it is.
      if (this.waking) this.waiting = { wave, notes, since: this.clock() };
      return false;
    }
    try {
      const start = context.currentTime + 0.01;
      for (const note of notes) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = wave;
        oscillator.frequency.setValueAtTime(note.frequency, start + note.at);
        // A short attack and a smooth release, so there is never a click.
        gain.gain.setValueAtTime(0.0001, start + note.at);
        gain.gain.linearRampToValueAtTime(note.level, start + note.at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.seconds);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start + note.at);
        oscillator.stop(start + note.at + note.seconds + 0.03);
      }
      this.stats.played += 1;
      return true;
    } catch {
      this.stats.failed += 1;
      return false;
    }
  }
}

/** The browser's audio context constructor, including the prefixed one older Safari versions use. */
export function browserAudioContext(scope: Window): () => AudioContextLike | null {
  return () => {
    const Constructor =
      (scope as Window & { AudioContext?: typeof AudioContext }).AudioContext ??
      (scope as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Constructor ? new Constructor() : null;
  };
}
