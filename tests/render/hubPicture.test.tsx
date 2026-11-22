// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import manifest from '@/assets/hub/sprites.json';
import { HubPicture } from '@/render/HubPicture';
import { PLACES, frameFor, project } from '@/render/archipelago';

afterEach(cleanup);

const frame = frameFor(
  { width: 1366, height: 768 },
  { left: 0, top: 64, width: 1366, height: 704 },
);

function sprite(container: HTMLElement, id: string): HTMLElement {
  const found = container.querySelector<HTMLElement>(`[data-sprite="${id}"]`);
  if (!found) throw new Error(`No sprite for ${id}.`);
  return found;
}

describe('the hub as a picture', () => {
  it('shows every island, with its picture', () => {
    const { container } = render(<HubPicture frame={frame} lifted={null} still={false} />);
    for (const place of PLACES) {
      const image = sprite(container, place).querySelector('img');
      expect(image?.getAttribute('src'), place).toMatch(/\.webp/);
      // Decoration: the links over the islands carry the names.
      expect(image?.getAttribute('alt')).toBe('');
    }
  });

  it('puts each island where the layout says its middle is', () => {
    const { container } = render(<HubPicture frame={frame} lifted={null} still={false} />);
    const k = frame.scale / manifest.pixelsPerUnit;
    for (const place of PLACES) {
      const spot = frame.layout.spots[place];
      const anchor = project(frame, spot.x, 0, spot.z);
      const record = manifest.sprites[place];
      const style = sprite(container, place).style;
      expect(parseFloat(style.left) + record.anchorX * k).toBeCloseTo(anchor.x, 3);
      expect(parseFloat(style.top) + record.anchorY * k).toBeCloseTo(anchor.y, 3);
      expect(parseFloat(style.width)).toBeCloseTo(record.width * k, 3);
    }
  });

  it('draws far islands before near ones', () => {
    const { container } = render(<HubPicture frame={frame} lifted={null} still={false} />);
    const order = [...container.querySelectorAll<HTMLElement>('[data-sprite]')]
      .map((element) => element.dataset.sprite ?? '')
      .filter((id) => (PLACES as readonly string[]).includes(id));
    const depths = order.map((id) => frame.layout.spots[id as (typeof PLACES)[number]].z);
    expect(depths).toEqual([...depths].sort((a, b) => a - b));
  });

  it('lifts the island that is being pointed at, and only that one', () => {
    const { container } = render(<HubPicture frame={frame} lifted="memory-forest" still={false} />);
    expect(sprite(container, 'memory-forest').hasAttribute('data-lifted')).toBe(true);
    expect(container.querySelectorAll('[data-lifted]').length).toBe(1);
  });

  it('floats the boats, rocks and clouds the layout asks for', () => {
    const { container } = render(<HubPicture frame={frame} lifted={null} still={false} />);
    const { boats, rocks, clouds } = frame.layout.extras;
    expect(container.querySelectorAll('[data-sprite^="boat-"]').length).toBe(boats.length);
    expect(container.querySelectorAll('[data-sprite="rock"]').length).toBe(rocks.length);
    expect(container.querySelectorAll('[data-sprite="cloud"]').length).toBe(clouds.length);
  });

  it('says when it should hold still', () => {
    const { container } = render(<HubPicture frame={frame} lifted={null} still />);
    expect(container.querySelector('[data-testid="hub-picture"]')?.hasAttribute('data-still')).toBe(
      true,
    );
  });
});
