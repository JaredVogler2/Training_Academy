import { useState } from 'react';
import { PerformanceMonitor } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { setHubDiagnostics } from '@/app/diagnostics';
import type { Frame, PlaceId } from '../archipelago';
import { TIERS, effectivePixelRatio, type Tier } from '../quality';
import { Scene } from './Scene';
import { installThreeConsole } from './threeConsole';

installThreeConsole();

export interface Hub3DProps {
  tier: Tier;
  /** When true the tier was picked automatically, so the pixel ratio may step down if the device struggles. */
  adaptive: boolean;
  reducedMotion: boolean;
  /** Where everything is for this screen: shared with the tappable areas and the picture fallback. */
  frame: Frame;
  /** The island whose tap area is being pointed at or has focus. */
  lifted: PlaceId | null;
  /** Called once real frames are on the canvas. */
  onReady: () => void;
  onContextLost: () => void;
}

const MIN_PIXEL_RATIO = 0.75;

/**
 * The archipelago in real-time 3D. This file and everything it imports (three.js, React Three Fiber, Drei) live in
 * their own chunk, fetched after the shell is on screen and only on devices that can use it.
 */
export default function Hub3D({
  tier,
  adaptive,
  reducedMotion,
  frame,
  lifted,
  onReady,
  onContextLost,
}: Hub3DProps) {
  const settings = TIERS[tier];
  const ceiling = effectivePixelRatio(window.devicePixelRatio, tier);
  const [pixelRatio, setPixelRatio] = useState(ceiling);

  return (
    <Canvas
      orthographic
      // Flat, matte colours straight from the palette: no filmic tone curve.
      flat
      // PCF: three.js filters it softly by default. (`true` would ask for a mode three.js has removed.)
      shadows={settings.shadows ? 'percentage' : false}
      dpr={pixelRatio}
      // Reduced motion: nothing moves, so nothing needs redrawing. Frames are drawn only when something changes.
      frameloop={reducedMotion ? 'demand' : 'always'}
      gl={{
        antialias: settings.antialias,
        alpha: false,
        stencil: false,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        // Shadows are drawn when the scene asks (Harbour.tsx), not on every frame.
        gl.shadowMap.autoUpdate = false;
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          onContextLost();
        });
        const context = gl.getContext();
        const info = context.getExtension('WEBGL_debug_renderer_info');
        const renderer: unknown = context.getParameter(
          info ? info.UNMASKED_RENDERER_WEBGL : context.RENDERER,
        );
        setHubDiagnostics({
          renderer: typeof renderer === 'string' ? renderer : null,
          pixelRatio: gl.getPixelRatio(),
        });
      }}
      aria-hidden="true"
    >
      {adaptive && !reducedMotion && (
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setPixelRatio((ratio) => Math.max(MIN_PIXEL_RATIO, ratio - 0.25))}
          onIncline={() => setPixelRatio((ratio) => Math.min(ceiling, ratio + 0.25))}
          onFallback={() => setPixelRatio(Math.min(ceiling, 1))}
        />
      )}
      <Scene
        tier={tier}
        reducedMotion={reducedMotion}
        frame={frame}
        lifted={lifted}
        onReady={onReady}
      />
    </Canvas>
  );
}
