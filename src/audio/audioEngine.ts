/**
 * The game's sounds: a handful of soft, synthesised cues, and the recorded clips of the voice (src/audio/voice.ts),
 * which are played through the same unlock and mute handling. The cues need no files and no network.
 *
 * Browsers only let a page make sound after the person has touched it, and iOS Safari suspends audio whenever it
 * likes: a phone call, another app, the screen locking. So the context is created on the first gesture and woken on
 * every later one if it has been suspended. Waking takes a moment, so a cue asked for in that moment waits for it
 * (the sound of the very tap that woke the audio would otherwise always be lost); any other cue that cannot play is
 * simply skipped.
 */

export type Cue =
  'tap' | 'on' | 'off' | 'success' | 'again' | 'step' | 'hello' | 'sail' | 'ask' | 'same' | 'done';

/**
 * What an instrument sounds like. Every one is made here, out of a few oscillators: there are no samples to
 * license, to download or to go missing.
 *   bar    a chime bar struck with a soft beater: a clear note that rings and dies away
 *   pipe   a small whistle, held for a moment: what the Music Lab's singers sing with
 *   drum   a soft, low drum
 *   tick   a wooden click: the beat
 */
export type Timbre = 'bar' | 'pipe' | 'drum' | 'tick';

/** The part of the Web Audio API this engine uses, so tests can supply a fake. */
export interface AudioContextLike {
  readonly state: string;
  readonly currentTime: number;
  readonly destination: unknown;
  /** How long a sound takes to leave the speaker once it has been played, in seconds, where the browser says. */
  readonly outputLatency?: number;
  readonly baseLatency?: number;
  resume(): Promise<void>;
  createOscillator(): OscillatorLike;
  createGain(): GainLike;
  /** Recorded clips. A browser without these two still plays the cues. */
  decodeAudioData?(data: ArrayBuffer): Promise<unknown>;
  createBufferSource?(): BufferSourceLike;
}

export interface BufferSourceLike {
  buffer: unknown;
  onended: ((event: never) => unknown) | null;
  connect(destination: unknown): unknown;
  start(when?: number): void;
  stop(when?: number): void;
}

/** A clip that is playing, so that it can be cut short. */
export interface PlayingClip {
  stop(): void;
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
  wave?: OscillatorType;
  /** The note starts at this many times its frequency and slides to it: a drum's thump, a whistle's chirp. */
  slideFrom?: number;
  /** How long the slide takes, in seconds. */
  slide?: number;
  /** How long the note holds its level before it dies away, in seconds: a whistle is held, a bar is not. */
  hold?: number;
}

/** The notes one stroke of an instrument is made of, for a pitch in hertz. */
function strokeOf(timbre: Timbre, frequency: number, level: number): Note[] {
  switch (timbre) {
    case 'bar':
      return [
        { wave: 'sine', frequency, at: 0, seconds: 0.95, level },
        // The bright ring of a struck bar: two octaves up, quieter, and gone sooner.
        { wave: 'sine', frequency: frequency * 4, at: 0, seconds: 0.22, level: level * 0.22 },
        { wave: 'triangle', frequency: frequency * 2, at: 0, seconds: 0.4, level: level * 0.12 },
      ];
    case 'pipe':
      return [
        {
          wave: 'triangle',
          frequency,
          at: 0,
          seconds: 0.36,
          level: level * 0.9,
          slideFrom: 0.94,
          slide: 0.05,
          hold: 0.2,
        },
        {
          wave: 'sine',
          frequency: frequency * 2,
          at: 0,
          seconds: 0.3,
          level: level * 0.1,
          hold: 0.16,
        },
      ];
    case 'drum':
      return [
        {
          wave: 'sine',
          frequency,
          at: 0,
          seconds: 0.3,
          level: level * 1.5,
          slideFrom: 2.4,
          slide: 0.07,
        },
        { wave: 'triangle', frequency: frequency * 3.1, at: 0, seconds: 0.05, level: level * 0.5 },
      ];
    case 'tick':
      return [
        { wave: 'triangle', frequency, at: 0, seconds: 0.07, level, slideFrom: 1.5, slide: 0.02 },
      ];
  }
}

/** The audio's own clock, for something that has to fall on a beat. */
export interface AudioClock {
  /** Seconds, on the clock sounds are scheduled against. */
  now: number;
  /** How long after it is played a sound is heard, in seconds, as far as the browser knows: 0 where it does not say. */
  latency: number;
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

/** How loud a recorded clip is played, and how far the cues step back while one is speaking. */
const CLIP_LEVEL = 0.95;
const DUCKED = 0.3;

export class AudioEngine {
  private context: AudioContextLike | null = null;
  private enabled: boolean;
  private failed = false;
  /** True from asking the context to wake until it answers. */
  private waking = false;
  /** The sound asked for while the context was waking, and when. Only the latest is kept. */
  private waiting: { wave: OscillatorType; notes: Note[]; since: number } | null = null;
  private readonly listeners = new Set<() => void>();
  /** Every cue goes through this one gain, so that they can all step back while the voice is speaking. */
  private bus: GainLike | null = null;
  private speaking = 0;
  /** Cues actually scheduled, and cues skipped because of an error. */
  readonly stats = { played: 0, failed: 0 };

  constructor(
    private readonly createContext: () => AudioContextLike | null,
    enabled: boolean,
    /** Milliseconds, from any steady clock. */
    private readonly steady: () => number = () => Date.now(),
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

  /**
   * One stroke of an instrument, at a pitch in hertz. `at` is a moment on the audio's own clock (see `clock`) for
   * a sound that has to fall on a beat; left out, it sounds now. Returns whether it was scheduled; never throws.
   */
  tone(timbre: Timbre, frequency: number, options: { at?: number; level?: number } = {}): boolean {
    if (!(frequency > 0) || !Number.isFinite(frequency)) return false;
    return this.sound('sine', strokeOf(timbre, frequency, options.level ?? 0.2), options.at);
  }

  /** The audio's clock, while there is audio running to keep time by; otherwise `null`. */
  get clock(): AudioClock | null {
    const context = this.context;
    if (!this.enabled || this.failed || context?.state !== 'running') return null;
    const latency = (context.outputLatency ?? 0) + (context.baseLatency ?? 0);
    return {
      now: context.currentTime,
      latency: Number.isFinite(latency) && latency > 0 ? Math.min(latency, 0.5) : 0,
    };
  }

  /** Whether a recorded clip could be heard if it were played now. */
  get canPlayClips(): boolean {
    const context = this.context;
    return (
      this.state === 'ready' &&
      typeof context?.decodeAudioData === 'function' &&
      typeof context.createBufferSource === 'function'
    );
  }

  /** Turn a downloaded clip into something that can be played. `null` when this browser cannot, or the file is bad. */
  async decode(data: ArrayBuffer): Promise<unknown> {
    const context = this.context;
    if (!context || typeof context.decodeAudioData !== 'function') return null;
    try {
      return await context.decodeAudioData(data);
    } catch {
      this.stats.failed += 1;
      return null;
    }
  }

  /**
   * Play a decoded clip now. The cues step back while it plays. Returns a handle to cut it short, or `null` if it
   * cannot be played at this moment; `ended` is called once, when it finishes or is cut short.
   */
  playClip(buffer: unknown, ended: () => void = () => undefined): PlayingClip | null {
    const context = this.context;
    if (!this.canPlayClips || !context || typeof context.createBufferSource !== 'function') {
      return null;
    }
    try {
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(CLIP_LEVEL, context.currentTime);
      source.connect(gain);
      gain.connect(context.destination);
      let over = false;
      const finish = () => {
        if (over) return;
        over = true;
        this.speaking = Math.max(0, this.speaking - 1);
        this.duck();
        ended();
      };
      source.onended = finish;
      this.speaking += 1;
      this.duck();
      source.start(context.currentTime + 0.01);
      this.stats.played += 1;
      return {
        stop: () => {
          try {
            source.stop();
          } catch {
            // Already stopped.
          }
          finish();
        },
      };
    } catch {
      this.stats.failed += 1;
      return null;
    }
  }

  private duck(): void {
    const context = this.context;
    if (!context || !this.bus) return;
    try {
      this.bus.gain.setValueAtTime(this.speaking > 0 ? DUCKED : 1, context.currentTime);
    } catch {
      // The cues stay as loud as they were.
    }
  }

  /** Where cues are sent: one gain in front of the speakers. */
  private output(context: AudioContextLike): unknown {
    if (!this.bus) {
      const bus = context.createGain();
      bus.gain.setValueAtTime(this.speaking > 0 ? DUCKED : 1, context.currentTime);
      bus.connect(context.destination);
      this.bus = bus;
    }
    return this.bus;
  }

  private playWhatWaited(): void {
    const waited = this.waiting;
    this.waiting = null;
    if (waited && this.steady() - waited.since <= WAIT_FOR_WAKE_MS) {
      this.sound(waited.wave, waited.notes);
    }
  }

  private sound(wave: OscillatorType, notes: Note[], when?: number): boolean {
    const context = this.context;
    if (!this.enabled || this.failed || !context) return false;
    if (context.state !== 'running') {
      // Woken by this very touch and not yet awake: keep the sound for the moment it is. (Not one that was to
      // fall on a beat: its moment is on a clock that is not running.)
      if (this.waking && when === undefined) {
        this.waiting = { wave, notes, since: this.steady() };
      }
      return false;
    }
    try {
      const start = Math.max(when ?? 0, context.currentTime + 0.01);
      const output = this.output(context);
      for (const note of notes) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = note.wave ?? wave;
        if (note.slideFrom !== undefined && note.slide !== undefined) {
          oscillator.frequency.setValueAtTime(note.frequency * note.slideFrom, start + note.at);
          oscillator.frequency.exponentialRampToValueAtTime(
            note.frequency,
            start + note.at + note.slide,
          );
        } else {
          oscillator.frequency.setValueAtTime(note.frequency, start + note.at);
        }
        // A short attack and a smooth release, so there is never a click.
        gain.gain.setValueAtTime(0.0001, start + note.at);
        gain.gain.linearRampToValueAtTime(note.level, start + note.at + 0.012);
        if (note.hold !== undefined) {
          gain.gain.setValueAtTime(note.level, start + note.at + 0.012 + note.hold);
        }
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.at + note.seconds);
        oscillator.connect(gain);
        gain.connect(output);
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
