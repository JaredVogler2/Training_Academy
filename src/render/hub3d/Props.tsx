import { useMemo, useRef } from 'react';
import { Instance, Instances } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Shape,
  type Group,
  type Mesh,
} from 'three';
import { createRng } from '@/engine';
import { heightAt, shoreRadius } from './island';

/**
 * Everything that stands on or around Academy Isle. All of it is built from a few primitive shapes and flat matte
 * colours (no textures, no downloaded models), placed by the same height function as the ground.
 *
 * Every animated thing reads one shared clock, which simply stops when motion is reduced.
 */

export interface Clock {
  current: number;
}

const CREAM = '#fffaf0';
const CORAL = '#ff8f7a';
const CORAL_DEEP = '#c94f3b';
const WOOD = '#8a5f3f';

function ground(x: number, z: number): number {
  return heightAt(x, z);
}

// ---------------------------------------------------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------------------------------------------------

/** A triangular prism with its ridge along x: a gable roof. */
function useGableGeometry(width: number, height: number, depth: number): BufferGeometry {
  return useMemo(() => {
    const w = width / 2;
    const d = depth / 2;
    // prettier-ignore
    const corners = {
      fl: [-w, 0, d], fr: [w, 0, d], bl: [-w, 0, -d], br: [w, 0, -d], rl: [-w, height, 0], rr: [w, height, 0],
    } as const;
    const { fl, fr, bl, br, rl, rr } = corners;
    const triangles = [fl, fr, rr, fl, rr, rl, br, bl, rl, br, rl, rr, bl, fl, rl, fr, br, rr];
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(triangles.flat()), 3));
    geometry.computeVertexNormals();
    return geometry;
  }, [width, height, depth]);
}

const TOWER_BANDS = [
  { height: 0.95, colour: CREAM },
  { height: 0.7, colour: CORAL },
  { height: 0.95, colour: CREAM },
  { height: 0.7, colour: CORAL },
  { height: 0.9, colour: CREAM },
] as const;
const TOWER_HEIGHT = TOWER_BANDS.reduce((sum, band) => sum + band.height, 0);
const TOWER_BASE = 0.88;
const TOWER_TOP = 0.56;
const towerRadius = (y: number) => TOWER_BASE + (TOWER_TOP - TOWER_BASE) * (y / TOWER_HEIGHT);

/** The academy: a striped lighthouse with a lit lantern room and a flag. */
export function Tower({ clock }: { clock: Clock }) {
  const flag = useRef<Mesh>(null);

  useFrame(() => {
    const mesh = flag.current;
    if (!mesh) return;
    const positions = mesh.geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index);
      // The free end waves more than the end on the pole.
      positions.setZ(index, Math.sin(x * 5 - clock.current * 4.2) * 0.07 * (x + 0.36) * 2.4);
    }
    positions.needsUpdate = true;
  });

  let base = 0;
  return (
    <group position={[0, ground(0, 0) - 0.08, 0]}>
      {TOWER_BANDS.map((band, index) => {
        const bottom = base;
        base += band.height;
        return (
          <mesh key={index} position-y={bottom + band.height / 2} castShadow receiveShadow>
            <cylinderGeometry
              args={[towerRadius(bottom + band.height), towerRadius(bottom), band.height, 28]}
            />
            <meshLambertMaterial color={band.colour} />
          </mesh>
        );
      })}
      <mesh position-y={TOWER_HEIGHT + 0.08} castShadow>
        <cylinderGeometry args={[0.78, 0.74, 0.16, 28]} />
        <meshLambertMaterial color={CORAL_DEEP} />
      </mesh>
      <mesh position-y={TOWER_HEIGHT + 0.46}>
        <cylinderGeometry args={[0.42, 0.42, 0.6, 20]} />
        <meshLambertMaterial color="#fff1b8" emissive="#ffd36b" emissiveIntensity={0.75} />
      </mesh>
      <mesh position-y={TOWER_HEIGHT + 0.8}>
        <cylinderGeometry args={[0.52, 0.52, 0.08, 20]} />
        <meshLambertMaterial color={CORAL_DEEP} />
      </mesh>
      <mesh position-y={TOWER_HEIGHT + 1.22} castShadow>
        <coneGeometry args={[0.64, 0.78, 28]} />
        <meshLambertMaterial color={CORAL_DEEP} />
      </mesh>
      <mesh position-y={TOWER_HEIGHT + 1.95}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
        <meshLambertMaterial color={WOOD} />
      </mesh>
      <mesh ref={flag} position={[0.38, TOWER_HEIGHT + 2.18, 0]}>
        <planeGeometry args={[0.72, 0.36, 8, 1]} />
        <meshBasicMaterial color="#ffd35c" side={DoubleSide} />
      </mesh>
      {/* Door and window face the viewer. */}
      <mesh position={[0, 0.42, towerRadius(0.42) - 0.02]}>
        <boxGeometry args={[0.4, 0.74, 0.12]} />
        <meshLambertMaterial color={WOOD} />
      </mesh>
      <mesh position={[0, 2.25, towerRadius(2.25) + 0.012]}>
        <circleGeometry args={[0.17, 20]} />
        <meshLambertMaterial color="#8fd3f4" emissive="#8fd3f4" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

export function Schoolhouse() {
  const roof = useGableGeometry(1.86, 0.62, 1.44);
  const x = -2.05;
  const z = 0.75;
  return (
    <group position={[x, ground(x, z) - 0.12, z]} rotation-y={0.22}>
      <mesh position-y={0.52} castShadow receiveShadow>
        <boxGeometry args={[1.6, 1.04, 1.16]} />
        <meshLambertMaterial color="#ffe9c7" />
      </mesh>
      <mesh geometry={roof} position-y={1.04} castShadow>
        <meshLambertMaterial color={CORAL} />
      </mesh>
      <mesh position={[0.32, 0.36, 0.59]}>
        <boxGeometry args={[0.3, 0.62, 0.06]} />
        <meshLambertMaterial color={WOOD} />
      </mesh>
      <mesh position={[-0.36, 0.6, 0.59]}>
        <boxGeometry args={[0.34, 0.34, 0.06]} />
        <meshLambertMaterial color="#ffd35c" emissive="#ffc94a" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Plants and stones
// ---------------------------------------------------------------------------------------------------------------------

const TREES = [
  { x: -4.5, z: 2.3, s: 1.0, tone: 0 },
  { x: -3.0, z: -0.2, s: 0.82, tone: 1 },
  { x: 2.2, z: 1.9, s: 0.72, tone: 2 },
  { x: 3.3, z: 0.3, s: 0.95, tone: 1 },
  { x: 4.6, z: 1.7, s: 1.08, tone: 0 },
  { x: -4.9, z: 0.4, s: 0.9, tone: 2 },
  { x: 1.6, z: -2.4, s: 0.95, tone: 0 },
  { x: -1.2, z: -2.7, s: 1.0, tone: 1 },
  { x: 4.3, z: -1.6, s: 0.88, tone: 2 },
] as const;
const CANOPY = ['#3f9f54', '#4aa85a', '#369a5c'] as const;
const CANOPY_LIGHT = ['#74cf70', '#84d97c', '#6fd08c'] as const;

const PINES = [
  { x: -5.9, z: 1.2, s: 1.0 },
  { x: 5.8, z: 2.2, s: 0.9 },
  { x: -3.4, z: -2.9, s: 1.1 },
  { x: 3.0, z: -3.1, s: 1.0 },
] as const;
const PINE_TIERS = [
  { radius: 0.7, height: 0.95, y: 0.8, colour: '#2f8f5b' },
  { radius: 0.56, height: 0.85, y: 1.32, colour: '#3aa068' },
  { radius: 0.4, height: 0.75, y: 1.8, colour: '#4bb277' },
] as const;

const BUSHES = [
  { x: -2.6, z: 3.1, s: 0.42 },
  { x: 1.3, z: 3.4, s: 0.36 },
  { x: -0.4, z: 2.4, s: 0.3 },
  { x: 3.9, z: 3.2, s: 0.34 },
] as const;

export function Trees() {
  return (
    <>
      <Instances limit={TREES.length + PINES.length} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 1, 8]} />
        <meshLambertMaterial color={WOOD} />
        {TREES.map((tree) => (
          <Instance
            key={`trunk-${tree.x}`}
            position={[tree.x, ground(tree.x, tree.z) + 0.45 * tree.s, tree.z]}
            scale={[tree.s, tree.s, tree.s]}
          />
        ))}
        {PINES.map((pine) => (
          <Instance
            key={`pine-trunk-${pine.x}`}
            position={[pine.x, ground(pine.x, pine.z) + 0.25 * pine.s, pine.z]}
            scale={[pine.s * 0.9, pine.s * 0.6, pine.s * 0.9]}
          />
        ))}
      </Instances>

      {/* Canopies, with a lighter cap on the sunny side, and the bushes: one draw call. */}
      <Instances limit={TREES.length * 2 + BUSHES.length} castShadow receiveShadow>
        <sphereGeometry args={[1, 22, 16]} />
        <meshLambertMaterial />
        {TREES.map((tree) => {
          const y = ground(tree.x, tree.z) + 1.3 * tree.s;
          return (
            <group key={`canopy-${tree.x}`}>
              <Instance
                position={[tree.x, y, tree.z]}
                scale={[tree.s * 0.98, tree.s * 0.9, tree.s * 0.98]}
                color={CANOPY[tree.tone]}
              />
              <Instance
                position={[tree.x - 0.26 * tree.s, y + 0.3 * tree.s, tree.z + 0.3 * tree.s]}
                scale={tree.s * 0.62}
                color={CANOPY_LIGHT[tree.tone]}
              />
            </group>
          );
        })}
        {BUSHES.map((bush) => (
          <Instance
            key={`bush-${bush.x}`}
            position={[bush.x, ground(bush.x, bush.z) + bush.s * 0.45, bush.z]}
            scale={[bush.s * 1.5, bush.s, bush.s * 1.2]}
            color="#4aa85a"
          />
        ))}
      </Instances>

      {PINE_TIERS.map((tier) => (
        <Instances key={tier.y} limit={PINES.length} castShadow>
          <coneGeometry args={[tier.radius, tier.height, 14]} />
          <meshLambertMaterial color={tier.colour} />
          {PINES.map((pine) => (
            <Instance
              key={pine.x}
              position={[pine.x, ground(pine.x, pine.z) + tier.y * pine.s, pine.z]}
              scale={pine.s}
            />
          ))}
        </Instances>
      ))}
    </>
  );
}

const FLOWER_COLOURS = ['#ffffff', '#ffd35c', '#ff8f7a', '#ff9fc2'] as const;

export function Flowers({ detail }: { detail: number }) {
  const flowers = useMemo(() => {
    const rng = createRng(20261122);
    const placed: { x: number; y: number; z: number; colour: string }[] = [];
    const wanted = Math.round(90 * detail);
    for (let tries = 0; placed.length < wanted && tries < 2000; tries++) {
      const angle = rng.next() * Math.PI * 2;
      const radius = (0.18 + rng.next() * 0.6) * shoreRadius(angle);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = heightAt(x, z);
      // On grass, clear of the buildings.
      if (y < 0.6 || Math.hypot(x, z) < 1.4 || Math.hypot(x + 2.05, z - 0.75) < 1.3) continue;
      placed.push({
        x,
        y: y + 0.05,
        z,
        colour: FLOWER_COLOURS[rng.int(FLOWER_COLOURS.length)] ?? '#fff',
      });
    }
    return placed;
  }, [detail]);

  return (
    <Instances limit={flowers.length || 1}>
      <sphereGeometry args={[0.075, 8, 6]} />
      <meshLambertMaterial />
      {flowers.map((flower, index) => (
        <Instance key={index} position={[flower.x, flower.y, flower.z]} color={flower.colour} />
      ))}
    </Instances>
  );
}

const ROCKS = [
  { angle: 2.55, out: 0.96, scale: [0.62, 0.4, 0.5], colour: '#b9c3d6' },
  { angle: 2.75, out: 1.0, scale: [0.36, 0.26, 0.32], colour: '#aab6cc' },
  { angle: 0.95, out: 0.98, scale: [0.5, 0.34, 0.44], colour: '#aab6cc' },
  { angle: -0.5, out: 0.99, scale: [0.44, 0.3, 0.4], colour: '#b9c3d6' },
  { angle: 4.2, out: 0.97, scale: [0.56, 0.36, 0.46], colour: '#b9c3d6' },
] as const;

export function Rocks() {
  return (
    <>
      {ROCKS.map((rock) => {
        const radius = shoreRadius(rock.angle) * rock.out;
        const x = Math.cos(rock.angle) * radius;
        const z = Math.sin(rock.angle) * radius;
        return (
          <mesh
            key={rock.angle}
            position={[x, Math.max(heightAt(x, z), 0) + 0.08, z]}
            scale={[...rock.scale]}
            rotation={[0.3, rock.angle, 0.2]}
            castShadow
          >
            <icosahedronGeometry args={[1, 1]} />
            <meshLambertMaterial color={rock.colour} flatShading />
          </mesh>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Harbour
// ---------------------------------------------------------------------------------------------------------------------

const PIER_START = [5.5, 2.95] as const;
const PIER_END = [9.3, 4.75] as const;

export function Pier() {
  const dx = PIER_END[0] - PIER_START[0];
  const dz = PIER_END[1] - PIER_START[1];
  const length = Math.hypot(dx, dz);
  const posts = [0.3, 0.55, 0.8, 0.98];
  return (
    <group
      position={[(PIER_START[0] + PIER_END[0]) / 2, 0.36, (PIER_START[1] + PIER_END[1]) / 2]}
      rotation-y={-Math.atan2(dz, dx)}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[length, 0.12, 0.84]} />
        <meshLambertMaterial color="#c9995f" />
      </mesh>
      {posts.flatMap((t) =>
        [-0.36, 0.36].map((side) => (
          <mesh key={`${t}-${side}`} position={[(t - 0.5) * length, -0.3, side]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.9, 8]} />
            <meshLambertMaterial color={WOOD} />
          </mesh>
        )),
      )}
    </group>
  );
}

function useTriangle(points: readonly (readonly [number, number])[]): BufferGeometry {
  return useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(points.flatMap(([x, y]) => [x, y, 0])), 3),
    );
    geometry.computeVertexNormals();
    return geometry;
  }, [points]);
}

const MAIN_SAIL = [
  [0.14, 0.52],
  [1.0, 0.52],
  [0.14, 2.15],
] as const;
const JIB = [
  [-0.06, 0.56],
  [-0.06, 1.85],
  [-0.8, 0.56],
] as const;
const PENNANT = [
  [0.04, 2.18],
  [0.34, 2.28],
  [0.04, 2.38],
] as const;

export function Boat({ clock }: { clock: Clock }) {
  const boat = useRef<Group>(null);
  const hull = useMemo(() => {
    const profile = new Shape();
    profile.moveTo(-0.98, 0.4);
    profile.lineTo(1.02, 0.4);
    profile.quadraticCurveTo(0.9, 0.02, 0.62, 0);
    profile.lineTo(-0.6, 0);
    profile.quadraticCurveTo(-0.9, 0.04, -0.98, 0.4);
    const geometry = new ExtrudeGeometry(profile, {
      depth: 0.5,
      bevelEnabled: true,
      bevelSize: 0.07,
      bevelThickness: 0.07,
      bevelSegments: 3,
      curveSegments: 10,
    });
    geometry.translate(0, 0, -0.25);
    return geometry;
  }, []);
  const mainSail = useTriangle(MAIN_SAIL);
  const jib = useTriangle(JIB);
  const pennant = useTriangle(PENNANT);

  useFrame(() => {
    const group = boat.current;
    if (!group) return;
    const t = clock.current;
    group.position.y = -0.1 + Math.sin(t * 1.15) * 0.05;
    group.rotation.z = Math.sin(t * 0.9) * 0.05;
    group.rotation.x = Math.cos(t * 0.7) * 0.03;
  });

  return (
    <group position={[9.2, 0, 6.5]} rotation-y={0.42}>
      <group ref={boat} position-y={-0.1}>
        <mesh geometry={hull} castShadow>
          <meshLambertMaterial color="#e8734f" />
        </mesh>
        <mesh position={[0.02, 0.43, 0]}>
          <boxGeometry args={[1.96, 0.07, 0.6]} />
          <meshLambertMaterial color="#fff3dc" />
        </mesh>
        <mesh position={[0.04, 1.3, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.04, 1.9, 8]} />
          <meshLambertMaterial color={WOOD} />
        </mesh>
        <mesh geometry={mainSail} castShadow>
          <meshLambertMaterial color="#ffffff" side={DoubleSide} />
        </mesh>
        <mesh geometry={jib} castShadow>
          <meshLambertMaterial color="#4fcfc4" side={DoubleSide} />
        </mesh>
        <mesh geometry={pennant}>
          <meshLambertMaterial color={CORAL} side={DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Sky life and the far archipelago
// ---------------------------------------------------------------------------------------------------------------------

const CLOUDS = [
  { position: [-30, 12.2, -66], scale: 3.3, phase: 0 },
  { position: [20, 13.6, -88], scale: 4.2, phase: 2.1 },
  { position: [50, 11.6, -60], scale: 3.0, phase: 4.2 },
  { position: [-62, 11.4, -52], scale: 3.2, phase: 1.3 },
  { position: [84, 13.2, -96], scale: 4.4, phase: 3.3 },
] as const;
const CLOUD_PUFFS = [
  { offset: [0, 0, 0], scale: [1, 1, 0.8] },
  { offset: [-1.15, -0.28, 0], scale: [0.72, 0.72, 0.6] },
  { offset: [1.2, -0.22, 0], scale: [0.8, 0.8, 0.66] },
  { offset: [0.1, -0.52, 0.05], scale: [2.0, 0.5, 0.8] },
] as const;

export function Clouds({ clock }: { clock: Clock }) {
  const group = useRef<Group>(null);
  useFrame(() => {
    group.current?.children.forEach((cloud, index) => {
      const spec = CLOUDS[index];
      if (spec)
        cloud.position.x = spec.position[0] + Math.sin(clock.current * 0.05 + spec.phase) * 4;
    });
  });
  return (
    <group ref={group}>
      {CLOUDS.map((cloud) => (
        <group key={cloud.phase} position={[...cloud.position]} scale={cloud.scale}>
          {CLOUD_PUFFS.map((puff, index) => (
            <mesh key={index} position={[...puff.offset]} scale={[...puff.scale]}>
              <sphereGeometry args={[1, 18, 12]} />
              <meshLambertMaterial color="#ffffff" emissive="#cfe3f2" emissiveIntensity={0.55} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

const ISLETS = [
  { position: [-44, -0.6, -62], scale: [15, 3.4, 9], colour: '#a3d9c6' },
  { position: [40, -0.5, -78], scale: [12, 2.8, 8], colour: '#b1e0d0' },
  { position: [-82, -0.6, -44], scale: [18, 3.8, 10], colour: '#b1e0d0' },
  { position: [78, -0.6, -56], scale: [16, 3.6, 10], colour: '#a3d9c6' },
  { position: [4, -0.5, -110], scale: [20, 3.0, 10], colour: '#bfe6d8' },
] as const;

/** Where the other worlds will be: pale shapes on the horizon. */
export function FarIslets() {
  return (
    <>
      {ISLETS.map((islet) => (
        <mesh key={islet.position[0]} position={[...islet.position]} scale={[...islet.scale]}>
          <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial color={islet.colour} />
        </mesh>
      ))}
    </>
  );
}

const WING = [
  [0, 0],
  [0.62, 0.16],
  [0.5, -0.08],
] as const;

function Bird({
  clock,
  radius,
  height,
  speed,
  phase,
}: {
  clock: Clock;
  radius: number;
  height: number;
  speed: number;
  phase: number;
}) {
  const bird = useRef<Group>(null);
  const left = useRef<Mesh>(null);
  const right = useRef<Mesh>(null);
  const wing = useTriangle(WING);

  useFrame(() => {
    const t = clock.current;
    const angle = phase + t * speed;
    const group = bird.current;
    if (group) {
      group.position.set(
        Math.cos(angle) * radius,
        height + Math.sin(t * 0.4 + phase) * 0.5,
        Math.sin(angle) * radius - 6,
      );
      group.rotation.y = -angle;
    }
    const flap = Math.sin(t * 6 + phase) * 0.55;
    if (left.current) left.current.rotation.z = flap;
    if (right.current) right.current.rotation.z = -flap;
  });

  return (
    <group ref={bird} scale={0.9}>
      <mesh ref={left} geometry={wing} rotation-x={-Math.PI / 2}>
        <meshBasicMaterial color="#4d5b7c" side={DoubleSide} />
      </mesh>
      <group rotation-y={Math.PI}>
        <mesh ref={right} geometry={wing} rotation-x={-Math.PI / 2}>
          <meshBasicMaterial color="#4d5b7c" side={DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

export function Birds({ clock }: { clock: Clock }) {
  return (
    <>
      <Bird clock={clock} radius={8.5} height={8.6} speed={0.22} phase={0.4} />
      <Bird clock={clock} radius={9.6} height={9.3} speed={0.22} phase={0.75} />
    </>
  );
}
