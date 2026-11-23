/**
 * What a phone or tablet does with a small child's hands, where that is not what the child meant.
 *
 * **A finger that rests.** A long press on a link opens the browser's own menu ("Open in new tab", "Copy link
 * address"), and on a picture offers to save it. The stylesheet switches off what CSS can: selecting text, and the
 * call-out iOS shows (`base.css`). This stops the menu Android opens. A mouse keeps its right click, and anything
 * marked `data-selectable` — the parts written for grown-ups — keeps everything.
 *
 * **More than one finger.** A browser answers a tap only while it is the one finger on the screen: measured in
 * Chromium's own touch handling (which Chrome on Android shares), a tap made while another finger is down — a thumb
 * over the edge of a phone, a hand leaning on a tablet — produces no click at all, every time. To a child that is a
 * game that does not answer. So a short press that begins and ends on the same thing while another finger is on the
 * screen is answered here, once, with the click the browser would otherwise have made.
 *
 * It only ever adds a click where the browser gave none: the browser is given a moment to answer first, and if it
 * answers late instead, its click is dropped. One finger alone is left entirely to the browser, and so are fields,
 * scrolling and zooming (the browser takes those fingers back, and says so).
 */

/** What a tap can press. Fields and their labels are left to the browser. */
const PRESSABLE = 'a[href], button, [role="button"], summary';

/** A tap, even a small child's slow one, is over within this long; a finger that rests stays longer (ms). */
export const TAP_AT_MOST = 1000;
/** How far a finger may slide between landing and lifting and still have tapped (CSS pixels). */
export const TAP_SLOP = 24;
/** How long the browser is given to answer a tap itself before the game answers for it (ms). */
export const WAIT_FOR_CLICK = 100;
/** Once the game has answered a tap, a click the browser sends for it within this long is dropped (ms). */
export const ONE_ANSWER_FOR = 700;

interface Press {
  /** What the finger landed on that can be pressed, if anything. */
  pressed: HTMLElement | null;
  x: number;
  y: number;
  at: number;
  /** Whether another finger was on the screen at any moment while this one was. */
  crowded: boolean;
}

function canStillBePressed(element: HTMLElement, x: number, y: number): boolean {
  if (!element.isConnected || element.closest('[inert]')) return false;
  if (element.matches('[disabled], [aria-disabled="true"]')) return false;
  // Nothing may have come to lie over it since the finger lifted: a sheet that opened, say.
  const top = element.ownerDocument.elementFromPoint(x, y);
  return top === null || element.contains(top);
}

export function installTouchGuards(target: Window): () => void {
  let lastPointer = 'mouse';
  /** Every finger on the screen now, by the browser's number for it. */
  const down = new Map<number, Press>();
  /** Taps waiting to see whether the browser answers them itself. */
  const waiting = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
  let answered: { pressed: HTMLElement; at: number } | null = null;
  let answering = false;

  const fingerDown = (event: PointerEvent) => {
    lastPointer = event.pointerType === '' ? 'mouse' : event.pointerType;
    if (event.pointerType !== 'touch') return;
    const crowded = down.size > 0;
    if (crowded) for (const other of down.values()) other.crowded = true;
    const element = event.target instanceof Element ? event.target : null;
    down.set(event.pointerId, {
      pressed: element?.closest<HTMLElement>(PRESSABLE) ?? null,
      x: event.clientX,
      y: event.clientY,
      at: event.timeStamp,
      crowded,
    });
  };

  const fingerUp = (event: PointerEvent) => {
    const press = down.get(event.pointerId);
    if (!press) return;
    down.delete(event.pointerId);
    const { pressed } = press;
    if (!press.crowded || !pressed) return;
    if (event.timeStamp - press.at > TAP_AT_MOST) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > TAP_SLOP) return;
    const { clientX: x, clientY: y, timeStamp: at } = event;
    clearTimeout(waiting.get(pressed));
    waiting.set(
      pressed,
      setTimeout(() => {
        waiting.delete(pressed);
        if (!canStillBePressed(pressed, x, y)) return;
        answered = { pressed, at };
        answering = true;
        try {
          pressed.click();
        } finally {
          answering = false;
        }
      }, WAIT_FOR_CLICK),
    );
  };

  /** The browser took the finger for something of its own: scrolling, zooming, a gesture at the screen's edge. */
  const fingerTaken = (event: PointerEvent) => {
    down.delete(event.pointerId);
  };

  /** However it came about, no finger is on the screen any more. */
  const allUp = (event: Event) => {
    const touches = (event as Partial<TouchEvent>).touches;
    if (touches === undefined || touches.length === 0) down.clear();
  };

  const click = (event: MouseEvent) => {
    if (answering) return;
    const element = event.target instanceof Element ? event.target : null;
    if (!element) return;
    // The browser answered the tap itself: there is nothing to add.
    for (const [pressed, timer] of waiting) {
      if (!pressed.contains(element)) continue;
      clearTimeout(timer);
      waiting.delete(pressed);
    }
    // The browser answered, late, a tap that has been answered already: once is enough.
    if (
      answered !== null &&
      event.timeStamp - answered.at < ONE_ANSWER_FOR &&
      answered.pressed.contains(element)
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  const menu = (event: Event) => {
    // Chromium says which kind of pointer asked for the menu; other browsers do not, so remember the last one down.
    const asked = (event as Partial<PointerEvent>).pointerType;
    const pointer = asked === undefined || asked === '' ? lastPointer : asked;
    if (pointer === 'mouse') return;
    const element = event.target instanceof Element ? event.target : null;
    if (element?.closest('[data-selectable], input, textarea, select')) return;
    event.preventDefault();
  };

  const watching = { capture: true, passive: true } as const;
  target.addEventListener('pointerdown', fingerDown, watching);
  target.addEventListener('pointerup', fingerUp, watching);
  target.addEventListener('pointercancel', fingerTaken, watching);
  target.addEventListener('touchend', allUp, watching);
  target.addEventListener('touchcancel', allUp, watching);
  target.addEventListener('blur', allUp);
  target.addEventListener('click', click, { capture: true });
  target.addEventListener('contextmenu', menu);
  return () => {
    target.removeEventListener('pointerdown', fingerDown, { capture: true });
    target.removeEventListener('pointerup', fingerUp, { capture: true });
    target.removeEventListener('pointercancel', fingerTaken, { capture: true });
    target.removeEventListener('touchend', allUp, { capture: true });
    target.removeEventListener('touchcancel', allUp, { capture: true });
    target.removeEventListener('blur', allUp);
    target.removeEventListener('click', click, { capture: true });
    target.removeEventListener('contextmenu', menu);
    for (const timer of waiting.values()) clearTimeout(timer);
    waiting.clear();
    down.clear();
  };
}
