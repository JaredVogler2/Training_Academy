import { useRef, type PointerEvent } from 'react';

/** A click that follows a press within this long (ms) is the same tap, and is not answered twice. */
const SAME_TAP = 900;

/**
 * An instrument sounds when it is touched, not when the finger lifts: a drum that waits for the finger to come
 * away is always late. So the press itself is answered, with the moment it happened on the page's clock; and a
 * tap that reaches the page only as a click — a key on a keyboard, or a tap the game answered for the browser
 * (src/app/touch.ts) — is answered then, and never a second time.
 */
export function usePressNow(strike: (at: number) => void): {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onClick: () => void;
} {
  const last = useRef(-Infinity);
  return {
    onPointerDown: (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      last.current = performance.now();
      strike(last.current);
    },
    onClick: () => {
      const now = performance.now();
      if (now - last.current < SAME_TAP) return;
      strike(now);
    },
  };
}
