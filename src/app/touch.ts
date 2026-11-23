/**
 * What a phone or tablet does when a finger rests on the screen — which a small child's finger often does.
 *
 * A long press on a link opens the browser's own menu ("Open in new tab", "Copy link address"), and on a picture
 * offers to save it. The stylesheet switches off what CSS can: selecting text, and the call-out iOS shows
 * (`base.css`). This stops the menu Android opens. A mouse keeps its right click, and anything marked
 * `data-selectable` — the parts written for grown-ups — keeps everything.
 */
export function installTouchGuards(target: Window): () => void {
  let lastPointer = 'mouse';

  const notePointer = (event: PointerEvent) => {
    lastPointer = event.pointerType === '' ? 'mouse' : event.pointerType;
  };

  const guard = (event: Event) => {
    // Chromium says which kind of pointer asked for the menu; other browsers do not, so remember the last one down.
    const asked = (event as Partial<PointerEvent>).pointerType;
    const pointer = asked === undefined || asked === '' ? lastPointer : asked;
    if (pointer === 'mouse') return;
    const element = event.target instanceof Element ? event.target : null;
    if (element?.closest('[data-selectable], input, textarea, select')) return;
    event.preventDefault();
  };

  target.addEventListener('pointerdown', notePointer, { capture: true, passive: true });
  target.addEventListener('contextmenu', guard);
  return () => {
    target.removeEventListener('pointerdown', notePointer, { capture: true });
    target.removeEventListener('contextmenu', guard);
  };
}
