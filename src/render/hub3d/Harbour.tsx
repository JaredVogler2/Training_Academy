import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { ReactNode } from 'react';
import type { Mesh, MeshLambertMaterial } from 'three';
import { setHubDiagnostics } from '@/app/diagnostics';
import { aloft, type Extras, type PlaceId } from '../archipelago';
import { TIERS, type Tier } from '../quality';
import { Sea, type Isle, type SeaLook } from './Sea';
import { ISLAND_BUILDERS, disposeIsland, type IslandModel } from './islands';
import { BOAT_PAINTS, ROCK_SHORE, boatShape, cloudShape, rocksShape } from './floating';
import { createPaintMaterial, createPaintUniforms, MAX_CLOUDS } from './paint';
import { Island, Lights, SHADOW_ON_WATER } from './stage';

/**
 * Everything in the harbour: the islands, the water, the light, and what floats and drifts between them.
 * The hub's scene and the studio both put this on stage; they differ only in where the camera stands.
 */

export interface Placed {
  id: PlaceId;
  x: number;
  z: number;
}

const SAMPLE_FRAMES = 90;
const NO_ISLES: readonly Isle[] = [];

/**
 * Reports when the first frames have really been drawn, and keeps a rolling record of how the scene is running:
 * frame rate, the 95th-percentile frame time, and what the renderer is holding. On the device only.
 */
function FrameProbe({ onReady }: { onReady: () => void }) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const drawn = useRef(0);
  const samples = useRef<number[]>([]);

  useFrame((_, delta) => {
    drawn.current += 1;
    // The second frame: shaders are compiled and the first image is on the canvas.
    if (drawn.current === 2) {
      onReady();
      setHubDiagnostics({
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length ?? null,
        pixelRatio: Math.round(gl.getPixelRatio() * 100) / 100,
      });
    }
    // When frames are drawn only on demand, ask for the second one.
    if (drawn.current < 2) invalidate();
    if (drawn.current <= 2) return;

    samples.current.push(delta * 1000);
    if (samples.current.length < SAMPLE_FRAMES) return;
    const sorted = samples.current.sort((a, b) => a - b);
    const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
    setHubDiagnostics({
      frames: {
        fps: Math.round(1000 / mean),
        p95Ms: Math.round((sorted[Math.floor(sorted.length * 0.95)] ?? mean) * 10) / 10,
        samples: sorted.length,
      },
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
      programs: gl.info.programs?.length ?? null,
      pixelRatio: Math.round(gl.getPixelRatio() * 100) / 100,
    });
    samples.current = [];
  });
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Things that float and drift
// ---------------------------------------------------------------------------------------------------------------------

/** How far a boat wanders from its spot, across and towards the viewer. */
const BOAT_ROAM: readonly [number, number] = [0.8, 0.42];
const BOAT_PACE = 0.085;

/** Where boat `index` is at `time`, and which way it points. */
function boatAt(spot: { x: number; z: number }, index: number, time: number) {
  const turn = time * BOAT_PACE * (index % 2 === 0 ? 1 : -1) + index * 2.3;
  return {
    x: spot.x + Math.cos(turn) * BOAT_ROAM[0],
    z: spot.z + Math.sin(turn) * BOAT_ROAM[1],
    heading: -Math.atan2(
      Math.cos(turn) * BOAT_ROAM[1] * (index % 2 === 0 ? 1 : -1),
      -Math.sin(turn) * BOAT_ROAM[0] * (index % 2 === 0 ? 1 : -1),
    ),
  };
}

export function Harbour({
  placed,
  extras,
  tier,
  still,
  lifted,
  look,
  sprite = false,
  bare = false,
  moreIsles = NO_ISLES,
  onReady,
  children,
}: {
  placed: readonly Placed[];
  extras: Extras | null;
  tier: Tier;
  /** Motion is reduced: the clock does not run. */
  still: boolean;
  lifted: PlaceId | null;
  look: SeaLook;
  /** For rendering the fallback pictures: see Sea. */
  sprite?: boolean;
  /** No water at all: for rendering pictures of things that drift above it. */
  bare?: boolean;
  /** Anything else the water should draw a shore around. */
  moreIsles?: readonly Isle[];
  onReady?: () => void;
  /** Anything else to put on stage, painted with the same material. */
  children?: (material: MeshLambertMaterial) => ReactNode;
}) {
  const settings = TIERS[tier];
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  /** Seconds of animation time. It only advances while motion is allowed. */
  const clock = useRef(0);
  const uniforms = useMemo(() => createPaintUniforms(), []);
  const material = useMemo(() => createPaintMaterial(uniforms), [uniforms]);

  // Models are built once for a set of places and a level of detail, not every time the layout moves them.
  const ids = placed.map((place) => place.id).join(' ');
  const models = useMemo(() => {
    const built = new Map<PlaceId, IslandModel>();
    for (const id of ids.split(' ').filter(Boolean) as PlaceId[]) {
      built.set(id, ISLAND_BUILDERS[id](settings.detail));
    }
    return built;
  }, [ids, settings.detail]);
  useEffect(
    () => () => {
      for (const model of models.values()) disposeIsland(model);
    },
    [models],
  );

  const boats = useMemo(() => (extras ? extras.boats : []), [extras]);
  const rocks = useMemo(() => (extras ? extras.rocks : []), [extras]);
  const clouds = useMemo(
    () => (extras && settings.detail >= 0.5 ? extras.clouds.slice(0, MAX_CLOUDS) : []),
    [extras, settings.detail],
  );
  const boatShapes = useMemo(() => BOAT_PAINTS.map((_, variant) => boatShape(variant)), []);
  const cloud = useMemo(() => cloudShape(), []);
  const rockShape = useMemo(() => rocksShape(rocks), [rocks]);
  useEffect(
    () => () => {
      for (const shape of boatShapes) shape.dispose();
      cloud.dispose();
    },
    [boatShapes, cloud],
  );
  useEffect(() => () => rockShape?.dispose(), [rockShape]);
  useEffect(
    () => () => {
      material.dispose();
      uniforms.uPaint.value.dispose();
    },
    [material, uniforms],
  );

  // What the water has to draw a shore around: the islands, the rocks, and the boats wherever they are now.
  const isles = useRef<Isle[]>([]);
  const fixedIsles = useMemo(() => {
    const list: Isle[] = [];
    for (const place of placed) {
      const model = models.get(place.id);
      if (!model) continue;
      list.push({
        x: place.x,
        z: place.z,
        radius: model.radius,
        seed: model.shore.seed,
        wander: model.shore.wander,
        height: model.height,
      });
    }
    for (const rock of rocks) {
      list.push({
        x: rock.x + ROCK_SHORE.dx,
        z: rock.z + ROCK_SHORE.dz,
        radius: ROCK_SHORE.radius,
        seed: 1,
        wander: ROCK_SHORE.wander,
        height: ROCK_SHORE.height,
      });
    }
    list.push(...moreIsles);
    return list;
  }, [placed, models, rocks, moreIsles]);

  const boatParts = useRef<(Mesh | null)[]>([]);
  const cloudParts = useRef<(Mesh | null)[]>([]);

  // The sun does not move and nor do the islands, so their shadows are drawn once and kept.
  useEffect(() => {
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, invalidate, fixedIsles, models, lifted, settings.shadows]);

  useEffect(() => {
    uniforms.uHazeRange.value = [look.haze[0], look.haze[1], look.haze[2]];
    invalidate();
  }, [uniforms, look, invalidate]);

  useFrame((_, delta) => {
    // A long gap (the tab was hidden) must not make everything jump.
    if (!still) clock.current += Math.min(delta, 0.1);
    const time = clock.current;
    uniforms.uTime.value = time;

    const list = fixedIsles.slice();
    for (const [index, spot] of boats.entries()) {
      const at = boatAt(spot, index, time);
      const part = boatParts.current[index];
      if (part) {
        part.position.set(at.x, Math.sin(time * 1.3 + index) * 0.025, at.z);
        part.rotation.set(Math.sin(time * 1.1 + index * 1.7) * 0.05, at.heading, 0);
      }
      list.push({
        x: at.x,
        z: at.z,
        radius: 0.3,
        seed: 0,
        wander: 0,
        height: 1.1,
        grounded: false,
      });
    }
    isles.current = list;

    for (let index = 0; index < MAX_CLOUDS; index++) {
      const over = clouds[index];
      const shadow = uniforms.uClouds.value[index];
      if (!over) {
        shadow?.set(0, 0, 0);
        continue;
      }
      const height = 4.2 + (index % 2) * 0.7;
      const drift = Math.sin(time * 0.05 + index * 2.1) * 1.1;
      const at = aloft({ x: over.x + drift, z: over.z }, height);
      const part = cloudParts.current[index];
      if (part) part.position.set(at.x, at.y + Math.sin(time * 0.4 + index) * 0.05, at.z);
      shadow?.set(
        at.x + height * SHADOW_ON_WATER[0],
        at.z + height * SHADOW_ON_WATER[1],
        1.25 + (index % 3) * 0.2,
      );
    }
  });

  const centre = useMemo(() => {
    let left = Infinity;
    let right = -Infinity;
    let far = Infinity;
    let near = -Infinity;
    for (const isle of fixedIsles) {
      left = Math.min(left, isle.x - isle.radius - 1.4);
      right = Math.max(right, isle.x + isle.radius + 1.4);
      far = Math.min(far, isle.z - isle.radius - 1.4);
      near = Math.max(near, isle.z + isle.radius + 1.4);
    }
    if (!Number.isFinite(left)) return { at: [0, 0] as const, reach: 6 };
    return {
      at: [(left + right) / 2, (far + near) / 2] as const,
      reach: Math.max(right - left, near - far) / 2 + 1,
    };
  }, [fixedIsles]);

  return (
    <>
      <Lights
        shadows={settings.shadows}
        shadowMapSize={settings.shadowMapSize}
        centre={centre.at}
        reach={centre.reach}
      />
      {!bare && (
        <Sea
          isles={isles}
          paint={uniforms.uPaint.value}
          clock={clock}
          shadow={SHADOW_ON_WATER}
          look={look}
          clouds={uniforms.uClouds.value}
          sprite={sprite}
        />
      )}
      {placed.map((place) => {
        const model = models.get(place.id);
        return model ? (
          <Island
            key={place.id}
            model={model}
            material={material}
            position={[place.x, 0, place.z]}
            clock={clock}
            shadows={settings.shadows}
            lifted={lifted === place.id}
            still={still}
          />
        ) : null;
      })}
      {rockShape && (
        <mesh
          geometry={rockShape}
          material={material}
          castShadow={settings.shadows}
          receiveShadow={settings.shadows}
        />
      )}
      {boats.map((spot, index) => (
        <mesh
          key={index}
          ref={(part) => {
            boatParts.current[index] = part;
          }}
          geometry={boatShapes[index % boatShapes.length]}
          material={material}
          position={[spot.x, 0, spot.z]}
        />
      ))}
      {clouds.map((_, index) => (
        <mesh
          key={index}
          ref={(part) => {
            cloudParts.current[index] = part;
          }}
          geometry={cloud}
          material={material}
          scale={0.92 + (index % 3) * 0.14}
        />
      ))}
      {children?.(material)}
      {onReady && <FrameProbe onReady={onReady} />}
    </>
  );
}
