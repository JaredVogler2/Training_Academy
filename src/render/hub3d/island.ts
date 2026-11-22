import { BufferAttribute, BufferGeometry, Color } from 'three';

/**
 * Academy Isle's landform, as one function of position. The terrain mesh, the water's shoreline and the placement of
 * every tree and building all read the same function, so nothing floats above the ground or stands in the sea.
 *
 * Units are metres-ish: the island is about 14 across, sea level is y = 0.
 */

export const SEA_LEVEL = 0;
const HILL_HEIGHT = 2.6;

/** Distance from the centre to the waterline in direction `angle` (radians, measured from +x towards +z). */
export function shoreRadius(angle: number): number {
  return 7 + 0.55 * Math.sin(2 * angle + 0.8) + 0.3 * Math.sin(3 * angle + 2.1);
}

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Ground height at (x, z). Negative values are under water. */
export function heightAt(x: number, z: number): number {
  const radius = Math.hypot(x, z);
  const u = radius / shoreRadius(Math.atan2(z, x));
  if (u >= 1.16) return -0.5;

  const dome = HILL_HEIGHT * Math.pow(Math.max(0, 1 - u * u), 1.5);
  // A second, lower rise behind and to the right keeps the outline from being a perfect bun.
  const knoll = 0.75 * Math.exp(-((x - 3.1) ** 2 + (z + 1.4) ** 2) / 3.2);
  const ripple = 0.16 * Math.sin(x * 1.3 + 1) * Math.cos(z * 1.1 + 2) * Math.max(0, 1 - u);
  const land = dome + knoll * Math.max(0, 1 - u) + ripple + 0.14;
  // The beach: the land eases down through the waterline and out under the sea.
  return land + (-0.5 - land) * smoothstep(0.84, 1.12, u);
}

/** The footpath from the pier up to the tower, as a polyline on the ground plane. */
export const PATH: readonly (readonly [number, number])[] = [
  [5.6, 2.9],
  [4.2, 2.4],
  [3.2, 1.5],
  [2.3, 1.3],
  [1.5, 0.7],
  [0.7, 0.5],
];

function distanceToPath(x: number, z: number): number {
  let best = Infinity;
  for (let index = 0; index < PATH.length - 1; index++) {
    const [ax, az] = PATH[index] as readonly [number, number];
    const [bx, bz] = PATH[index + 1] as readonly [number, number];
    const dx = bx - ax;
    const dz = bz - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  }
  return best;
}

const SAND = new Color('#f6dfa6');
const SAND_WET = new Color('#e9cf94');
const GRASS_LOW = new Color('#66b85b');
const GRASS_HIGH = new Color('#a9e486');
const PATH_COLOUR = new Color('#f3e4b8');

/** The terrain mesh: a polar grid, painted per vertex (sand, grass that lightens with height, the footpath). */
export function buildIslandGeometry(rings = 30, segments = 80): BufferGeometry {
  const positions: number[] = [];
  const colours: number[] = [];
  const indices: number[] = [];
  const colour = new Color();

  const addVertex = (x: number, z: number) => {
    const y = heightAt(x, z);
    positions.push(x, y, z);

    const grass = smoothstep(0.1, 0.42, y);
    const lift = Math.min(1, Math.max(0, y / HILL_HEIGHT));
    // Broad, soft variation so the grass reads as painted rather than as one flat green.
    const patch = 0.5 + 0.5 * Math.sin(x * 0.9 + 0.4) * Math.cos(z * 0.8 - 1.1);
    colour.copy(GRASS_LOW).lerp(GRASS_HIGH, Math.min(1, lift * 0.85 + patch * 0.22));
    const sand = y < 0.02 ? SAND_WET : SAND;
    colour.lerpColors(sand, colour, grass);
    const onPath = (1 - smoothstep(0.2, 0.42, distanceToPath(x, z))) * grass;
    colour.lerp(PATH_COLOUR, onPath * 0.92);
    colours.push(colour.r, colour.g, colour.b);
  };

  addVertex(0, 0);
  for (let ring = 1; ring <= rings; ring++) {
    const u = (ring / rings) * 1.16;
    for (let segment = 0; segment < segments; segment++) {
      const angle = (segment / segments) * Math.PI * 2;
      const radius = u * shoreRadius(angle);
      addVertex(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
  }

  const at = (ring: number, segment: number) => 1 + (ring - 1) * segments + (segment % segments);
  for (let segment = 0; segment < segments; segment++) {
    indices.push(0, at(1, segment + 1), at(1, segment));
  }
  for (let ring = 1; ring < rings; ring++) {
    for (let segment = 0; segment < segments; segment++) {
      const a = at(ring, segment);
      const b = at(ring, segment + 1);
      const c = at(ring + 1, segment);
      const d = at(ring + 1, segment + 1);
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colours), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
