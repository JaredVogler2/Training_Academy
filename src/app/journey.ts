import { createStore, useStore } from './store';

/**
 * Whether this visit has got past the front door: the opening screen where the child says who is playing.
 *
 * It is remembered for as long as the tab lives, so a refresh in the middle of the game does not ask again and a
 * fresh visit does. Where the browser refuses to remember (storage switched off), it lasts until the page is loaded
 * again, which only means being asked once more.
 */
export const BEGUN_KEY = 'training-academy.begun';

function remembered(): boolean {
  try {
    return window.sessionStorage.getItem(BEGUN_KEY) === '1';
  } catch {
    return false;
  }
}

const begun = createStore<boolean>(typeof window !== 'undefined' && remembered());

export function useBegun(): boolean {
  return useStore(begun);
}

export function hasBegun(): boolean {
  return begun.get();
}

/** The child has chosen who is playing: on to the islands. */
export function begin(): void {
  begun.set(true);
  try {
    window.sessionStorage.setItem(BEGUN_KEY, '1');
  } catch {
    // Not remembered beyond this page; see above.
  }
}

/** Ask again who is playing: after the players were changed, or in a test. */
export function returnToFrontDoor(): void {
  begun.set(false);
  try {
    window.sessionStorage.removeItem(BEGUN_KEY);
  } catch {
    // Nothing was remembered.
  }
}
