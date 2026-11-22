import { createStore, useStore } from '@/app/store';
import { recordError } from '@/app/diagnostics';
import type { AvatarId, Profile } from '@/engine';
import type { BackendInfo, ImportResult, ProfilePatch } from '@/storage';
import { getRepository } from './services';

/**
 * The players on this device, and which one is playing. A thin, reactive layer over the repository.
 *
 * There is no sign-up. Until a grown-up adds players, the first activity quietly creates one called "Explorer", so a
 * child can start playing straight away and their progress still has somewhere to live.
 */

export interface ProfilesState {
  status: 'loading' | 'ready';
  profiles: Profile[];
  activeId: string | null;
  /** Where progress is being kept, once known. */
  backend: BackendInfo | null;
}

const store = createStore<ProfilesState>({
  status: 'loading',
  profiles: [],
  activeId: null,
  backend: null,
});

export const DEFAULT_PROFILE = { name: 'Explorer', avatar: 'star' } as const;

export function useProfiles(): ProfilesState {
  return useStore(store);
}

export function activeProfile(state: ProfilesState): Profile | null {
  return state.profiles.find((profile) => profile.id === state.activeId) ?? null;
}

export async function refreshProfiles(): Promise<ProfilesState> {
  const repo = await getRepository();
  try {
    const [profiles, activeId] = await Promise.all([
      repo.listProfiles(),
      repo.getActiveProfileId(),
    ]);
    store.set({
      status: 'ready',
      profiles,
      activeId: profiles.some((profile) => profile.id === activeId) ? activeId : null,
      backend: repo.backend,
    });
  } catch (error) {
    recordError('storage', error);
    store.set({ status: 'ready', profiles: [], activeId: null, backend: repo.backend });
  }
  return store.get();
}

export async function createProfile(input: { name: string; avatar: AvatarId }): Promise<Profile> {
  const repo = await getRepository();
  const profile = await repo.createProfile(input);
  await refreshProfiles();
  return profile;
}

export async function updateProfile(id: string, patch: ProfilePatch): Promise<void> {
  const repo = await getRepository();
  await repo.updateProfile(id, patch);
  await refreshProfiles();
}

export async function deleteProfile(id: string): Promise<void> {
  const repo = await getRepository();
  await repo.deleteProfile(id);
  await refreshProfiles();
}

export async function setActiveProfile(id: string): Promise<void> {
  const repo = await getRepository();
  await repo.setActiveProfileId(id);
  await refreshProfiles();
}

export async function importProfile(fileText: string): Promise<ImportResult> {
  const repo = await getRepository();
  const result = await repo.importBundle(fileText);
  await refreshProfiles();
  return result;
}

export async function resetEverything(): Promise<void> {
  const repo = await getRepository();
  await repo.resetAll();
  await refreshProfiles();
}

/** The player who is playing; creates the default one on a device that has none yet. */
export async function ensureActiveProfile(): Promise<Profile> {
  const repo = await getRepository();
  const state = store.get().status === 'ready' ? store.get() : await refreshProfiles();
  const current = activeProfile(state);
  if (current) return current;

  const first = state.profiles[0];
  if (first) {
    await repo.setActiveProfileId(first.id);
    await refreshProfiles();
    return first;
  }
  const created = await repo.createProfile(DEFAULT_PROFILE);
  await repo.setActiveProfileId(created.id);
  await refreshProfiles();
  return created;
}
