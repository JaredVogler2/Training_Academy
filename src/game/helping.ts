import { createStore, useStore } from '@/app/store';

/**
 * A grown-up has said they are helping.
 *
 * It is theirs to say, and nothing guesses it. While it is on, every answer is written down as given with an
 * adult's help, and so is never counted as something the child did alone. It is switched on and off where a
 * grown-up looks: the pause screen of any activity, the "how to play" page, and the grown-ups' area. An activity
 * shows that it is on, on the pause button itself.
 *
 * It lasts for the visit — as long as the tab does — so that a page loaded again in the middle of a sitting does
 * not quietly start counting helped answers as the child's own. A new visit begins with it off.
 */
export const HELPING_KEY = 'training-academy.helping';

function remembered(): boolean {
  try {
    return window.sessionStorage.getItem(HELPING_KEY) === '1';
  } catch {
    return false;
  }
}

const helping = createStore<boolean>(typeof window !== 'undefined' && remembered());

export function useHelping(): boolean {
  return useStore(helping);
}

export function isHelping(): boolean {
  return helping.get();
}

export function setHelping(on: boolean): void {
  helping.set(on);
  try {
    if (on) window.sessionStorage.setItem(HELPING_KEY, '1');
    else window.sessionStorage.removeItem(HELPING_KEY);
  } catch {
    // Not remembered beyond this page: it is still on until the page is loaded again.
  }
}
