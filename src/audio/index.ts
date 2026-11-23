import { settingsStore } from '@/app/settings';
import { AudioEngine, browserAudioContext, type Cue } from './audioEngine';
import { Narrator, type VoiceBank } from './voice';

export { AudioEngine, type AudioState, type Cue } from './audioEngine';
export { Narrator, type Heard, type VoiceBank } from './voice';

let engine: AudioEngine | null = null;
let narrator: Narrator | null = null;

/** The page's audio engine, following the sound setting. */
export function audio(): AudioEngine {
  if (engine) return engine;
  const settings = settingsStore();
  const created = new AudioEngine(browserAudioContext(window), settings.get().sound, () =>
    performance.now(),
  );
  preferMediaPlayback(navigator, settings.get().sound);
  settings.subscribe(() => {
    created.setEnabled(settings.get().sound);
    preferMediaPlayback(navigator, settings.get().sound);
    if (!settings.get().sound) narrator?.hush();
  });
  engine = created;
  return created;
}

/** The page's voice: the bundled lines, played through the same audio as the cues. */
export function voice(): Narrator {
  narrator ??= new Narrator(
    audio(),
    async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`No clip at ${url}: ${String(response.status)}`);
      return response.arrayBuffer();
    },
    () => performance.now(),
  );
  return narrator;
}

/** Make a world's lines (or the lines every world shares) known to the voice. */
export function addVoice(bank: VoiceBank): void {
  voice().add(bank);
}

/** Say a line if it can be heard. Never throws, and nothing waits for it. */
export function sayLine(key: string): void {
  void voice()
    .say(key)
    .catch(() => undefined);
}

export function hushVoice(): void {
  narrator?.hush();
}

export function playCue(cue: Cue): void {
  audio().play(cue);
}

/** The note for the `index`-th thing being counted (0 is the first). */
export function playCount(index: number): void {
  audio().count(index);
}

/**
 * On an iPhone or iPad, a page that makes its sound with Web Audio is treated like a game's sound effects: the
 * ring/silent switch silences it, and "there is no sound" is the commonest thing said about web games there. This
 * game's sounds are part of how it teaches, so while sound is switched on in the game it asks to be treated as media
 * playback, which that switch does not silence. Only Safari has this setting; everywhere else this does nothing.
 */
export function preferMediaPlayback(scope: Navigator, on: boolean): void {
  const session = (scope as Navigator & { audioSession?: { type: string } }).audioSession;
  if (!session) return;
  try {
    session.type = on ? 'playback' : 'auto';
  } catch {
    // A Safari that has the setting but not this value: the sounds follow the switch, as before.
  }
}

/**
 * Wake the audio engine on every gesture. Listening for the lifetime of the page (not just once) matters on iOS,
 * where audio is suspended again after an interruption such as a phone call or a tab switch.
 */
export function installAudioUnlock(target: Window): void {
  const unlock = () => audio().unlock();
  for (const type of ['pointerdown', 'keydown', 'touchend'] as const) {
    target.addEventListener(type, unlock, { capture: true, passive: true });
  }
}
