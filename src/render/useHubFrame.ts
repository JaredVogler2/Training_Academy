import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { frameFor, type Frame } from './archipelago';

/**
 * Measure the hub and work out where everything goes (archipelago.ts). The answer is shared by the 3D scene, the
 * picture it falls back to, and the tappable areas, so all three line up.
 *
 * `stage` is the whole hub; `free` is an empty element laid over the part of it that the top bar and the device's
 * safe areas leave uncovered.
 */
export function useHubFrame(): {
  stage: RefObject<HTMLDivElement | null>;
  free: RefObject<HTMLDivElement | null>;
  frame: Frame | null;
} {
  const stage = useRef<HTMLDivElement>(null);
  const free = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<Frame | null>(null);
  const last = useRef('');

  useLayoutEffect(() => {
    const whole = stage.current;
    const open = free.current;
    if (!whole || !open) return;
    const measure = () => {
      const outer = whole.getBoundingClientRect();
      const inner = open.getBoundingClientRect();
      if (outer.width < 1 || outer.height < 1 || inner.width < 1 || inner.height < 1) return;
      const box = {
        left: inner.left - outer.left,
        top: inner.top - outer.top,
        width: inner.width,
        height: inner.height,
      };
      const key = [outer.width, outer.height, box.left, box.top, box.width, box.height]
        .map((value) => Math.round(value * 2) / 2)
        .join(' ');
      if (key === last.current) return;
      last.current = key;
      setFrame(frameFor({ width: outer.width, height: outer.height }, box));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(whole);
    observer.observe(open);
    return () => observer.disconnect();
  }, []);

  return { stage, free, frame };
}
