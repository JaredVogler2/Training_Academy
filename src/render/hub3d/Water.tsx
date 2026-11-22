import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, type ShaderMaterial } from 'three';

/**
 * The sea: one flat plane and one small shader. Pale at the horizon and deeper towards the viewer, a turquoise
 * shallows around the island, a breathing line of foam on the shore, and slow curved glints. No textures.
 *
 * The shoreline function is the same one the terrain uses (island.ts), written again in GLSL.
 */

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
  uniform vec3 uNear;
  uniform vec3 uMid;
  uniform vec3 uFar;
  uniform vec3 uShallow;
  uniform vec3 uHaze;
  uniform vec3 uFoam;
  varying vec3 vWorld;

  float shoreRadius(float a) {
    return 7.0 + 0.55 * sin(2.0 * a + 0.8) + 0.3 * sin(3.0 * a + 2.1);
  }

  void main() {
    vec2 p = vWorld.xz;
    float angle = atan(p.y, p.x);
    float offshore = length(p) - shoreRadius(angle);
    float away = distance(cameraPosition.xz, p);

    // Depth cue: deep near the viewer, paling towards the horizon, dissolving into the sky's haze.
    vec3 colour = mix(uNear, uMid, smoothstep(14.0, 42.0, away));
    colour = mix(colour, uFar, smoothstep(40.0, 110.0, away));
    colour = mix(colour, uHaze, smoothstep(95.0, 190.0, away));

    // Shallows: a bright ring that fades out to sea.
    colour = mix(uShallow, colour, smoothstep(-0.2, 4.2, offshore));

    // A soft shadow of the island on the water, on the side away from the sun.
    float shade = smoothstep(4.5, 0.0, length(p - vec2(2.2, 1.2)) - 6.4) * step(0.0, offshore);
    colour *= 1.0 - 0.14 * shade;

    // Foam: one line that breathes in and out against the sand, and a faint one further out.
    float wobble = 0.14 * sin(angle * 9.0 + uTime * 0.7) + 0.1 * sin(uTime * 0.45);
    float foam = smoothstep(0.36, 0.04, abs(offshore - 0.18 - wobble));
    float outer = smoothstep(0.22, 0.0, abs(offshore - 1.2 - wobble * 1.6)) * 0.16;
    colour = mix(colour, uFoam, clamp(foam * 0.88 + outer, 0.0, 1.0));

    // Wave marks: short, sparse curved strokes that drift slowly, thinning out with distance.
    float wave = sin(p.y * 1.7 + sin(p.x * 0.55 + uTime * 0.35) * 1.1 + uTime * 0.3);
    float patches = sin(p.x * 0.31 + 1.7) * sin(p.y * 0.23 - uTime * 0.05 + 0.6);
    float marks = smoothstep(0.975, 1.0, wave) * smoothstep(0.62, 0.9, patches);
    marks *= 1.0 - smoothstep(18.0, 70.0, away);
    colour = mix(colour, uFoam, marks * 0.5 * step(2.2, offshore));

    gl_FragColor = vec4(colour, 1.0);
    #include <colorspace_fragment>
  }
`;

export function Water({ clock }: { clock: { current: number } }) {
  const material = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uNear: { value: new Color('#2f93b8') },
      uMid: { value: new Color('#45b9c7') },
      uFar: { value: new Color('#9adcd8') },
      uShallow: { value: new Color('#8fe3d6') },
      uHaze: { value: new Color('#dff1e6') },
      uFoam: { value: new Color('#ffffff') },
    }),
    [],
  );

  useFrame(() => {
    const uTime = material.current?.uniforms.uTime;
    if (uTime) uTime.value = clock.current;
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0}>
      <planeGeometry args={[520, 520, 1, 1]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
