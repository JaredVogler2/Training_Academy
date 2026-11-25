import type { AudioEngine, PlayingClip } from './audioEngine';

/**
 * The voice: recorded lines, bundled with the game, played one at a time.
 *
 * Every line a child hears is a file made ahead of time (scripts/voice) and listed in the voice manifest; nothing
 * is synthesised in the browser and nothing is fetched from another site. A line is downloaded the first time it is
 * wanted (and kept by the service worker), decoded, and held in memory for a while in case it is wanted again.
 *
 * Nothing waits on the voice. A line that cannot be heard — sound off, audio not yet woken by a touch, a browser
 * that cannot decode it, a download that failed — is simply not said, and `seconds` reports it as taking no time,
 * so what is shown never stands still for words nobody hears. The pictures carry every instruction on their own.
 */

export interface VoiceBank {
  /** Where each line's file is, by key. */
  urls: Readonly<Record<string, string>>;
  /** How long each line lasts, in seconds. */
  seconds: Readonly<Record<string, number>>;
}

export type Heard = 'heard' | 'unheard';

/** A bank from the build's list of clip files (a line's key is its file's name) and their lengths. */
export function bankOf(
  files: Readonly<Record<string, string>>,
  seconds: Readonly<Record<string, number>>,
): VoiceBank {
  const urls: Record<string, string> = {};
  for (const [path, url] of Object.entries(files)) {
    const key = path.replace(/^.*\//, '').replace(/\.mp3$/, '');
    urls[key] = url;
  }
  return { urls, seconds };
}

/** Decoded lines kept in memory. A line is a second or two of sound: this many is a few megabytes. */
const KEEP = 36;
/** A line that takes longer than this to arrive is no longer about what is on the screen. */
const TOO_LATE_MS = 2500;

export class Narrator {
  private readonly urls = new Map<string, string>();
  private readonly lengths = new Map<string, number>();
  /** Decoded clips, oldest first. `null` is a clip that could not be decoded, so it is not tried again. */
  private readonly decoded = new Map<string, unknown>();
  private readonly loading = new Map<string, Promise<unknown>>();
  private playing: PlayingClip | null = null;
  /** Goes up with every line asked for and every hush, so that a line that arrives late knows it is stale. */
  private turn = 0;
  /** Lines said, and lines that could not be. */
  readonly stats = { said: 0, unheard: 0 };

  /**
   * `said` is told the key of each line at the moment it begins to play, and of no line that does not: not one
   * that was fetched ahead and never wanted, not one that arrived too late, not one that was hushed on its way.
   */
  constructor(
    private readonly engine: AudioEngine,
    private readonly download: (url: string) => Promise<ArrayBuffer>,
    private readonly clock: () => number = () => Date.now(),
    private readonly said: (key: string) => void = () => undefined,
  ) {}

  add(bank: VoiceBank): void {
    for (const [key, url] of Object.entries(bank.urls)) this.urls.set(key, url);
    for (const [key, seconds] of Object.entries(bank.seconds)) this.lengths.set(key, seconds);
  }

  has(key: string): boolean {
    return this.urls.has(key);
  }

  /** How long a line will take to say, in seconds: 0 if it is not going to be heard. */
  seconds = (key: string): number => {
    if (!this.engine.canPlayClips || !this.urls.has(key)) return 0;
    if (this.decoded.get(key) === null) return 0;
    return this.lengths.get(key) ?? 0;
  };

  private load(key: string): Promise<unknown> {
    if (this.decoded.has(key)) {
      // Asked for again: it is the newest now.
      const clip = this.decoded.get(key);
      this.decoded.delete(key);
      this.decoded.set(key, clip);
      return Promise.resolve(clip);
    }
    const pending = this.loading.get(key);
    if (pending) return pending;
    const url = this.urls.get(key);
    if (url === undefined) return Promise.resolve(null);

    const loading = this.download(url)
      .then(
        async (data) => {
          const able = this.engine.canPlayClips;
          const clip = await this.engine.decode(data);
          // A file that will not decode is remembered, so that it is not fetched and tried over and over.
          if (clip !== null || able) this.keep(key, clip);
          return clip;
        },
        // A download that failed is not remembered: the next asking tries again.
        () => null,
      )
      .finally(() => this.loading.delete(key));
    this.loading.set(key, loading);
    return loading;
  }

  private keep(key: string, clip: unknown): void {
    this.decoded.set(key, clip);
    while (this.decoded.size > KEEP) {
      const oldest = this.decoded.keys().next().value;
      if (oldest === undefined) break;
      this.decoded.delete(oldest);
    }
  }

  /** Fetch lines that are about to be wanted, so that they start on time. */
  prepare(keys: readonly string[]): void {
    if (!this.engine.canPlayClips) return;
    for (const key of keys) void this.load(key);
  }

  /** Say a line, instead of whatever is being said. Resolves when it has been said, or cannot be. */
  async say(key: string): Promise<Heard> {
    this.hush();
    const turn = this.turn;
    if (!this.engine.canPlayClips || !this.urls.has(key)) {
      this.stats.unheard += 1;
      return 'unheard';
    }
    const asked = this.clock();
    const clip = await this.load(key);
    // Something else has been said, or everything hushed, while this one was on its way.
    if (turn !== this.turn) return 'unheard';
    if (clip === null || this.clock() - asked > TOO_LATE_MS) {
      this.stats.unheard += 1;
      return 'unheard';
    }
    return new Promise<Heard>((resolve) => {
      const playing = this.engine.playClip(clip, () => {
        if (this.playing === playing) this.playing = null;
        resolve('heard');
      });
      if (!playing) {
        this.stats.unheard += 1;
        resolve('unheard');
        return;
      }
      this.playing = playing;
      this.stats.said += 1;
      this.said(key);
    });
  }

  /** Stop talking: the activity was paused or left, or something new is about to be said. */
  hush(): void {
    this.turn += 1;
    const playing = this.playing;
    this.playing = null;
    playing?.stop();
  }
}
