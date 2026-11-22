import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Vector2, Vector3, Vector4, type DataTexture, type ShaderMaterial } from 'three';

/**
 * The harbour's water, seen from above: one flat plane and one shader.
 *
 * Around every island it draws a pale sandy shallows, a line of foam that breathes against the shore, ripples
 * spreading outwards and the island's soft shadow. Out in the open it is deeper towards the viewer and paler far
 * away, marbled with slow light and scattered with glints. The brush texture is the same one the islands use.
 *
 * Each island's shoreline is described by four numbers (see `landmass` in kit.ts) and recomputed here, so the foam
 * follows the land exactly.
 */

export const MAX_ISLES = 14;
export const MAX_CLOUDS = 4;

export interface Isle {
  x: number;
  z: number;
  radius: number;
  seed: number;
  wander: number;
  /** Tallest point, for the length of the shadow on the water. */
  height: number;
  /** False for something that floats: it gets foam and ripples, but no sandy shallows around it. */
  grounded?: boolean;
}

const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uPaint;
  uniform vec4 uIsles[${String(MAX_ISLES)}];
  uniform vec3 uIsleShape[${String(MAX_ISLES)}];
  uniform float uSprite;
  uniform int uCount;
  uniform vec2 uShadow;
  uniform vec3 uDeep;
  uniform vec3 uOpen;
  uniform vec3 uShallow;
  uniform vec3 uSandy;
  uniform vec3 uFoam;
  uniform vec3 uHaze;
  uniform vec3 uShade;
  uniform vec2 uDepth;
  uniform vec3 uHazeRange;
  uniform vec3 uClouds[${String(MAX_CLOUDS)}];
  varying vec3 vWorld;

  float shoreRadius(vec2 d, vec4 isle, float wander) {
    float a = atan(d.y, d.x);
    return isle.z * (1.0
      + wander * 0.6 * sin(2.0 * a + isle.w * 1.7)
      + wander * 0.35 * sin(3.0 * a + isle.w * 2.9)
      + wander * 0.2 * sin(5.0 * a + isle.w * 0.6));
  }

  void main() {
    vec2 p = vWorld.xz;

    float offshore = 1000.0;
    // Distance to the nearest real land: floating things have foam but no shallows.
    float toLand = 1000.0;
    float shade = 0.0;
    float foamGain = 1.0;
    for (int i = 0; i < ${String(MAX_ISLES)}; i++) {
      if (i >= uCount) break;
      vec2 d = p - uIsles[i].xy;
      float away = length(d);
      float widest = uIsles[i].z * (1.0 + uIsleShape[i].x * 1.15);
      // Too far for any of this island's foam, shallows or shadow to matter: skip the costly shoreline.
      if (away - widest > 3.2 + uIsleShape[i].y) {
        offshore = min(offshore, away - widest);
        continue;
      }
      float here = away - shoreRadius(d, uIsles[i], uIsleShape[i].x);
      if (here < offshore) foamGain = mix(0.45, 1.0, uIsleShape[i].z);
      offshore = min(offshore, here);
      toLand = min(toLand, here + (1.0 - uIsleShape[i].z) * 1000.0);
      // The island's shadow, pushed away from the sun by its height.
      vec2 fallen = d - uShadow * uIsleShape[i].y;
      shade = max(shade, 1.0 - smoothstep(uIsles[i].z * 0.45, uIsles[i].z * 1.2, length(fallen)));
    }

    // Open water: deeper towards the viewer, paler far away, with slow darker drifts.
    vec3 drift = texture2D(uPaint, p * 0.031 + vec2(uTime * 0.004, uTime * 0.002)).rgb;
    float nearness = smoothstep(uDepth.x, uDepth.y, p.y);
    vec3 colour = mix(uOpen, uDeep, clamp(nearness * 0.85 + (drift.r - 0.5) * 0.5, 0.0, 1.0));

    float shallows = 1.0 - smoothstep(0.0, 2.1, toLand);

    // Light marbling the surface where two slow layers of the brush cross: clearest over the pale shallows.
    float a = texture2D(uPaint, p * 0.075 + vec2(uTime * 0.011, -uTime * 0.006)).r;
    float b = texture2D(uPaint, p * 0.075 * 1.31 + vec2(-uTime * 0.009, uTime * 0.008) + 0.37).r;
    float net = smoothstep(0.05, 0.0, abs(a - b));
    colour += uFoam * net * (0.012 + 0.06 * shallows);

    // Shallows: turquoise near land, and the sand showing through right at the edge.
    colour = mix(colour, uShallow, shallows * 0.82);
    colour = mix(colour, uSandy, (1.0 - smoothstep(0.0, 0.5, toLand)) * 0.6);

    colour = mix(colour, colour * uShade, shade * 0.5 * step(0.0, offshore));

    // Clouds passing overhead.
    float overcast = 0.0;
    for (int i = 0; i < ${String(MAX_CLOUDS)}; i++) {
      vec2 d = (p - uClouds[i].xy) / max(uClouds[i].z, 0.001);
      d.y *= 1.5;
      overcast = max(overcast, (1.0 - smoothstep(0.35, 1.0, length(d))) * step(0.001, uClouds[i].z));
    }
    colour = mix(colour, colour * uShade, overcast * 0.34);

    // Foam: one line breathing against the shore, and rings spreading out and fading.
    float wobble = 0.05 * sin(p.x * 3.1 + uTime * 0.7) + 0.045 * sin(p.y * 2.7 - uTime * 0.55);
    float foam = smoothstep(0.15, 0.02, abs(offshore - 0.1 - wobble)) * foamGain;
    float ring = fract(offshore * 0.85 - uTime * 0.11 + wobble);
    float rings = smoothstep(0.9, 1.0, ring) * (1.0 - smoothstep(0.25, 2.0, offshore)) * smoothstep(0.15, 0.3, offshore);
    colour = mix(colour, uFoam, clamp(foam * 0.9 + rings * 0.32, 0.0, 1.0));

    // Glints: small lens-shaped highlights lying along the swell, gathered in loose shoals that drift. Each one
    // swells and fades as two layers of the brush slide past each other.
    float lens = texture2D(uPaint, p * vec2(0.34, 0.95) + vec2(uTime * 0.016, 0.0)).r;
    float pass = texture2D(uPaint, p * vec2(0.29, 0.8) - vec2(uTime * 0.02, uTime * 0.008) + 0.53).r;
    float shoal = texture2D(uPaint, p * 0.037 + vec2(-uTime * 0.004, 0.31)).r;
    float glint = smoothstep(0.69, 0.76, lens) * smoothstep(0.52, 0.7, pass) * smoothstep(0.46, 0.62, shoal);
    colour = mix(colour, uFoam, glint * 0.55 * smoothstep(0.7, 1.6, offshore) * (1.0 - overcast));

    // Short curved wave marks, sparse, drifting.
    float wave = sin(p.y * 2.1 + sin(p.x * 0.7 + uTime * 0.3) * 1.2 + uTime * 0.25);
    float patches = sin(p.x * 0.37 + 1.7) * sin(p.y * 0.29 - uTime * 0.04 + 0.6);
    float marks = smoothstep(0.985, 1.0, wave) * smoothstep(0.6, 0.9, patches);
    colour = mix(colour, uFoam, marks * 0.3 * smoothstep(1.2, 2.4, offshore));

    // Far water pales into the haze.
    colour = mix(colour, uHaze, smoothstep(uHazeRange.x, uHazeRange.y, -p.y) * uHazeRange.z * 1.6);

    // For the fallback pictures only the water that belongs to an island is kept: its shallows, foam, ripples and
    // shadow. Open water is left clear, to be laid over whatever sea the page has painted.
    float kept = clamp(max(max(pow(shallows, 0.7), shade * 0.6), foam + rings * 0.5), 0.0, 1.0);
    kept *= 1.0 - smoothstep(0.75, 1.35, offshore);
    gl_FragColor = vec4(colour, mix(1.0, kept, uSprite));
    #include <colorspace_fragment>
  }
`;

export interface SeaLook {
  /** World z at which the water is palest (far) and deepest (near). */
  depth: readonly [far: number, near: number];
  /** As the paint material's: −z where haze starts, −z where it is full, strength. */
  haze: readonly [number, number, number];
}

export function Sea({
  isles,
  paint,
  clock,
  shadow,
  look,
  clouds,
  sprite = false,
}: {
  /** Read every frame, so floating things can move. */
  isles: { current: readonly Isle[] };
  paint: DataTexture;
  clock: { current: number };
  /** How far, on the water, a shadow falls for each unit of height: the sun's direction flattened. */
  shadow: readonly [number, number];
  look: SeaLook;
  /** Where clouds' shadows are, shared with the paint material: x, z, radius (0 = none). */
  clouds: Vector3[];
  /** Draw only the water that belongs to the islands, on a clear ground. */
  sprite?: boolean;
}) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPaint: { value: paint },
      uIsles: { value: Array.from({ length: MAX_ISLES }, () => new Vector4()) },
      uIsleShape: { value: Array.from({ length: MAX_ISLES }, () => new Vector3()) },
      uCount: { value: 0 },
      uShadow: { value: new Vector2() },
      uDeep: { value: new Color('#2787b8') },
      uOpen: { value: new Color('#58c6d2') },
      uShallow: { value: new Color('#9aead9') },
      uSandy: { value: new Color('#efe6b4') },
      uFoam: { value: new Color('#ffffff') },
      uHaze: { value: new Color('#dff4f2') },
      uShade: { value: new Color('#93a2e4') },
      uDepth: { value: new Vector2(-24, 20) },
      uHazeRange: { value: new Vector3(8, 46, 0.2) },
      uClouds: { value: clouds },
      uSprite: { value: 0 },
    }),
    [paint, clouds],
  );

  useFrame(() => {
    const live = material.current?.uniforms;
    if (!live) return;
    (live.uTime as { value: number }).value = clock.current;
    const packed = live.uIsles?.value as Vector4[];
    const shapes = live.uIsleShape?.value as Vector3[];
    const list = isles.current;
    const count = Math.min(list.length, MAX_ISLES);
    for (let index = 0; index < count; index++) {
      const isle = list[index];
      if (!isle) continue;
      packed[index]?.set(isle.x, isle.z, isle.radius, isle.seed);
      shapes[index]?.set(isle.wander, isle.height * 0.22, isle.grounded === false ? 0 : 1);
    }
    (live.uCount as { value: number }).value = count;
    (live.uShadow?.value as Vector2).set(shadow[0], shadow[1]);
    (live.uDepth?.value as Vector2).set(look.depth[0], look.depth[1]);
    (live.uHazeRange?.value as Vector3).set(look.haze[0], look.haze[1], look.haze[2]);
    (live.uSprite as { value: number }).value = sprite ? 1 : 0;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} renderOrder={-1}>
      <planeGeometry args={[600, 600, 1, 1]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent={sprite}
      />
    </mesh>
  );
}
