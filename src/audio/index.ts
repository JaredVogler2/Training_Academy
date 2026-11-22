import { settingsStore } from '@/app/settings';
import { AudioEngine, browserAudioContext, type Cue } from './audioEngine';

export { AudioEngine, type AudioState, type Cue } from './audioEngine';

let engine: AudioEngine | null = null;

/** The page's audio engine, following the sound setting. */
export function audio(): AudioEngine {
  if (engine) return engine;
  const settings = settingsStore();
  const created = new AudioEngine(browserAudioContext(window), settings.get().sound);
  settings.subscribe(() => created.setEnabled(settings.get().sound));
  engine = created;
  return created;
}

export function playCue(cue: Cue): void {
  audio().play(cue);
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
