import {
  Color,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshLambertMaterial,
  RepeatWrapping,
  RGBAFormat,
  UnsignedByteType,
  Vector3,
  type IUniform,
} from 'three';
import { createRng } from '@/engine';

/**
 * The one material everything solid in the archipelago is painted with.
 *
 * It is three.js's matte (Lambert) material with four things added in its shaders, so that a handful of merged
 * meshes can look hand-painted rather than computer-flat:
 *
 *   - a small tiling "brush" texture, generated here, that mottles every surface a little, projected from the world
 *     so nothing needs UV coordinates;
 *   - wind: vertices carrying `aSway` lean back and forth (leaves, flags, grass);
 *   - light: vertices carrying `aGlow` add their own colour (windows, lamps);
 *   - a soft rim on edges turned away from the viewer, and a little haze on what is further away.
 *
 * Colour itself comes from vertex colours, laid down by the modelling kit (kit.ts).
 */

export interface PaintUniforms {
  uTime: IUniform<number>;
  uPaint: IUniform<DataTexture>;
  uRim: IUniform<Color>;
  uHaze: IUniform<Color>;
  /** x: world z at which haze starts, y: world z at which it is full, z: strength. */
  uHazeRange: IUniform<[number, number, number]>;
  uGlow: IUniform<number>;
  /** Clouds' shadows on the ground: x, z, radius (0 = none). The water uses the same list. */
  uClouds: IUniform<Vector3[]>;
  uShade: IUniform<Color>;
}

export const MAX_CLOUDS = 4;

const SIZE = 128;

/** Smooth value noise that repeats every `across` cells one way and every `down` cells the other. */
function tilingNoise(
  seed: number,
  across: number,
  down = across,
): (x: number, y: number) => number {
  const rng = createRng(seed);
  const lattice = Float32Array.from({ length: across * down }, () => rng.next());
  const at = (x: number, y: number) =>
    lattice[(((y % down) + down) % down) * across + (((x % across) + across) % across)] ?? 0;
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const tx = fade(x - x0);
    const ty = fade(y - y0);
    const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
    const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
}

/**
 * The brush texture: three unrelated patterns in three channels.
 *   R  soft blotches, as from an uneven wash
 *   G  streaks, as from a dry brush dragged one way
 *   B  fine grain
 * Built once, on the device, from a fixed seed: no image file, and the same every time.
 */
export function createPaintTexture(): DataTexture {
  const blotchA = tilingNoise(11, 4);
  const blotchB = tilingNoise(12, 8);
  const streak = tilingNoise(13, 4, 32);
  const streakWide = tilingNoise(14, 2, 8);
  const grain = tilingNoise(15, 64);
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE;
      const v = y / SIZE;
      const blotch = blotchA(u * 4, v * 4) * 0.65 + blotchB(u * 8, v * 8) * 0.35;
      // Stretched along u: long in one direction, tight in the other.
      const dragged = streak(u * 4, v * 32) * 0.7 + streakWide(u * 2, v * 8) * 0.3;
      const speck = grain(u * 64, v * 64);
      const index = (y * SIZE + x) * 4;
      data[index] = Math.round(blotch * 255);
      data[index + 1] = Math.round(dragged * 255);
      data[index + 2] = Math.round(speck * 255);
      data[index + 3] = 255;
    }
  }
  const texture = new DataTexture(data, SIZE, SIZE, RGBAFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function createPaintUniforms(): PaintUniforms {
  return {
    uTime: { value: 0 },
    uPaint: { value: createPaintTexture() },
    uRim: { value: new Color('#bfd6ff') },
    uHaze: { value: new Color('#dff4f2') },
    uHazeRange: { value: [6, 30, 0.16] },
    uGlow: { value: 1 },
    uClouds: { value: Array.from({ length: MAX_CLOUDS }, () => new Vector3()) },
    uShade: { value: new Color('#93a2e4') },
  };
}

const VERTEX_PARS = /* glsl */ `
  attribute float aSway;
  attribute float aGlow;
  uniform float uTime;
  varying vec3 vPaintWorld;
  varying vec3 vPaintNormal;
  varying float vGlow;
`;

const VERTEX_SWAY = /* glsl */ `
  #include <begin_vertex>
  if (aSway > 0.0) {
    // Two slow sines out of step, so a row of trees does not nod in unison.
    float phase = position.x * 0.9 + position.z * 0.7;
    transformed.x += aSway * 0.09 * sin(uTime * 1.3 + phase);
    transformed.z += aSway * 0.06 * cos(uTime * 1.05 + phase * 1.3);
  }
  vPaintWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vPaintNormal = normalize(mat3(modelMatrix) * objectNormal);
  vGlow = aGlow;
`;

const FRAGMENT_PARS = /* glsl */ `
  uniform sampler2D uPaint;
  uniform vec3 uRim;
  uniform vec3 uHaze;
  uniform vec3 uHazeRange;
  uniform float uGlow;
  uniform vec3 uClouds[${String(MAX_CLOUDS)}];
  uniform vec3 uShade;
  varying vec3 vPaintWorld;
  varying vec3 vPaintNormal;
  varying float vGlow;
`;

const FRAGMENT_PAINT = /* glsl */ `
  #include <color_fragment>
  {
    vec3 weight = abs(normalize(vPaintNormal));
    weight /= weight.x + weight.y + weight.z;
    // Seen from above the brush lies on the ground; on a wall it runs up and down it.
    vec3 flat_ = texture2D(uPaint, vPaintWorld.xz * 0.21).rgb;
    vec3 wall = texture2D(uPaint, vec2(vPaintWorld.x + vPaintWorld.z, vPaintWorld.y) * 0.21).rgb;
    vec3 brush = mix(wall, flat_, weight.y);
    float grain = texture2D(uPaint, vPaintWorld.xz * 0.88 + vec2(0.0, vPaintWorld.y * 0.67)).b;
    float wash = (brush.r - 0.5) * 0.36 + (brush.g - 0.5) * 0.16 + (grain - 0.5) * 0.13;
    diffuseColor.rgb *= 1.0 + wash;
    // The wash also drifts a little warm or cool, as real paint does.
    diffuseColor.rgb += vec3(0.05, 0.012, -0.05) * (brush.r - 0.5) + vec3(0.02, 0.004, -0.02) * (brush.b - 0.5);
  }
`;

const FRAGMENT_GLOW = /* glsl */ `
  #include <emissivemap_fragment>
  totalEmissiveRadiance += diffuseColor.rgb * vGlow * uGlow;
`;

const FRAGMENT_RIM = /* glsl */ `
  #include <lights_fragment_end>
  {
    // The viewer is straight down the view axis (the camera is orthographic), so the rim is simply how far the
    // surface turns away from it.
    float turned = 1.0 - clamp(normal.z, 0.0, 1.0);
    reflectedLight.indirectDiffuse += uRim * diffuseColor.rgb * pow(turned, 3.0) * 0.32;
  }
`;

const FRAGMENT_HAZE = /* glsl */ `
  #include <opaque_fragment>
  {
    // A cloud passing overhead dims what is under it, towards the same cool tint as on the water.
    float overcast = 0.0;
    for (int i = 0; i < ${String(MAX_CLOUDS)}; i++) {
      vec2 d = (vPaintWorld.xz - uClouds[i].xy) / max(uClouds[i].z, 0.001);
      d.y *= 1.5;
      overcast = max(overcast, (1.0 - smoothstep(0.35, 1.0, length(d))) * step(0.001, uClouds[i].z));
    }
    gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * uShade, overcast * 0.3 * (1.0 - vGlow));
    float far = smoothstep(uHazeRange.x, uHazeRange.y, -vPaintWorld.z);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, far * uHazeRange.z);
  }
`;

/**
 * Make a paint material that shares `uniforms` with every other one made from them, so a single clock drives all
 * the wind and a single texture is uploaded once.
 */
export function createPaintMaterial(uniforms: PaintUniforms): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ vertexColors: true });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <begin_vertex>', VERTEX_SWAY);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <color_fragment>', FRAGMENT_PAINT)
      .replace('#include <emissivemap_fragment>', FRAGMENT_GLOW)
      .replace('#include <lights_fragment_end>', FRAGMENT_RIM)
      .replace('#include <opaque_fragment>', FRAGMENT_HAZE);
  };
  // One program for every paint material, whatever three.js would otherwise decide from the callback's identity.
  material.customProgramCacheKey = () => 'training-academy-paint-4';
  return material;
}
