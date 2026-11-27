import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { OrthographicCamera } from 'three';
import { useReducedMotion } from '@/app/settings';
import { EXTENTS, PITCH, type PlaceId } from '../extents';
import { effectivePixelRatio, TIERS, type Tier } from '../quality';
import { Harbour } from './Harbour';
import type { SeaLook } from './Sea';
import { installThreeConsole } from './threeConsole';

installThreeConsole();

const LOOK: SeaLook = { depth: [-7, 7], haze: [0, 12, 0.24] };
const APPROACH_SECONDS = 1.15;

function Approach({
  place,
  still,
  onReady,
}: {
  place: PlaceId;
  still: boolean;
  onReady: () => void;
}) {
  const elapsed = useRef(0);
  const frames = useRef(0);
  const { radius, height } = EXTENTS[place];

  useFrame(({ camera, size, invalidate }, delta) => {
    const ortho = camera as OrthographicCamera;
    elapsed.current = still ? APPROACH_SECONDS : elapsed.current + Math.min(delta, 0.06);
    const progress = Math.min(1, elapsed.current / APPROACH_SECONDS);
    const remaining = (1 - progress) ** 3;
    const yaw = 0.05 - 0.25 * remaining;
    const pitch = PITCH + 0.07 - 0.18 * remaining;
    const across = Math.min(size.width / (radius * 2 + 1.4), size.height / (height + 0.9));
    const centreY = height * 0.34;
    const horizontal = Math.cos(pitch) * 30;
    ortho.position.set(
      Math.sin(yaw) * horizontal,
      centreY + Math.sin(pitch) * 30,
      Math.cos(yaw) * horizontal,
    );
    ortho.lookAt(0, centreY, 0);
    ortho.zoom = across * (1 - 0.18 * remaining);
    ortho.updateProjectionMatrix();

    frames.current += 1;
    if (frames.current === 2) onReady();
    if (frames.current < 2 || progress < 1) invalidate();
  });

  return null;
}

export interface IslandVista3DProps {
  place: PlaceId;
  tier: Tier;
  onReady: () => void;
  onContextLost: () => void;
}

/** A short approach to one island. Demand rendering leaves the camera at rest once it arrives. */
export default function IslandVista3D({ place, tier, onReady, onContextLost }: IslandVista3DProps) {
  const still = useReducedMotion();
  const placed = useMemo(() => [{ id: place, x: 0, z: 0 }], [place]);
  const settings = TIERS[tier];
  return (
    <Canvas
      orthographic
      flat
      frameloop="demand"
      shadows={settings.shadows ? 'percentage' : false}
      dpr={effectivePixelRatio(window.devicePixelRatio, tier)}
      gl={{ antialias: settings.antialias, alpha: false, stencil: false }}
      onCreated={({ gl }) => {
        gl.shadowMap.autoUpdate = false;
      }}
      ref={(canvas) => {
        if (!canvas) return;
        const lost = (event: Event) => {
          event.preventDefault();
          onContextLost();
        };
        canvas.addEventListener('webglcontextlost', lost);
        return () => canvas.removeEventListener('webglcontextlost', lost);
      }}
    >
      <Approach place={place} still={still} onReady={onReady} />
      <Harbour placed={placed} extras={null} tier={tier} still={still} lifted={null} look={LOOK} />
    </Canvas>
  );
}
