import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type {
  DirectionalLight,
  Group,
  MeshLambertMaterial,
  Object3D,
  OrthographicCamera,
} from 'three';
import { PITCH } from '../extents';
import type { IslandModel } from './islands';

/**
 * What every view of the archipelago shares: the camera's angle, the sun, and how an island is put on stage.
 *
 * The camera is orthographic and always looks from the same angle, a little above the horizon of a toy on a table.
 * That is what lets the picture fallback, the tappable areas and the 3D scene agree to the pixel: a point's place
 * on screen is a fixed sum of its coordinates (see archipelago.ts).
 */

/** The sun: from the upper left and a little in front, so the faces turned to the viewer are lit. */
export const SUN: readonly [number, number, number] = [-0.66, 0.68, 0.32];

/** On the water, where a shadow lands for each unit of height above it. */
export const SHADOW_ON_WATER: readonly [number, number] = [-SUN[0] / SUN[1], -SUN[2] / SUN[1]];

const DISTANCE = 60;

/** Aim the orthographic camera at `target` with `zoom` pixels to the world unit. */
export function OrthoRig({
  target,
  zoom,
}: {
  target: readonly [number, number, number];
  zoom: number;
}) {
  const camera = useThree((state) => state.camera) as OrthographicCamera;
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    camera.position.set(
      target[0],
      target[1] + Math.sin(PITCH) * DISTANCE,
      target[2] + Math.cos(PITCH) * DISTANCE,
    );
    camera.lookAt(target[0], target[1], target[2]);
    camera.zoom = zoom;
    camera.near = 1;
    camera.far = DISTANCE * 3;
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, target, zoom]);
  return null;
}

/**
 * Warm sun, cool sky, warm bounce from the ground. Shadows are never grey: what the sun does not reach is lit by
 * the sky, so it turns towards blue.
 */
export function Lights({
  shadows,
  shadowMapSize,
  centre,
  reach,
}: {
  shadows: boolean;
  shadowMapSize: number;
  /** Middle of what must be covered by the shadow map, on the water. */
  centre: readonly [number, number];
  /** Half the width of what must be covered. */
  reach: number;
}) {
  const sun = useRef<DirectionalLight>(null);
  useEffect(() => {
    const light = sun.current;
    if (!light) return;
    light.position.set(centre[0] + SUN[0] * 40, SUN[1] * 40, centre[1] + SUN[2] * 40);
    light.target.position.set(centre[0], 0, centre[1]);
    light.target.updateMatrixWorld();
    const view = light.shadow.camera;
    view.left = -reach;
    view.right = reach;
    view.top = reach;
    view.bottom = -reach;
    view.near = 1;
    view.far = 90;
    view.updateProjectionMatrix();
  }, [centre, reach]);

  return (
    <>
      <hemisphereLight args={['#dfe9ff', '#ffe3bd', 1.55]} />
      <directionalLight
        ref={sun}
        intensity={2.05}
        color="#fff1d6"
        castShadow={shadows}
        shadow-mapSize={[shadowMapSize || 512, shadowMapSize || 512]}
        shadow-bias={-0.0008}
        shadow-normalBias={0.03}
      />
    </>
  );
}

/**
 * One island on stage: its merged body, and its moving parts posed from the shared clock.
 * While its tap area is pointed at or focused, the island rises a little and swells, so a child can see what a tap
 * will choose before making it.
 */
export function Island({
  model,
  material,
  position,
  clock,
  shadows,
  lifted,
  still,
}: {
  model: IslandModel;
  material: MeshLambertMaterial;
  position: readonly [number, number, number];
  clock: { current: number };
  shadows: boolean;
  lifted: boolean;
  /** Motion is reduced: change state at once instead of easing into it. */
  still: boolean;
}) {
  const body = useRef<Group>(null);
  const movers = useRef<(Object3D | null)[]>([]);
  const lift = useRef(0);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidate();
  }, [invalidate, lifted, position]);

  useFrame((_, delta) => {
    for (const [index, mover] of model.movers.entries()) {
      const part = movers.current[index];
      if (part) mover.animate(clock.current, part);
    }
    const group = body.current;
    if (!group) return;
    const goal = lifted ? 1 : 0;
    if (lift.current !== goal) {
      const eased = lift.current + (goal - lift.current) * Math.min(1, delta * 12);
      lift.current = still || Math.abs(goal - eased) < 0.002 ? goal : eased;
      if (!still) invalidate();
    }
    group.position.set(position[0], position[1] + lift.current * 0.16, position[2]);
    group.scale.setScalar(1 + lift.current * 0.045);
  });

  return (
    <group ref={body} position={[position[0], position[1], position[2]]}>
      <mesh
        geometry={model.body}
        material={material}
        castShadow={shadows}
        receiveShadow={shadows}
      />
      {model.movers.map((mover, index) => (
        <mesh
          key={index}
          ref={(part) => {
            movers.current[index] = part;
          }}
          geometry={mover.geometry}
          material={material}
          position={[mover.at[0], mover.at[1], mover.at[2]]}
          castShadow={shadows}
        />
      ))}
    </group>
  );
}
