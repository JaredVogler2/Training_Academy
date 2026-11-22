import * as v from 'valibot';
import { useSyncExternalStore } from 'react';

/**
 * Device settings: sound, motion and graphics. Kept in localStorage (not with the players) because they must be known
 * before the first frame is drawn — a child who needs reduced motion should never see the full-motion page first.
 */

export const MOTION_OPTIONS = ['system', 'full', 'reduced'] as const;
/** `pictures` shows the illustrated hub and never starts WebGL. */
export const GRAPHICS_OPTIONS = ['auto', 'low', 'medium', 'high', 'pictures'] as const;

const SettingsSchema = v.object({
  version: v.literal(1),
  sound: v.boolean(),
  motion: v.picklist(MOTION_OPTIONS),
  graphics: v.picklist(GRAPHICS_OPTIONS),
});
export type Settings = v.InferOutput<typeof SettingsSchema>;
export type GraphicsOption = Settings['graphics'];
export type MotionOption = Settings['motion'];

export const SETTINGS_KEY = 'training-academy.settings.v1';
export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  sound: true,
  motion: 'system',
  graphics: 'auto',
};

/** Read saved settings. Anything missing, damaged or from an unknown version gives the defaults. */
export function parseSettings(raw: string | null): Settings {
  if (raw === null) return DEFAULT_SETTINGS;
  try {
    const parsed = v.safeParse(SettingsSchema, JSON.parse(raw));
    return parsed.success ? parsed.output : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

interface MotionQuery {
  readonly matches: boolean;
  addEventListener?: (type: 'change', listener: () => void) => void;
}

export class SettingsStore {
  private value: Settings;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null,
    private readonly systemReducedMotion: MotionQuery | null,
  ) {
    let raw: string | null = null;
    try {
      raw = storage?.getItem(SETTINGS_KEY) ?? null;
    } catch {
      // Storage is blocked: run on defaults.
    }
    this.value = parseSettings(raw);
    systemReducedMotion?.addEventListener?.('change', () => this.emit());
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  get = (): Settings => this.value;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  set(patch: Partial<Omit<Settings, 'version'>>): void {
    this.value = { ...this.value, ...patch };
    try {
      this.storage?.setItem(SETTINGS_KEY, JSON.stringify(this.value));
    } catch {
      // Not saved (storage blocked or full); the choice still holds for this visit.
    }
    this.emit();
  }

  /** What the game should actually do: the explicit choice if there is one, otherwise the operating system's. */
  reducedMotion = (): boolean => {
    if (this.value.motion === 'system') return this.systemReducedMotion?.matches ?? false;
    return this.value.motion === 'reduced';
  };

  toggleSound(): void {
    this.set({ sound: !this.value.sound });
  }

  /** Flip whatever is in effect now, and make that an explicit choice. */
  toggleMotion(): void {
    this.set({ motion: this.reducedMotion() ? 'full' : 'reduced' });
  }
}

let shared: SettingsStore | null = null;

/** The page's settings store, created on first use from the browser's own storage and media query. */
export function settingsStore(): SettingsStore {
  if (shared) return shared;
  let storage: Storage | null = null;
  try {
    storage = window.localStorage;
  } catch {
    // Reading the property can throw when storage is blocked.
  }
  const query =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  shared = new SettingsStore(storage, query);
  return shared;
}

export function useSettings(): Settings {
  const store = settingsStore();
  return useSyncExternalStore(store.subscribe, store.get);
}

export function useReducedMotion(): boolean {
  const store = settingsStore();
  return useSyncExternalStore(store.subscribe, store.reducedMotion);
}

/** Mirror the effective motion setting onto <html>, where the stylesheet reads it. */
export function applyMotionToDocument(store: SettingsStore, root: HTMLElement): () => void {
  const apply = () => {
    root.dataset.motion = store.reducedMotion() ? 'reduced' : 'full';
  };
  apply();
  return store.subscribe(apply);
}
