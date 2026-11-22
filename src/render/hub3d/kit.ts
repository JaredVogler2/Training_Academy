import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  Quaternion,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * A small modelling kit. Every island is "sculpted" from it in code: shapes are placed, painted with a colour or a
 * bottom-to-top gradient, and merged into a single mesh, so a whole island costs one draw call.
 *
 * Nothing here is a downloaded model. The shapes are deliberately soft and chunky — rounded blocks, lathe-turned
 * towers, tufted trees — and the paint material (paint.ts) adds the brushwork.
 */

export type Vec3 = readonly [number, number, number];

/** One colour, or a gradient from the bottom of the shape to its top. */
export type Tint = string | readonly [bottom: string, top: string];

export interface Stroke {
  tint: Tint;
  /** How much the wind moves it (0 = not at all). */
  sway?: number;
  /** Sway grows from nothing at the bottom of the shape to full at its top: a trunk stays put, the crown nods. */
  swayFromBase?: boolean;
  /** How much of its own colour it gives off as light (windows, lamps). */
  glow?: number;
  /** Darken the foot of the shape, as if it stood in its own shadow (0–1). */
  shade?: number;
}

export interface Placement {
  at?: Vec3;
  /** Rotation in radians about x, y, z. */
  turn?: Vec3;
  size?: number | Vec3;
}

const scratch = {
  matrix: new Matrix4(),
  position: new Vector3(),
  quaternion: new Quaternion(),
  euler: new Euler(),
  scale: new Vector3(),
  bottom: new Color(),
  top: new Color(),
};

const smooth = (edge0: number, edge1: number, value: number): number => {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * For putting the parts of something that has been turned about its upright axis: give a position as so far to
 * its right, so far up, and so far out of its front, and get the place in the island's own coordinates.
 */
export function placer(at: Vec3, yaw: number) {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return (right: number, up: number, out: number): [number, number, number] => [
    at[0] + cos * right + sin * out,
    at[1] + up,
    at[2] - sin * right + cos * out,
  ];
}

export class Sculpture {
  private readonly pieces: BufferGeometry[] = [];

  /** Place a shape and paint it. The shape handed in is consumed. */
  add(shape: BufferGeometry, paint: Stroke | Tint, placement: Placement = {}): this {
    const stroke: Stroke =
      typeof paint === 'string' || Array.isArray(paint)
        ? { tint: paint as Tint }
        : (paint as Stroke);
    const geometry = shape.index ? shape.toNonIndexed() : shape;
    if (geometry !== shape) shape.dispose();
    for (const name of Object.keys(geometry.attributes)) {
      if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name);
    }
    if (!geometry.hasAttribute('normal')) geometry.computeVertexNormals();

    const { at = [0, 0, 0], turn = [0, 0, 0], size = 1 } = placement;
    scratch.position.set(at[0], at[1], at[2]);
    scratch.quaternion.setFromEuler(scratch.euler.set(turn[0], turn[1], turn[2]));
    if (typeof size === 'number') scratch.scale.setScalar(size);
    else scratch.scale.set(size[0], size[1], size[2]);
    geometry.applyMatrix4(
      scratch.matrix.compose(scratch.position, scratch.quaternion, scratch.scale),
    );

    geometry.computeBoundingBox();
    const low = geometry.boundingBox?.min.y ?? 0;
    const high = geometry.boundingBox?.max.y ?? 1;
    const span = Math.max(high - low, 1e-6);
    const [bottomTint, topTint] =
      typeof stroke.tint === 'string' ? [stroke.tint, stroke.tint] : stroke.tint;
    scratch.bottom.set(bottomTint);
    scratch.top.set(topTint);

    const positions = geometry.getAttribute('position');
    const count = positions.count;
    const colours = new Float32Array(count * 3);
    const sway = new Float32Array(count);
    const glow = new Float32Array(count);
    for (let index = 0; index < count; index++) {
      const t = (positions.getY(index) - low) / span;
      const dim = 1 - (stroke.shade ?? 0) * (1 - smooth(0, 0.45, t));
      colours[index * 3] = (scratch.bottom.r + (scratch.top.r - scratch.bottom.r) * t) * dim;
      colours[index * 3 + 1] = (scratch.bottom.g + (scratch.top.g - scratch.bottom.g) * t) * dim;
      colours[index * 3 + 2] = (scratch.bottom.b + (scratch.top.b - scratch.bottom.b) * t) * dim;
      sway[index] = (stroke.sway ?? 0) * (stroke.swayFromBase ? t : 1);
      glow[index] = stroke.glow ?? 0;
    }
    geometry.setAttribute('color', new BufferAttribute(colours, 3));
    geometry.setAttribute('aSway', new BufferAttribute(sway, 1));
    geometry.setAttribute('aGlow', new BufferAttribute(glow, 1));
    this.pieces.push(geometry);
    return this;
  }

  /** Add an already painted geometry (from `landmass`, or another sculpture's `build`). */
  addPainted(geometry: BufferGeometry, placement: Placement = {}): this {
    const { at = [0, 0, 0], turn = [0, 0, 0], size = 1 } = placement;
    scratch.position.set(at[0], at[1], at[2]);
    scratch.quaternion.setFromEuler(scratch.euler.set(turn[0], turn[1], turn[2]));
    if (typeof size === 'number') scratch.scale.setScalar(size);
    else scratch.scale.set(size[0], size[1], size[2]);
    geometry.applyMatrix4(
      scratch.matrix.compose(scratch.position, scratch.quaternion, scratch.scale),
    );
    this.pieces.push(geometry);
    return this;
  }

  get isEmpty(): boolean {
    return this.pieces.length === 0;
  }

  /** Everything added so far, as one geometry. The sculpture is spent afterwards. */
  build(): BufferGeometry {
    const merged = mergeGeometries(this.pieces, false);
    for (const piece of this.pieces) piece.dispose();
    this.pieces.length = 0;
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    return merged;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------------------------------------------------

/** A ball, optionally squashed: `squash` < 1 makes it a bun, > 1 an egg. */
export function ball(radius: number, squash = 1, detail = 12): BufferGeometry {
  const geometry = new SphereGeometry(radius, detail, Math.max(6, Math.round(detail * 0.7)));
  if (squash !== 1) geometry.scale(1, squash, 1);
  return geometry;
}

/** A stone: a ball pushed out of true, the same way every time. */
export function stone(radius: number, squash = 0.7): BufferGeometry {
  const geometry = new SphereGeometry(radius, 9, 6);
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    // Depends only on where the vertex is, so the two ends of the sphere's seam move together.
    const lump =
      1 +
      0.14 * Math.sin((x / radius) * 3.1 + 0.4) * Math.cos((z / radius) * 2.7 + 1.1) +
      0.1 * Math.sin((y / radius) * 4.3 + (x / radius) * 1.9);
    positions.setXYZ(index, x * lump, y * lump * squash, z * lump * 0.88);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A cylinder or tapered post, standing on y = 0. */
export function post(
  bottomRadius: number,
  topRadius: number,
  height: number,
  sides = 14,
): BufferGeometry {
  const geometry = new CylinderGeometry(topRadius, bottomRadius, height, sides);
  geometry.translate(0, height / 2, 0);
  return geometry;
}

/** A cone standing on y = 0. */
export function cone(radius: number, height: number, sides = 16): BufferGeometry {
  const geometry = new ConeGeometry(radius, height, sides);
  geometry.translate(0, height / 2, 0);
  return geometry;
}

/** A plain box standing on y = 0. */
export function box(width: number, height: number, depth: number): BufferGeometry {
  const geometry = new BoxGeometry(width, height, depth);
  geometry.translate(0, height / 2, 0);
  return geometry;
}

/**
 * A block with rounded vertical edges and softened top and bottom, standing on y = 0: the kit's building brick.
 * Nothing in the archipelago has a knife-sharp corner.
 */
export function block(width: number, height: number, depth: number, round = 0.12): BufferGeometry {
  // The softened edge is added outside the outline, so the outline is drawn that much smaller: the finished block
  // measures exactly width × height × depth.
  const bevel = Math.min(0.05, height * 0.2, width * 0.25, depth * 0.25);
  const halfWidth = width / 2 - bevel;
  const halfDepth = depth / 2 - bevel;
  const r = Math.max(0.002, Math.min(round, halfWidth - 0.001, halfDepth - 0.001));
  const w = halfWidth - r;
  const d = halfDepth - r;
  const outline = new Shape();
  outline.moveTo(-w, -d - r);
  outline.lineTo(w, -d - r);
  outline.absarc(w, -d, r, -Math.PI / 2, 0, false);
  outline.lineTo(w + r, d);
  outline.absarc(w, d, r, 0, Math.PI / 2, false);
  outline.lineTo(-w, d + r);
  outline.absarc(-w, d, r, Math.PI / 2, Math.PI, false);
  outline.lineTo(-w - r, -d);
  outline.absarc(-w, -d, r, Math.PI, Math.PI * 1.5, false);
  const geometry = new ExtrudeGeometry(outline, {
    depth: height - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 5,
  });
  // Extruded along z: stand it up, with its foot on y = 0.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  return geometry;
}

/** Any flat outline given a thickness (along z), with softened edges. Lies in the x–y plane, centred on z. */
export function slab(outline: Shape, thickness: number, bevel = 0.03): BufferGeometry {
  const geometry = new ExtrudeGeometry(outline, {
    depth: Math.max(thickness - bevel * 2, 0.001),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geometry.translate(0, 0, -thickness / 2 + bevel);
  return geometry;
}

/** A shape turned on a lathe: `profile` is a list of [radius, height] from the bottom up. */
export function turned(
  profile: readonly (readonly [number, number])[],
  sides = 20,
): BufferGeometry {
  return new LatheGeometry(
    profile.map(([radius, height]) => new Vector2(Math.max(radius, 0.0001), height)),
    sides,
  );
}

/** A gable roof with its ridge along x, its eaves at y = 0, overhanging nothing: place and size it yourself. */
export function gable(width: number, height: number, depth: number): BufferGeometry {
  const outline = new Shape();
  outline.moveTo(-depth / 2, 0);
  outline.lineTo(depth / 2, 0);
  outline.lineTo(0, height);
  outline.closePath();
  const geometry = slab(outline, width, 0.035);
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

/**
 * A boat's hull, bow towards +x, sitting on y = 0: a pointed oval, narrower at the keel than at the gunwale.
 */
export function hull(length: number, width: number, height: number): BufferGeometry {
  const l = length / 2;
  const w = width / 2;
  const outline = new Shape();
  outline.moveTo(-l, -w * 0.72);
  outline.quadraticCurveTo(l * 0.35, -w * 1.25, l, 0);
  outline.quadraticCurveTo(l * 0.35, w * 1.25, -l, w * 0.72);
  outline.closePath();
  const geometry = new ExtrudeGeometry(outline, {
    depth: height,
    bevelEnabled: false,
    curveSegments: 8,
  });
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position');
  for (let index = 0; index < positions.count; index++) {
    const t = Math.min(1, positions.getY(index) / (height * 0.6));
    const taper = 0.58 + 0.42 * t;
    positions.setX(index, positions.getX(index) * (0.86 + 0.14 * t));
    positions.setZ(index, positions.getZ(index) * taper);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A flat shape with any number of straight sides, in the x–y plane: sails, pennants, roofs' ends. */
export function outlineOf(points: readonly (readonly [number, number])[]): Shape {
  const outline = new Shape();
  const [first, ...rest] = points;
  if (!first) return outline;
  outline.moveTo(first[0], first[1]);
  for (const [x, y] of rest) outline.lineTo(x, y);
  outline.closePath();
  return outline;
}

// ---------------------------------------------------------------------------------------------------------------------
// Land
// ---------------------------------------------------------------------------------------------------------------------

export interface Patch {
  x: number;
  z: number;
  radius: number;
  tint: string;
  /** 0–1: how completely the patch replaces the ground colour at its centre. */
  strength?: number;
}

export interface LandSpec {
  /** Shoreline radius, before the wobble. */
  radius: number;
  /** Height of the flat top above the water. */
  height: number;
  /** The flat top reaches this fraction of the way to the shore. */
  plateau?: number;
  /** 0 = a soft dune all the way down, 1 = bare rock on the slope. */
  cliff?: number;
  /** Changes the shape of the shoreline. */
  seed?: number;
  /** How far the shoreline wanders from a circle (0–0.3). */
  wander?: number;
  grass: readonly [edge: string, middle: string];
  sand?: string;
  rock?: string;
  /** Painted areas: paths, plazas, flower beds. */
  patches?: readonly Patch[];
  /** Where things stand: the ground is darkened a little under and around each. */
  contacts?: readonly { x: number; z: number; radius: number }[];
}

export interface Land {
  geometry: BufferGeometry;
  /** Height of the ground at a point, for standing things on it. */
  heightAt(x: number, z: number): number;
  /** Distance from the centre to the waterline in a given direction. */
  shoreAt(angle: number): number;
  radius: number;
  /** The furthest the waterline gets from the centre. */
  reach: number;
  /** The two numbers the water needs to redraw this shore. */
  shore: { seed: number; wander: number };
}

const BEACH_FROM = 0.78;
const BEACH_HEIGHT = 0.14;
const RINGS = 22;
const SEGMENTS = 64;
const SKIRT = 1.06;

/** A small island: a flat-topped hill with a slope, a ring of sand, and an irregular shore. */
export function landmass(spec: LandSpec): Land {
  const {
    radius,
    height,
    plateau = 0.5,
    cliff = 0.3,
    seed = 1,
    wander = 0.12,
    sand = '#f6dfa6',
    rock = '#a9a6b4',
    patches = [],
    contacts = [],
  } = spec;

  const shoreAt = (angle: number): number =>
    radius *
    (1 +
      wander * 0.6 * Math.sin(2 * angle + seed * 1.7) +
      wander * 0.35 * Math.sin(3 * angle + seed * 2.9) +
      wander * 0.2 * Math.sin(5 * angle + seed * 0.6));

  /** Height as a function of how far out we are: 0 at the centre, 1 at the waterline. */
  const profile = (f: number): number => {
    if (f >= 1) return -0.5 * ((f - 1) / (SKIRT - 1));
    if (f >= BEACH_FROM) return BEACH_HEIGHT * (1 - (f - BEACH_FROM) / (1 - BEACH_FROM));
    if (f >= plateau) {
      return BEACH_HEIGHT + (height - BEACH_HEIGHT) * (1 - smooth(plateau, BEACH_FROM, f));
    }
    return height * (1 + 0.05 * (1 - (f / plateau) ** 2));
  };

  const heightAt = (x: number, z: number): number => {
    const distance = Math.hypot(x, z);
    if (distance < 1e-6) return profile(0);
    return profile(distance / shoreAt(Math.atan2(z, x)));
  };

  const edge = new Color(spec.grass[0]);
  const middle = new Color(spec.grass[1]);
  const sandColour = new Color(sand);
  const wetSand = new Color(sand).multiplyScalar(0.84);
  const rockColour = new Color(rock);
  const shadow = new Color('#2f6f8f');
  const patchColours = patches.map((patch) => new Color(patch.tint));

  const colourAt = (x: number, z: number, f: number, target: Color): void => {
    // Grass: lighter in the middle, with slow drifts of a second green so it is not one flat field.
    const drift = 0.5 + 0.5 * Math.sin(x * 1.9 + seed) * Math.cos(z * 1.6 - seed * 0.7);
    target.copy(edge).lerp(middle, (1 - smooth(0, plateau + 0.15, f)) * 0.75 + drift * 0.25);
    // The slope shows rock where it is steep.
    const slope =
      smooth(plateau + 0.02, plateau + 0.18, f) *
      (1 - smooth(BEACH_FROM - 0.14, BEACH_FROM - 0.02, f));
    target.lerp(rockColour, slope * cliff);
    for (const [index, patch] of patches.entries()) {
      const reach = Math.hypot(x - patch.x, z - patch.z) / patch.radius;
      const colour = patchColours[index];
      if (reach < 1 && colour)
        target.lerp(colour, (1 - smooth(0.55, 1, reach)) * (patch.strength ?? 1));
    }
    // Sand, darker where the water has just been.
    target.lerp(sandColour, smooth(BEACH_FROM - 0.07, BEACH_FROM + 0.02, f));
    target.lerp(wetSand, smooth(0.93, 1, f));
    // Under and around whatever stands here the ground keeps its colour but loses light, turning a little cool.
    for (const contact of contacts) {
      const reach = Math.hypot(x - contact.x, z - contact.z) / contact.radius;
      if (reach >= 1) continue;
      const depth = 1 - smooth(0.15, 1, reach);
      target.lerp(shadow, depth * 0.1).multiplyScalar(1 - depth * 0.2);
    }
  };

  const positions: number[] = [];
  const colours: number[] = [];
  const indices: number[] = [];
  const colour = new Color();
  // The centre vertex, then rings out to a little past the waterline.
  positions.push(0, profile(0), 0);
  colourAt(0, 0, 0, colour);
  colours.push(colour.r, colour.g, colour.b);
  for (let ring = 1; ring <= RINGS; ring++) {
    // More rings near the shore, where the shape changes fastest.
    const f = SKIRT * (ring / RINGS) ** 0.85;
    for (let segment = 0; segment < SEGMENTS; segment++) {
      const angle = (segment / SEGMENTS) * Math.PI * 2;
      const distance = f * shoreAt(angle);
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      positions.push(x, profile(f), z);
      colourAt(x, z, f, colour);
      colours.push(colour.r, colour.g, colour.b);
    }
  }
  for (let segment = 0; segment < SEGMENTS; segment++) {
    indices.push(0, 1 + ((segment + 1) % SEGMENTS), 1 + segment);
  }
  for (let ring = 1; ring < RINGS; ring++) {
    const inner = 1 + (ring - 1) * SEGMENTS;
    const outer = 1 + ring * SEGMENTS;
    for (let segment = 0; segment < SEGMENTS; segment++) {
      const next = (segment + 1) % SEGMENTS;
      indices.push(inner + segment, inner + next, outer + segment);
      indices.push(inner + next, outer + next, outer + segment);
    }
  }

  const indexed = new BufferGeometry();
  indexed.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  indexed.setAttribute('color', new BufferAttribute(new Float32Array(colours), 3));
  indexed.setIndex(indices);
  indexed.computeVertexNormals();
  const geometry = indexed.toNonIndexed();
  indexed.dispose();
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute('aSway', new BufferAttribute(new Float32Array(count), 1));
  geometry.setAttribute('aGlow', new BufferAttribute(new Float32Array(count), 1));
  let reach = 0;
  for (let step = 0; step < 360; step++) reach = Math.max(reach, shoreAt((step / 180) * Math.PI));
  return { geometry, heightAt, shoreAt, radius, reach, shore: { seed, wander } };
}

// ---------------------------------------------------------------------------------------------------------------------
// Things that grow
// ---------------------------------------------------------------------------------------------------------------------

export interface Greens {
  dark: string;
  light: string;
  trunk?: string;
}

export const LEAF: Greens = { dark: '#2f8f55', light: '#8fdc72', trunk: '#8a5f3f' };

/** A round, tufted tree: three overlapping crowns on a short trunk. */
export function tree(
  sculpture: Sculpture,
  at: Vec3,
  size = 1,
  greens: Greens = LEAF,
  turn = 0,
): void {
  const trunk = greens.trunk ?? '#8a5f3f';
  sculpture.add(
    post(0.09 * size, 0.07 * size, 0.5 * size, 8),
    { tint: [trunk, trunk], shade: 0.25 },
    { at },
  );
  const crowns: readonly (readonly [number, number, number, number])[] = [
    [0, 0.78, 0, 0.42],
    [0.24, 0.62, 0.1, 0.3],
    [-0.22, 0.6, -0.08, 0.29],
    [0.02, 0.58, 0.24, 0.27],
  ];
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  for (const [x, y, z, r] of crowns) {
    sculpture.add(
      ball(r * size, 0.86, 10),
      { tint: [greens.dark, greens.light], sway: 0.55 * size, swayFromBase: true },
      {
        at: [
          at[0] + (x * cos - z * sin) * size,
          at[1] + y * size,
          at[2] + (x * sin + z * cos) * size,
        ],
      },
    );
  }
}

/** A storybook pine: three stacked skirts. */
export function pine(sculpture: Sculpture, at: Vec3, size = 1, greens: Greens = LEAF): void {
  const trunk = greens.trunk ?? '#8a5f3f';
  sculpture.add(
    post(0.07 * size, 0.05 * size, 0.34 * size, 8),
    { tint: trunk, shade: 0.25 },
    { at },
  );
  const skirts: readonly (readonly [number, number, number])[] = [
    [0.22, 0.38, 0.5],
    [0.5, 0.3, 0.44],
    [0.76, 0.22, 0.4],
  ];
  for (const [y, r, h] of skirts) {
    sculpture.add(
      cone(r * size, h * size, 12),
      { tint: [greens.dark, greens.light], sway: 0.35 * size, swayFromBase: true },
      { at: [at[0], at[1] + y * size, at[2]] },
    );
  }
}

/** A low, round shrub. */
export function bush(sculpture: Sculpture, at: Vec3, size = 1, greens: Greens = LEAF): void {
  sculpture.add(
    ball(0.26 * size, 0.72, 9),
    { tint: [greens.dark, greens.light], sway: 0.2, swayFromBase: true },
    { at: [at[0], at[1] + 0.13 * size, at[2]] },
  );
  sculpture.add(
    ball(0.18 * size, 0.74, 8),
    { tint: [greens.dark, greens.light], sway: 0.2, swayFromBase: true },
    { at: [at[0] + 0.2 * size, at[1] + 0.1 * size, at[2] + 0.08 * size] },
  );
}

/** A flower big enough to read as a dot of colour from across the harbour. */
export function flower(sculpture: Sculpture, at: Vec3, tint: string, size = 1): void {
  sculpture.add(post(0.014 * size, 0.014 * size, 0.14 * size, 5), '#4d9f52', { at });
  sculpture.add(
    ball(0.07 * size, 0.6, 7),
    { tint, sway: 0.25, glow: 0.12 },
    { at: [at[0], at[1] + 0.15 * size, at[2]] },
  );
}

/** A rounded boulder, half sunk. */
export function boulder(
  sculpture: Sculpture,
  at: Vec3,
  size = 1,
  tint: Tint = ['#8f93a8', '#c2c5d2'],
  turn = 0,
): void {
  sculpture.add(
    stone(0.3 * size),
    { tint, shade: 0.2 },
    { at: [at[0], at[1] + 0.1 * size, at[2]], turn: [0, turn, 0] },
  );
}

/** A palm: a leaning trunk in short lengths and a crown of drooping fronds. */
export function palm(
  sculpture: Sculpture,
  at: Vec3,
  size = 1,
  lean = 0.5,
  greens: Greens = LEAF,
): void {
  const trunk = greens.trunk ?? '#a9794f';
  const lengths = 5;
  let x = at[0];
  let y = at[1];
  const z = at[2];
  for (let index = 0; index < lengths; index++) {
    // The trunk leans out, then straightens: each length tilts a little less than the one below.
    const tilt = lean * 0.42 * (1 - index / lengths);
    const length = 0.26 * size;
    sculpture.add(
      post(
        0.075 * size - index * 0.006 * size,
        0.066 * size - index * 0.006 * size,
        length * 1.08,
        7,
      ),
      { tint: [trunk, '#c99a66'], shade: index === 0 ? 0.3 : 0 },
      { at: [x, y, z], turn: [0, 0, -tilt] },
    );
    x += Math.sin(tilt) * length;
    y += Math.cos(tilt) * length;
  }
  const fronds = 7;
  for (let index = 0; index < fronds; index++) {
    const angle = (index / fronds) * Math.PI * 2 + 0.3;
    sculpture.add(
      ball(0.3 * size, 0.2, 8),
      { tint: [greens.dark, greens.light], sway: 0.5 * size },
      {
        at: [x + Math.cos(angle) * 0.24 * size, y - 0.03 * size, z + Math.sin(angle) * 0.24 * size],
        turn: [0, -angle, -0.5],
        size: [1, 1, 0.42],
      },
    );
  }
  sculpture.add(ball(0.09 * size, 1, 7), '#8a5f3f', { at: [x, y - 0.02 * size, z] });
}

/** A toadstool with a spotted cap. */
export function mushroom(
  sculpture: Sculpture,
  at: Vec3,
  size = 1,
  cap: Tint = ['#d9483b', '#ff7a66'],
): void {
  sculpture.add(
    post(0.07 * size, 0.055 * size, 0.2 * size, 8),
    { tint: ['#eadfc8', '#fffaf0'], shade: 0.25 },
    { at },
  );
  sculpture.add(ball(0.2 * size, 0.62, 12), cap, { at: [at[0], at[1] + 0.22 * size, at[2]] });
  const spots: readonly (readonly [number, number])[] = [
    [0.3, 0.2],
    [2.2, 0.3],
    [4.1, 0.25],
    [5.3, 0.6],
  ];
  for (const [angle, up] of spots) {
    const out = 0.17 * size * (1 - up * 0.5);
    sculpture.add(ball(0.04 * size, 0.5, 6), '#fffaf0', {
      at: [
        at[0] + Math.cos(angle) * out,
        at[1] + (0.26 + up * 0.09) * size,
        at[2] + Math.sin(angle) * out,
      ],
    });
  }
}
