import { useSyncExternalStore } from 'react';

/** A phone held upright: narrower than 600 points, and taller than it is wide. */
const UPRIGHT_PHONE = '(max-width: 599px) and (orientation: portrait)';

const media = (): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(UPRIGHT_PHONE)
    : null;

function subscribe(changed: () => void): () => void {
  const watched = media();
  watched?.addEventListener('change', changed);
  return () => watched?.removeEventListener('change', changed);
}

/**
 * Whether the screen is a phone held upright, kept up to date as it is turned. A line of print is the one thing
 * here that cannot simply be made smaller to fit: on such a screen a sentence is set on two lines.
 */
export function useUprightPhone(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => media()?.matches ?? false,
    () => false,
  );
}
