import { describe, expect, it } from 'vitest';
import { ROOMS, parsePath, sameRoute, toPath, type Route } from '@/app/router';
import { WORLD_IDS } from '@/engine';

const known: Route[] = [
  { name: 'home' },
  { name: 'grown-ups' },
  ...WORLD_IDS.map((world): Route => ({ name: 'world', world })),
  ...WORLD_IDS.map((world): Route => ({ name: 'play', world, lessonId: 'ng-same-amount-01' })),
  ...ROOMS.map((world): Route => ({ name: 'room', world })),
];

describe('routes', () => {
  it('every route survives a round trip through its address', () => {
    for (const route of known) expect(parsePath(toPath(route))).toEqual(route);
  });

  it('reads the addresses the game uses', () => {
    expect(parsePath('/')).toEqual({ name: 'home' });
    expect(parsePath('/grown-ups')).toEqual({ name: 'grown-ups' });
    expect(parsePath('/world/number-garden')).toEqual({ name: 'world', world: 'number-garden' });
    expect(parsePath('/world/number-garden/play/ng-same-amount-01')).toEqual({
      name: 'play',
      world: 'number-garden',
      lessonId: 'ng-same-amount-01',
    });
  });

  it('knows the room to play in freely, in the one world that has one', () => {
    expect(ROOMS).toEqual(['music-lab']);
    expect(parsePath('/world/music-lab/room')).toEqual({ name: 'room', world: 'music-lab' });
    expect(toPath({ name: 'room', world: 'music-lab' })).toBe('/world/music-lab/room');
    // A world with no room has no such page, and a room has nothing beyond its door.
    for (const path of ['/world/number-garden/room', '/world/music-lab/room/extra']) {
      expect(parsePath(path)).toEqual({ name: 'not-found', path });
    }
  });

  it('forgives stray slashes', () => {
    expect(parsePath('')).toEqual({ name: 'home' });
    expect(parsePath('//')).toEqual({ name: 'home' });
    expect(parsePath('/grown-ups/')).toEqual({ name: 'grown-ups' });
    expect(parsePath('//world//robot-ridge/')).toEqual({ name: 'world', world: 'robot-ridge' });
  });

  it.each([
    '/nowhere',
    '/world',
    '/world/candy-castle',
    '/world/number-garden/play',
    '/world/number-garden/play/Has.Dots',
    '/world/number-garden/play/UPPER',
    '/world/number-garden/play/ng-same-amount-01/extra',
    '/world/number-garden/extra',
    '/grown-ups/secret',
    '/%E0%A4%A',
    '/index.html',
  ])('%s is not a page', (path) => {
    expect(parsePath(path)).toEqual({ name: 'not-found', path });
  });

  it('keeps a not-found address as it was typed', () => {
    expect(toPath({ name: 'not-found', path: '/some/old/link' })).toBe('/some/old/link');
  });

  it('never puts a dot in an address, so a static host can tell pages from files', () => {
    for (const route of known) expect(toPath(route)).not.toContain('.');
  });

  it('compares routes by address', () => {
    expect(sameRoute({ name: 'home' }, { name: 'home' })).toBe(true);
    expect(
      sameRoute({ name: 'world', world: 'reading-cove' }, { name: 'world', world: 'robot-ridge' }),
    ).toBe(false);
  });
});
