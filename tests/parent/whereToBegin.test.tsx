// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OBSERVATIONS } from '@/engine';
import type { Repository } from '@/storage';
import { WORLDS, isOpen, lessonsOf } from '@/game/worlds';
import { grownUpText as text } from '@/parent/text';
import { freshBackend, repositoryOn } from '../helpers/storage';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * "Where to begin", in the grown-ups' area: what a grown-up has seen the child do, and where Play begins. It is
 * their word, kept with the player's settings, and never becomes something the child has shown.
 */

let repository: Repository;
vi.mock('@/game/services', () => ({ getRepository: () => Promise.resolve(repository) }));

beforeEach(async () => {
  vi.resetModules();
  window.sessionStorage.clear();
  repository = await repositoryOn(freshBackend('memory'));
});

afterEach(cleanup);

/** The card, for the player who is playing, kept up to date as the grown-ups' area keeps it. */
async function open(): Promise<{ id: string }> {
  const profile = await repository.createProfile({ name: 'Robin', avatar: 'leaf' });
  await repository.setActiveProfileId(profile.id);
  const { WhereToBegin } = await import('@/parent/WhereToBegin');
  const { activeProfile, refreshProfiles, useProfiles } = await import('@/game/profiles');
  await refreshProfiles();
  function Card() {
    return <WhereToBegin profile={activeProfile(useProfiles())} />;
  }
  render(<Card />);
  return { id: profile.id };
}

const settingsOf = async (id: string) => (await repository.getProfile(id))?.settings;
const seenBox = (what: (typeof OBSERVATIONS)[number]) =>
  screen.getByLabelText<HTMLSelectElement>(text.observations[what]);
const startBox = (world: string) => screen.getByLabelText<HTMLSelectElement>(text.startOf(world));

describe('where to begin', () => {
  it('is for the player who is playing, and is nothing where nobody is', async () => {
    const { WhereToBegin } = await import('@/parent/WhereToBegin');
    const { container } = render(<WhereToBegin profile={null} />);
    expect(container.innerHTML).toBe('');
    cleanup();
    await open();
    expect(screen.getByRole('heading', { name: text.begin('Robin') })).toBeTruthy();
  });

  it('begins with nothing observed, and every world at its beginning', async () => {
    const { id } = await open();
    for (const what of OBSERVATIONS) {
      expect(seenBox(what).value, what).toBe('');
      expect(seenBox(what).selectedOptions[0]?.textContent).toBe(text.notObserved);
    }
    const worlds = WORLDS.filter(isOpen);
    expect(worlds.length).toBeGreaterThan(1);
    for (const world of worlds) expect(startBox(world.name).value, world.id).toBe('');
    expect(screen.queryByTestId('begin-suggestion')).toBeNull();
    expect(await settingsOf(id)).toEqual({ sessionMinutes: null });
  });

  it('keeps what a grown-up says they have seen, and forgets it when they take it back', async () => {
    const { id } = await open();
    fireEvent.change(seenBox('taps'), { target: { value: 'seen' } });
    await waitFor(async () => expect((await settingsOf(id))?.observed).toEqual({ taps: 'seen' }));
    await waitFor(() => expect(seenBox('taps').value).toBe('seen'));
    fireEvent.change(seenBox('listens'), { target: { value: 'not-yet' } });
    await waitFor(async () =>
      expect((await settingsOf(id))?.observed).toEqual({ taps: 'seen', listens: 'not-yet' }),
    );
    fireEvent.change(seenBox('taps'), { target: { value: '' } });
    await waitFor(async () =>
      expect((await settingsOf(id))?.observed).toEqual({ listens: 'not-yet' }),
    );
    fireEvent.change(seenBox('listens'), { target: { value: '' } });
    await waitFor(async () => expect(await settingsOf(id)).toEqual({ sessionMinutes: null }));
  });

  it('suggests where Play could begin, and begins there only when the grown-up says so', async () => {
    const { id } = await open();
    fireEvent.change(seenBox('counts-to-five'), { target: { value: 'seen' } });
    const suggestion = await screen.findByTestId('begin-suggestion');
    expect(suggestion.textContent).toContain('Number Garden');
    expect(suggestion.textContent).toContain('Counting to five, then ten, part 2');
    // Saying it was seen has moved nothing by itself.
    expect((await settingsOf(id))?.startAt).toBeUndefined();
    expect(startBox('Number Garden').value).toBe('');

    fireEvent.click(within(suggestion).getByRole('button', { name: text.beginThere }));
    await waitFor(async () =>
      expect((await settingsOf(id))?.startAt).toEqual({ 'number-garden': 'ng-give-02' }),
    );
    await waitFor(() => expect(startBox('Number Garden').value).toBe('ng-give-02'));
    // Taken: it is not offered again.
    await waitFor(() => expect(screen.queryByTestId('begin-suggestion')).toBeNull());
  });

  it('lets the grown-up choose any activity of a world to begin at, or the beginning again', async () => {
    const { id } = await open();
    const box = startBox('Reading Cove');
    const order = lessonsOf(WORLDS.find((world) => world.id === 'reading-cove') ?? WORLDS[0]!);
    // Every activity after the first is there to choose; the first is "the beginning".
    expect([...box.options].map((option) => option.value)).toEqual(['', ...order.slice(1)]);
    expect(box.options[0]?.textContent).toContain(text.atTheBeginning);

    fireEvent.change(box, { target: { value: 'rc-letters-01' } });
    await waitFor(async () =>
      expect((await settingsOf(id))?.startAt).toEqual({ 'reading-cove': 'rc-letters-01' }),
    );
    await waitFor(() => expect(startBox('Reading Cove').value).toBe('rc-letters-01'));
    fireEvent.change(startBox('Reading Cove'), { target: { value: '' } });
    await waitFor(async () => expect(await settingsOf(id)).toEqual({ sessionMinutes: null }));
  });

  it('writes nothing into what the child has shown, whatever is said here', async () => {
    const { id } = await open();
    for (const what of OBSERVATIONS) {
      fireEvent.change(seenBox(what), { target: { value: 'seen' } });
      await waitFor(async () => expect((await settingsOf(id))?.observed?.[what]).toBe('seen'));
    }
    fireEvent.change(startBox('Number Garden'), { target: { value: 'ng-add-01' } });
    await waitFor(async () => expect((await settingsOf(id))?.startAt).toBeDefined());
    expect(await repository.listAttempts(id)).toEqual([]);
    expect(await repository.listSessions(id)).toEqual([]);
  });

  it('names an activity to watch them in, for what can be found out by playing', async () => {
    await open();
    const links = screen
      .getAllByRole('link')
      .filter((link) => link.textContent.startsWith('Watch them try'));
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/world/number-garden/play/ng-give-01',
      '/world/reading-cove/play/rc-first-01',
      '/world/reading-cove/play/rc-letters-01',
      '/world/reading-cove/play/rc-letters-01',
    ]);
  });

  it('says what there is for a child who does not yet tap with ease, or listen', async () => {
    await open();
    expect(screen.queryByText(text.tapsNote)).toBeNull();
    fireEvent.change(seenBox('taps'), { target: { value: 'not-yet' } });
    expect(await screen.findByText(text.tapsNote)).toBeTruthy();
    fireEvent.change(seenBox('listens'), { target: { value: 'not-yet' } });
    expect(await screen.findByText(text.listensNote)).toBeTruthy();
    expect(screen.getByRole('link', { name: text.howToAgain }).getAttribute('href')).toBe(
      '/how-to-play',
    );
  });

  it('is where a grown-up says they are helping today, without holding anything down', async () => {
    await open();
    const { isHelping } = await import('@/game/helping');
    const box = screen.getByLabelText<HTMLInputElement>(text.helpingToday);
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(isHelping()).toBe(true);
    await waitFor(() => expect(box.checked).toBe(true));
    fireEvent.click(box);
    expect(isHelping()).toBe(false);
  });

  it('says so when what was chosen could not be kept', async () => {
    await open();
    vi.spyOn(repository, 'updateProfile').mockRejectedValue(new Error('no room'));
    fireEvent.change(seenBox('taps'), { target: { value: 'seen' } });
    expect(await screen.findByText(text.couldNotSave)).toBeTruthy();
  });
});
