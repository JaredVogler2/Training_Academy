import { Object3D, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { EXTENTS, LANDMARK_REACH, PITCH, PLACES, type PlaceId } from '@/render/archipelago';
import { ISLAND_BUILDERS, disposeIsland, type IslandModel } from '@/render/hub3d/islands';
import { TIERS } from '@/render/quality';

/**
 * The layout (archipelago.ts) keeps a box of screen for every island and promises that tap areas and pictures never
 * collide. That promise holds only if each model really stays inside its box, so the models are measured here.
 */

const RISE = Math.cos(PITCH);
const DEPTH = Math.sin(PITCH);

interface Measured {
  /** Furthest any vertex is from the middle, left or right. */
  across: number;
  /** Highest and lowest any vertex is drawn, in world units up the screen from the island's middle. */
  top: number;
  bottom: number;
  /** Furthest left or right of anything drawn above the island's own ellipse. */
  acrossAboveLand: number;
  triangles: number;
}

function measure(model: IslandModel, place: PlaceId): Measured {
  const landTop = EXTENTS[place].radius * DEPTH;
  const result: Measured = {
    across: 0,
    top: -Infinity,
    bottom: Infinity,
    acrossAboveLand: 0,
    triangles: 0,
  };
  const visit = (x: number, y: number, z: number) => {
    const up = y * RISE - z * DEPTH;
    result.across = Math.max(result.across, Math.abs(x));
    result.top = Math.max(result.top, up);
    result.bottom = Math.min(result.bottom, up);
    if (up > landTop) result.acrossAboveLand = Math.max(result.acrossAboveLand, Math.abs(x));
  };
  const body = model.body.getAttribute('position');
  for (let index = 0; index < body.count; index++) {
    // The skirt of land under the water is never seen.
    if (body.getY(index) < -0.05) continue;
    visit(body.getX(index), body.getY(index), body.getZ(index));
  }
  result.triangles += (model.body.index?.count ?? body.count) / 3;
  // Moving parts are followed through their motion rather than guessed at.
  const stand = new Object3D();
  const vertex = new Vector3();
  for (const mover of model.movers) {
    const part = mover.geometry.getAttribute('position');
    for (let time = 0; time < 45; time += 0.41) {
      stand.position.set(mover.at[0], mover.at[1], mover.at[2]);
      stand.rotation.set(0, 0, 0);
      stand.scale.setScalar(1);
      mover.animate(time, stand);
      stand.updateMatrix();
      for (let index = 0; index < part.count; index++) {
        vertex.fromBufferAttribute(part, index).applyMatrix4(stand.matrix);
        if (vertex.y < -0.05) continue;
        visit(vertex.x, vertex.y, vertex.z);
      }
    }
    result.triangles += (mover.geometry.index?.count ?? part.count) / 3;
  }
  return result;
}

describe.each(PLACES)('%s', (place) => {
  const model = ISLAND_BUILDERS[place](TIERS.high.detail);
  const extent = EXTENTS[place];
  const measured = measure(model, place);

  it('keeps its shore inside the room the layout gives it', () => {
    expect(model.reach).toBeLessThanOrEqual(extent.radius);
    expect(measured.across).toBeLessThanOrEqual(extent.radius);
  });

  it('is no taller on screen than its box', () => {
    expect(measured.top).toBeLessThanOrEqual(Math.max(extent.height * RISE, extent.radius * DEPTH));
  });

  it('does not hang below its box', () => {
    expect(measured.bottom).toBeGreaterThanOrEqual(-extent.radius * DEPTH);
  });

  it('is modelled, not a placeholder: land, a landmark, and detail', () => {
    expect(measured.triangles).toBeGreaterThan(6000);
    // Something stands well above the land.
    expect(model.height).toBeGreaterThan(1.8);
  });

  it('stays within a triangle budget at every tier', () => {
    for (const tier of ['low', 'medium', 'high'] as const) {
      const built = ISLAND_BUILDERS[place](TIERS[tier].detail);
      const count = measure(built, place).triangles;
      expect(count).toBeLessThan(40_000);
      disposeIsland(built);
    }
  });

  it('stores each corner once: far fewer vertices than three to a triangle', () => {
    const vertices = model.body.getAttribute('position').count;
    const triangles = (model.body.index?.count ?? 0) / 3;
    expect(model.body.index).not.toBeNull();
    expect(vertices).toBeLessThan(triangles * 1.5);
  });

  it('builds the same shape every time', () => {
    const again = ISLAND_BUILDERS[place](TIERS.high.detail);
    expect(again.body.getAttribute('position').count).toBe(
      model.body.getAttribute('position').count,
    );
    expect(again.height).toBe(model.height);
    disposeIsland(again);
  });
});

describe('the lighthouse', () => {
  it('keeps everything above its island within the narrow column the layout allows', () => {
    const model = ISLAND_BUILDERS.academy(TIERS.high.detail);
    const measured = measure(model, 'academy');
    expect(measured.acrossAboveLand).toBeLessThanOrEqual(EXTENTS.academy.radius * LANDMARK_REACH);
  });
});

describe('the archipelago as a whole', () => {
  it('has fewer triangles on the lowest tier than on the highest', () => {
    const count = (detail: number) =>
      PLACES.reduce((sum, place) => {
        const model = ISLAND_BUILDERS[place](detail);
        const triangles = measure(model, place).triangles;
        disposeIsland(model);
        return sum + triangles;
      }, 0);
    const low = count(TIERS.low.detail);
    const high = count(TIERS.high.detail);
    // The lowest tier cuts its curves more coarsely as well as leaving out decoration.
    expect(low).toBeLessThan(high * 0.7);
    expect(high).toBeLessThan(160_000);
  });
});
