// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * "A grown-up is helping": said by a grown-up, kept for the visit, and off when a new visit begins.
 */

beforeEach(() => {
  // The switch is kept in a module of its own, which remembers; each test starts as a page newly loaded does.
  vi.resetModules();
  window.sessionStorage.clear();
});

describe('a grown-up is helping', () => {
  it('is off until a grown-up says so', async () => {
    const { isHelping } = await import('@/game/helping');
    expect(isHelping()).toBe(false);
  });

  it('is on once they have, and off again when they say that', async () => {
    const { isHelping, setHelping } = await import('@/game/helping');
    setHelping(true);
    expect(isHelping()).toBe(true);
    setHelping(false);
    expect(isHelping()).toBe(false);
  });

  it('is still on when the page is loaded again in the same visit', async () => {
    const before = await import('@/game/helping');
    before.setHelping(true);
    vi.resetModules();
    const after = await import('@/game/helping');
    expect(after).not.toBe(before);
    expect(after.isHelping()).toBe(true);
  });

  it('is off again in a new visit, and after being switched off stays off', async () => {
    const before = await import('@/game/helping');
    before.setHelping(true);
    // A new visit: the browser has forgotten what a tab keeps.
    window.sessionStorage.clear();
    vi.resetModules();
    expect((await import('@/game/helping')).isHelping()).toBe(false);

    const again = await import('@/game/helping');
    again.setHelping(true);
    again.setHelping(false);
    vi.resetModules();
    expect((await import('@/game/helping')).isHelping()).toBe(false);
  });

  it('still works for this page where the browser will not remember anything', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    const { isHelping, setHelping } = await import('@/game/helping');
    expect(() => setHelping(true)).not.toThrow();
    expect(isHelping()).toBe(true);
    setItem.mockRestore();
  });

  it('tells whoever is watching when it changes', async () => {
    const { HELPING_KEY, setHelping } = await import('@/game/helping');
    setHelping(true);
    expect(window.sessionStorage.getItem(HELPING_KEY)).toBe('1');
    setHelping(false);
    expect(window.sessionStorage.getItem(HELPING_KEY)).toBeNull();
  });
});
