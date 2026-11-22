/**
 * Interface sounds for the Phase 01 shell: a handful of soft, synthesised cues. No audio files, no network, and
 * nothing a lesson depends on — the game is fully usable muted. Phase 04 adds recorded narration on top of the same
 * unlock and mute handling.
 *
 * Browsers only let a page make sound after the person has touched it, and iOS Safari suspends audio whenever it
 * likes. So: the context is created on the first gesture, resumed on every later one if it has been suspended, and a
 * cue that cannot play is simply skipped.
 */

export type Cue = 'tap' | 'on' | 'off' | 'success' | 'again' | 'step' | 'hello' | 'sail';

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
};

export class AudioEngine {
  private context: AudioContextLike | null = null;
  private enabled: boolean;
  private failed = false;
  private readonly listeners = new Set<() => void>();
  /** Cues actually scheduled, and cues skipped because of an error. */
  readonly stats = { played: 0, failed: 0 };

  constructor(
    private readonly createContext: () => AudioContextLike | null,
    enabled: boolean,
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
        void this.context.resume().then(
          () => this.emit(),
          () => {
            // Still not allowed; the next gesture tries again.
          },
        );
      }
    } catch {
      this.failed = true;
    }
    this.emit();
  }

  /** Play a cue if sound is on and allowed. Returns whether it was scheduled; never throws. */
  play(cue: Cue): boolean {
    const context = this.context;
    if (!this.enabled || this.failed || context?.state !== 'running') return false;
    try {
      const { wave, notes } = CUES[cue];
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
