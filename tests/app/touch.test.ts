// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installTouchGuards } from '@/app/touch';

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
