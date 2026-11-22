import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  SettingsStore,
  applyMotionToDocument,
  parseSettings,
} from '@/app/settings';
import { FakeStorage } from '../helpers/storage';

function systemMotion(matches = false) {
  const listeners: (() => void)[] = [];
  return {
    query: {
      get matches() {
        return matches;
      },
      addEventListener: (_type: 'change', listener: () => void) => listeners.push(listener),
    },
    change(next: boolean) {
      matches = next;
      for (const listener of listeners) listener();
    },
  };
}

describe('reading saved settings', () => {
  it('uses the defaults when nothing, or nothing sensible, was saved', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('not json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('42')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(JSON.stringify({ version: 2, sound: false }))).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(JSON.stringify({ ...DEFAULT_SETTINGS, graphics: 'ultra' }))).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it('accepts what it wrote', () => {
    const saved = { version: 1, sound: false, motion: 'reduced', graphics: 'pictures' } as const;
    expect(parseSettings(JSON.stringify(saved))).toEqual(saved);
  });

  it('defaults to sound on, the device’s motion preference and automatic graphics', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      version: 1,
      sound: true,
      motion: 'system',
      graphics: 'auto',
    });
  });
});

describe('the settings store', () => {
  it('loads what was saved and saves what is changed', () => {
    const storage = new FakeStorage();
    storage.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, sound: false }));
    const store = new SettingsStore(storage, null);
    expect(store.get().sound).toBe(false);

    store.set({ graphics: 'low' });
    expect(JSON.parse(storage.getItem(SETTINGS_KEY) ?? '{}')).toEqual({
      version: 1,
      sound: false,
      motion: 'system',
      graphics: 'low',
    });
    expect(new SettingsStore(storage, null).get().graphics).toBe('low');
  });

  it('tells subscribers, and stops when they unsubscribe', () => {
    const store = new SettingsStore(new FakeStorage(), null);
    const listener = vi.fn();
    const stop = store.subscribe(listener);
    store.toggleSound();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.get().sound).toBe(false);
    stop();
    store.toggleSound();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('works for the visit when the browser allows no storage at all', () => {
    const blocked = new FakeStorage();
    blocked.broken = true;
    for (const storage of [blocked, null]) {
      const store = new SettingsStore(storage, null);
      expect(store.get()).toEqual(DEFAULT_SETTINGS);
      expect(() => store.set({ sound: false })).not.toThrow();
      expect(store.get().sound).toBe(false);
    }
  });

  it('follows the device’s reduced-motion preference until told otherwise', () => {
    const system = systemMotion(true);
    const store = new SettingsStore(new FakeStorage(), system.query);
    expect(store.reducedMotion()).toBe(true);

    const listener = vi.fn();
    store.subscribe(listener);
    system.change(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.reducedMotion()).toBe(false);
  });

  it('an explicit choice beats the device preference, in both directions', () => {
    const system = systemMotion(true);
    const store = new SettingsStore(new FakeStorage(), system.query);
    store.set({ motion: 'full' });
    expect(store.reducedMotion()).toBe(false);
    system.change(false);
    store.set({ motion: 'reduced' });
    expect(store.reducedMotion()).toBe(true);
  });

  it('the toggle flips whatever is in effect and makes it explicit', () => {
    const store = new SettingsStore(new FakeStorage(), systemMotion(true).query);
    store.toggleMotion();
    expect(store.get().motion).toBe('full');
    expect(store.reducedMotion()).toBe(false);
    store.toggleMotion();
    expect(store.get().motion).toBe('reduced');
    expect(store.reducedMotion()).toBe(true);
  });

  it('assumes full motion when the browser cannot say', () => {
    expect(new SettingsStore(null, null).reducedMotion()).toBe(false);
  });

  it('mirrors the motion setting onto the page, and keeps it up to date', () => {
    const root = { dataset: {} as Record<string, string> } as unknown as HTMLElement;
    const store = new SettingsStore(new FakeStorage(), systemMotion(false).query);
    const stop = applyMotionToDocument(store, root);
    expect(root.dataset.motion).toBe('full');
    store.toggleMotion();
    expect(root.dataset.motion).toBe('reduced');
    stop();
    store.toggleMotion();
    expect(root.dataset.motion).toBe('reduced');
  });
});
