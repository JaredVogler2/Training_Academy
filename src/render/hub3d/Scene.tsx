import { useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { setHubDiagnostics } from '@/app/diagnostics';
import { TIERS, type Tier } from '../quality';
import { CameraRig } from './CameraRig';
import {
  Birds,
  Boat,
  Clouds,
  FarIslets,
  Flowers,
  Pier,
  Rocks,
  Schoolhouse,
  Tower,
  Trees,
} from './Props';
import { Sky } from './Sky';
import { Water } from './Water';
import { buildIslandGeometry } from './island';

const SAMPLE_FRAMES = 90;

/**
 * Reports when the first frames have really been drawn, and keeps a rolling record of how the scene is running:
 * frame rate, the 95th-percentile frame time, draw calls and triangles. On the device only (see diagnostics.ts).
 */
function FrameProbe({ onReady }: { onReady: () => void }) {
  const gl = useThree((state) => state.gl);
  const drawn = useRef(0);
  const samples = useRef<number[]>([]);

  useFrame((_, delta) => {
    drawn.current += 1;
    // The second frame: shaders are compiled and the first image is on the canvas.
    if (drawn.current === 2) onReady();
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
      pixelRatio: Math.round(gl.getPixelRatio() * 100) / 100,
    });
    samples.current = [];
  });
  return null;
}

export function Scene({
  tier,
  reducedMotion,
  focusArea,
  onReady,
}: {
  tier: Tier;
  reducedMotion: boolean;
  focusArea: RefObject<HTMLElement | null>;
  onReady: () => void;
}) {
  const settings = TIERS[tier];
  /** Seconds of animation time. It only advances while motion is allowed. */
  const clock = useRef(0);
  const island = useMemo(() => buildIslandGeometry(), []);
  // Low in the morning sky, a little left of straight ahead; the camera rig moves it to suit the screen.
  const sun = useMemo(() => new Vector3(-0.2, 0.075, -0.98).normalize(), []);

  useFrame((_, delta) => {
    // A long gap (the tab was hidden) must not make everything jump.
    if (!reducedMotion) clock.current += Math.min(delta, 0.1);
  });

  return (
    <>
      <Sky sun={sun} />
      {/* Warm sun from the upper left, cool sky fill from above, soft green bounce from the ground. */}
      <hemisphereLight args={['#eaf5ff', '#cfe6bd', 1.95]} />
      <directionalLight
        position={[-10, 15, 9]}
        intensity={1.85}
        color="#fff2d2"
        castShadow={settings.shadows}
        shadow-mapSize={[settings.shadowMapSize || 512, settings.shadowMapSize || 512]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.05}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={13}
        shadow-camera-bottom={-13}
        shadow-camera-near={1}
        shadow-camera-far={50}
      />

      <Water clock={clock} />
      <mesh geometry={island} receiveShadow>
        <meshLambertMaterial vertexColors />
      </mesh>
      <Tower clock={clock} />
      <Schoolhouse />
      <Trees />
      <Rocks />
      <Flowers detail={settings.detail} />
      <Pier />
      <Boat clock={clock} />
      <Clouds clock={clock} />
      <FarIslets />
      {settings.detail >= 0.8 && <Birds clock={clock} />}

      <CameraRig focusArea={focusArea} clock={clock} sun={sun} />
      <FrameProbe onReady={onReady} />
    </>
  );
}
