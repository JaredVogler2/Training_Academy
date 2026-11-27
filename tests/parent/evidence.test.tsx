// @vitest-environment happy-dom
import type * as Services from '@/game/services';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '@/engine';
import type { Repository } from '@/storage';
import { grownUpText as text } from '@/parent/text';
import { T0, attempt, newSession, sampleLesson } from '../helpers/content';
import { freshBackend, repositoryOn } from '../helpers/storage';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * "What a player has shown", in the grown-ups' area. It is a statement about a child, so nothing of it is on the
 * page until the record has been read: not "nothing recorded yet", and not the record of whoever was looked at
 * before.
 */

const lesson = sampleLesson();
const SKILL = 'math.quantity.match-sets-to-3';

let repository: Repository;
/** What stands between the page and the record: a test lets it through when it means the record to be read. */
let door: { open: () => void; opened: Promise<void>; broken: boolean };
function shut(): void {
  let open = (): void => undefined;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  door = { open, opened, broken: false };
}

vi.mock('@/game/services', async (original) => ({
  ...(await original<typeof Services>()),
  getRepository: () =>
    Promise.resolve(
      new Proxy(repository, {
        get(target, key) {
          if (key !== 'listAttempts') {
            const value: unknown = Reflect.get(target, key, target);
            return typeof value === 'function' ? value.bind(target) : value;
          }
          return async (profileId: string) => {
            await door.opened;
            if (door.broken) throw new Error('The record cannot be read.');
            return target.listAttempts(profileId);
          };
        },
      }),
    ),
}));

beforeEach(async () => {
  vi.resetModules();
  window.sessionStorage.clear();
  repository = await repositoryOn(freshBackend('memory'));
  shut();
});

afterEach(cleanup);

/** A player, with so many answers of their own: each right at the first try, alone, to a different question. */
async function player(name: string, answers: number, into = repository): Promise<Profile> {
  const profile = await into.createProfile({ name, avatar: 'leaf' });
  await answer(profile.id, 0, answers, into);
  return profile;
}

/** More answers for a player, numbered from `from`, in a sitting of their own. */
async function answer(profileId: string, from: number, count: number, into = repository) {
  const session = {
    ...newSession(lesson, from + 1, `sitting-${profileId}-${from}`, T0),
    profileId,
  };
  await into.saveProgress(session);
  for (let index = 0; index < count; index++) {
    await into.saveProgress(
      session,
      attempt({
        profileId,
        sessionId: session.id,
        seq: index,
        at: T0 + (from + index) * 1000,
        lessonId: lesson.id,
        skillId: SKILL,
        challengeId: `${lesson.id}.q${from + index}`,
        variant: (from + index) % 2 === 0 ? 'this-way' : 'that-way',
      }),
    );
  }
}

/** The card for whoever is playing, kept up to date as the grown-ups' area keeps it. */
async function show(profile: Profile): Promise<void> {
  await repository.setActiveProfileId(profile.id);
  const { Evidence } = await import('@/parent/Evidence');
  const { activeProfile, refreshProfiles, useProfiles } = await import('@/game/profiles');
  await refreshProfiles();
  function Card() {
    return <Evidence profile={activeProfile(useProfiles())} />;
  }
  render(<Card />);
}

const card = () => screen.getByTestId('evidence');
const rows = () => [...document.querySelectorAll<HTMLElement>('[data-testid="skill"]')];
const row = () =>
  document.querySelector<HTMLElement>(`[data-testid="skill"][data-skill="${SKILL}"]`);
/** Long enough for everything but the record to have come: the worlds' content is fetched, and drawn. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 150)));

describe('what a player has shown', () => {
  it('is nothing at all where nobody is playing', async () => {
    const { Evidence } = await import('@/parent/Evidence');
    const { container } = render(<Evidence profile={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('says nothing of any skill until the record has been read: not even that nothing is recorded', async () => {
    await show(await player('Robin', 0));
    await settle();
    // The worlds' content is in, and the record is not: nothing is said.
    expect(card().dataset.settled).toBe('false');
    expect(rows()).toEqual([]);
    expect(card().textContent).toContain(text.shownReading);
    expect(card().textContent).not.toContain('Nothing recorded yet.');
    expect(card().textContent).not.toContain(text.status['not-yet-observed']);

    // The record is read: now it is true that nothing is recorded, and the page says so of every skill.
    door.open();
    await waitFor(() => expect(card().dataset.settled).toBe('true'));
    expect(rows().length).toBeGreaterThan(50);
    expect(row()?.dataset.status).toBe('not-yet-observed');
    expect(row()?.textContent).toContain('Nothing recorded yet.');
    expect(card().textContent).not.toContain(text.shownReading);
  });

  it('says what the record holds, once it has been read', async () => {
    await show(await player('Robin', 3));
    door.open();
    await waitFor(() => expect(row()?.dataset.status).toBe('provisionally-independent'));
    expect(row()?.textContent).toContain('3 independent successes');
    expect(screen.getByRole('heading', { name: text.shown('Robin') })).toBeTruthy();
  });

  it('goes by how easy a skill’s questions are to guess, for answers written down before each one said so', async () => {
    // A skill whose questions have two pictures to choose from, as the concept graph has it.
    const { loadConceptGraph } = await import('@/content/concepts');
    const graph = await loadConceptGraph();
    const [easy] = Object.entries(graph.skills).find(([, skill]) => skill.chance === 0.5) ?? [];
    expect(easy).toBeDefined();
    if (easy === undefined) return;
    // Three right at the first try, alone: by luck that happens one time in eight, which is not rare.
    const profile = await repository.createProfile({ name: 'Robin', avatar: 'leaf' });
    const session = { ...newSession(lesson, 1, 'sitting-easy', T0), profileId: profile.id };
    await repository.saveProgress(session);
    for (let index = 0; index < 3; index++) {
      await repository.saveProgress(
        session,
        attempt({
          profileId: profile.id,
          sessionId: session.id,
          seq: index,
          at: T0 + index * 1000,
          lessonId: lesson.id,
          skillId: easy,
          challengeId: `${lesson.id}.easy${String(index)}`,
          variant: index % 2 === 0 ? 'this-way' : 'that-way',
        }),
      );
    }
    await show(profile);
    door.open();
    const easyRow = () =>
      document.querySelector<HTMLElement>(`[data-testid="skill"][data-skill="${easy}"]`);
    await waitFor(() => expect(easyRow()).not.toBeNull());
    expect(easyRow()?.dataset.status).toBe('practicing');
    expect(easyRow()?.dataset.heldByLuck).toBe('true');
    expect(easyRow()?.textContent).toContain(
      'Its questions can be got right by luck, about 1 time in 2, and the latest first tries could still be that.',
    );
    // The same three answers to questions with three pictures are enough: that is the other skill, below.
  });

  it('never leaves one player’s record on the page under another’s name', async () => {
    const robin = await player('Robin', 3);
    const sam = await player('Sam', 0);
    await show(robin);
    door.open();
    await waitFor(() => expect(row()?.textContent).toContain('3 independent successes'));

    // Sam is chosen, and Sam's record has not been read yet.
    shut();
    const { setActiveProfile } = await import('@/game/profiles');
    await act(() => setActiveProfile(sam.id));
    await settle();
    expect(screen.getByRole('heading', { name: text.shown('Sam') })).toBeTruthy();
    expect(card().dataset.settled).toBe('false');
    expect(rows()).toEqual([]);
    expect(card().textContent).not.toContain('independent success');

    door.open();
    await waitFor(() => expect(row()?.textContent).toContain('Nothing recorded yet.'));
  });

  it('reads the record again when a copy with more in it is loaded into the same player', async () => {
    // The same player on another device, where more has been played since.
    const elsewhere = await repositoryOn(freshBackend('memory'));
    const robin = await player('Robin', 1, elsewhere);
    const { importProfile } = await import('@/game/profiles');
    await importProfile(JSON.stringify(await elsewhere.exportProfile(robin.id)));
    const here = await repository.getProfile(robin.id);
    expect(here?.name).toBe('Robin');
    if (!here) return;
    await show(here);
    door.open();
    await waitFor(() => expect(row()?.textContent).toContain('1 independent success '));

    await answer(robin.id, 1, 2, elsewhere);
    // The copy is loaded, and the record has not been read again yet.
    shut();
    const loaded = await act(async () =>
      importProfile(JSON.stringify(await elsewhere.exportProfile(robin.id))),
    );
    expect(loaded).toMatchObject({ added: { attempts: 2 } });
    await settle();
    // What was on the page is still there while the new reading comes: it is not taken away to say "reading".
    expect(card().dataset.settled).toBe('true');
    expect(row()?.textContent).toContain('1 independent success ');
    expect(card().textContent).not.toContain(text.shownReading);

    door.open();
    await waitFor(() => expect(row()?.textContent).toContain('3 independent successes'));
    expect(card().dataset.settled).toBe('true');
  });

  it('says so when the record cannot be read, and says nothing of any skill', async () => {
    await show(await player('Robin', 3));
    door.broken = true;
    door.open();
    await waitFor(() => expect(card().textContent).toContain(text.shownTrouble));
    expect(card().dataset.settled).toBe('true');
    expect(rows()).toEqual([]);
    expect(card().textContent).not.toContain('Nothing recorded yet.');
  });
});
