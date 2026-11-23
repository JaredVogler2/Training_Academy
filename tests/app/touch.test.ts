// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ONE_ANSWER_FOR,
  SLOW_FROM,
  TAP_AT_MOST,
  TAP_SLOP,
  WAIT_FOR_CLICK,
  installTouchGuards,
} from '@/app/touch';

/** Ask for the context menu on `target`, as a long press (or a right click) does; true if it was allowed to open. */
function menuOpens(target: Element, pointerType?: string): boolean {
  const event = new Event('contextmenu', { bubbles: true, cancelable: true });
  if (pointerType !== undefined)
    Object.defineProperty(event, 'pointerType', { value: pointerType });
  target.dispatchEvent(event);
  return !event.defaultPrevented;
}

function pointerDown(target: Element, pointerType: string): void {
  const event = new Event('pointerdown', { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  target.dispatchEvent(event);
}

describe('a finger resting on the screen', () => {
  let remove: () => void;
  let island: HTMLAnchorElement;
  let grownUps: HTMLParagraphElement;
  let field: HTMLInputElement;

  beforeEach(() => {
    document.body.innerHTML =
      '<a id="island" href="/world/number-garden"><img alt="" /></a>' +
      '<section data-selectable><p id="grown-ups">Progress is kept on this device.</p></section>' +
      '<input id="field" />';
    island = document.querySelector<HTMLAnchorElement>('#island') as HTMLAnchorElement;
    grownUps = document.querySelector<HTMLParagraphElement>('#grown-ups') as HTMLParagraphElement;
    field = document.querySelector<HTMLInputElement>('#field') as HTMLInputElement;
    remove = installTouchGuards(window);
  });

  afterEach(() => remove());

  it('does not open the browser menu over the game', () => {
    expect(menuOpens(island, 'touch')).toBe(false);
    expect(menuOpens(island.firstElementChild as Element, 'touch')).toBe(false);
    expect(menuOpens(island, 'pen')).toBe(false);
  });

  it('leaves a mouse its right click', () => {
    expect(menuOpens(island, 'mouse')).toBe(true);
  });

  it('leaves the parts written for grown-ups, and anything typed into, alone', () => {
    expect(menuOpens(grownUps, 'touch')).toBe(true);
    expect(menuOpens(field, 'touch')).toBe(true);
  });

  it('goes by the last pointer that came down where the browser does not say which asked', () => {
    pointerDown(island, 'touch');
    expect(menuOpens(island)).toBe(false);
    pointerDown(island, 'mouse');
    expect(menuOpens(island)).toBe(true);
  });

  it('stops when it is taken away', () => {
    remove();
    expect(menuOpens(island, 'touch')).toBe(true);
  });
});

/** One finger doing one thing, as the browser reports it. */
function finger(
  type: 'pointerdown' | 'pointerup' | 'pointercancel',
  target: Element,
  id: number,
  at: number,
  where: { x?: number; y?: number; pointerType?: string } = {},
): void {
  const event = new Event(type, { bubbles: true });
  const { x = 20, y = 20, pointerType = 'touch' } = where;
  for (const [key, value] of Object.entries({
    pointerId: id,
    pointerType,
    clientX: x,
    clientY: y,
    timeStamp: at,
  })) {
    Object.defineProperty(event, key, { value });
  }
  target.dispatchEvent(event);
}

/** A click the browser makes by itself; true if it was allowed through. */
function browserClicks(target: Element, at: number): boolean {
  const event = new Event('click', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'timeStamp', { value: at });
  target.dispatchEvent(event);
  return !event.defaultPrevented;
}

describe('more than one finger on the screen, or a slow one', () => {
  let remove: () => void;
  let sea: HTMLElement;
  let button: HTMLButtonElement;
  let field: HTMLInputElement;
  let clicks: number;
  /** What lies on top where the finger lifted; null stands for "the thing itself". */
  let onTop: Element | null;

  /** A thumb comes to rest on the sea, and another finger taps `target` quickly; the thumb stays. */
  const tapBesideThumb = (target: Element, at = 900) => {
    finger('pointerdown', sea, 1, 0, { x: 300, y: 300 });
    finger('pointerdown', target, 2, at);
    finger('pointerup', target, 2, at + 60);
  };
  const later = (ms: number) => vi.advanceTimersByTime(ms);

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML =
      '<main id="sea"><button id="button" type="button"><span id="inside">Sound</span></button>' +
      '<input id="field" /></main>';
    sea = document.querySelector<HTMLElement>('#sea') as HTMLElement;
    button = document.querySelector<HTMLButtonElement>('#button') as HTMLButtonElement;
    field = document.querySelector<HTMLInputElement>('#field') as HTMLInputElement;
    clicks = 0;
    button.addEventListener('click', () => {
      clicks += 1;
    });
    onTop = null;
    document.elementFromPoint = () => onTop;
    remove = installTouchGuards(window);
  });

  afterEach(() => {
    remove();
    vi.useRealTimers();
  });

  it('leaves one quick finger entirely to the browser', () => {
    finger('pointerdown', button, 1, 0);
    finger('pointerup', button, 1, SLOW_FROM - 1);
    later(1000);
    expect(clicks).toBe(0);
    // And the browser's own click goes through as ever.
    expect(browserClicks(button, SLOW_FROM + 1)).toBe(true);
    expect(clicks).toBe(1);
  });

  it('answers a slow press by one finger, which a phone takes for a long press and leaves unanswered', () => {
    finger('pointerdown', button, 1, 0);
    finger('pointerup', button, 1, 600);
    expect(clicks).toBe(0);
    later(WAIT_FOR_CLICK);
    expect(clicks).toBe(1);
    later(2000);
    expect(clicks).toBe(1);
  });

  it('adds nothing to a slow press that the browser answers itself', () => {
    finger('pointerdown', button, 1, 0);
    finger('pointerup', button, 1, 600);
    expect(browserClicks(button, 602)).toBe(true);
    later(1000);
    expect(clicks).toBe(1);
  });

  it('takes a finger that stays longer than a second to have been resting', () => {
    finger('pointerdown', button, 1, 0);
    finger('pointerup', button, 1, TAP_AT_MOST + 1);
    later(1000);
    expect(clicks).toBe(0);
  });

  it('answers a tap made while a thumb rests on the screen, once', () => {
    tapBesideThumb(button);
    expect(clicks).toBe(0);
    later(WAIT_FOR_CLICK - 1);
    expect(clicks).toBe(0);
    later(1);
    expect(clicks).toBe(1);
    later(2000);
    finger('pointerup', sea, 1, 5000, { x: 300, y: 300 });
    later(2000);
    expect(clicks).toBe(1);
  });

  it('answers a tap that lands on something inside the button', () => {
    tapBesideThumb(document.querySelector('#inside') as Element);
    later(WAIT_FOR_CLICK);
    expect(clicks).toBe(1);
  });

  it('answers a tap during which another finger lands somewhere else', () => {
    finger('pointerdown', button, 1, 0);
    finger('pointerdown', sea, 2, 40, { x: 300, y: 300 });
    finger('pointerup', button, 1, 90);
    later(WAIT_FOR_CLICK);
    expect(clicks).toBe(1);
  });

  it('adds nothing when the browser answers the tap itself', () => {
    tapBesideThumb(button);
    expect(browserClicks(button, 965)).toBe(true);
    expect(clicks).toBe(1);
    later(1000);
    expect(clicks).toBe(1);
  });

  it('drops a click the browser sends late for a tap that has been answered', () => {
    tapBesideThumb(button);
    later(WAIT_FOR_CLICK);
    expect(clicks).toBe(1);
    expect(browserClicks(button, 960 + ONE_ANSWER_FOR - 1)).toBe(false);
    expect(clicks).toBe(1);
    // A click after that is a new tap.
    expect(browserClicks(button, 960 + ONE_ANSWER_FOR + 1)).toBe(true);
    expect(clicks).toBe(2);
  });

  it('does not press what the resting thumb was resting on', () => {
    finger('pointerdown', button, 1, 0);
    finger('pointerdown', sea, 2, 400, { x: 300, y: 300 });
    finger('pointerup', sea, 2, 460, { x: 300, y: 300 });
    finger('pointerup', button, 1, TAP_AT_MOST + 1);
    later(1000);
    expect(clicks).toBe(0);
  });

  it('does not count a finger that slid away, or one the browser took for scrolling', () => {
    finger('pointerdown', sea, 1, 0, { x: 300, y: 300 });
    finger('pointerdown', button, 2, 900, { x: 20, y: 20 });
    finger('pointerup', button, 2, 960, { x: 20 + TAP_SLOP + 1, y: 20 });
    later(1000);
    expect(clicks).toBe(0);

    finger('pointerdown', button, 3, 2000);
    finger('pointercancel', button, 3, 2030);
    finger('pointerup', button, 3, 2060);
    later(1000);
    expect(clicks).toBe(0);
  });

  it('does not press what can no longer be pressed', () => {
    button.disabled = true;
    tapBesideThumb(button);
    later(1000);
    button.disabled = false;

    button.setAttribute('aria-disabled', 'true');
    tapBesideThumb(button, 3000);
    later(1000);
    button.removeAttribute('aria-disabled');

    sea.setAttribute('inert', '');
    tapBesideThumb(button, 6000);
    later(1000);
    sea.removeAttribute('inert');

    // Something came to lie over it in the moment between the finger lifting and the answer.
    tapBesideThumb(button, 9000);
    onTop = field;
    later(1000);
    onTop = null;

    // It was taken off the page in that moment.
    tapBesideThumb(button, 12_000);
    button.remove();
    later(1000);
    expect(clicks).toBe(0);
  });

  it('leaves fields to the browser', () => {
    let pressed = 0;
    field.addEventListener('click', () => {
      pressed += 1;
    });
    tapBesideThumb(field);
    later(1000);
    expect(pressed).toBe(0);
  });

  it('is about fingers: a mouse and a pen are left alone', () => {
    finger('pointerdown', sea, 1, 0, { x: 300, y: 300 });
    finger('pointerdown', button, 2, 900, { pointerType: 'mouse' });
    finger('pointerup', button, 2, 960, { pointerType: 'mouse' });
    finger('pointerdown', button, 3, 1900, { pointerType: 'pen' });
    finger('pointerup', button, 3, 1960, { pointerType: 'pen' });
    later(1000);
    expect(clicks).toBe(0);
  });

  /** The browser's own report that a finger has lifted, with how many are still down. */
  const lifted = (target: Element, at: number, left: number) => {
    const event = new Event('touchend', { bubbles: true });
    Object.defineProperty(event, 'touches', { value: Array.from({ length: left }) });
    Object.defineProperty(event, 'timeStamp', { value: at });
    target.dispatchEvent(event);
  };

  it('starts afresh once every finger is off the screen, even if it was never told one had lifted', () => {
    finger('pointerdown', sea, 1, 0, { x: 300, y: 300 });
    lifted(sea, 500, 0);
    later(1);
    // One finger alone again: the browser's business.
    finger('pointerdown', button, 2, 900);
    finger('pointerup', button, 2, 960);
    later(1000);
    expect(clicks).toBe(0);
  });

  it('does not mind which way round the browser reports the last finger lifting', () => {
    // The thumb lifts first; the tapping finger is the last one down, and "none left" arrives before its own lift.
    finger('pointerdown', sea, 1, 0, { x: 300, y: 300 });
    finger('pointerdown', button, 2, 900);
    finger('pointerup', sea, 1, 930, { x: 300, y: 300 });
    lifted(sea, 930, 1);
    lifted(button, 960, 0);
    finger('pointerup', button, 2, 960);
    later(WAIT_FOR_CLICK);
    expect(clicks).toBe(1);
  });

  it('forgets everything when the page loses the screen', () => {
    finger('pointerdown', sea, 1, 0, { x: 300, y: 300 });
    window.dispatchEvent(new Event('blur'));
    finger('pointerdown', button, 2, 900);
    finger('pointerup', button, 2, 960);
    later(1000);
    expect(clicks).toBe(0);
  });

  it('stops when it is taken away', () => {
    tapBesideThumb(button);
    remove();
    later(1000);
    tapBesideThumb(button, 3000);
    later(1000);
    expect(clicks).toBe(0);
  });
});
