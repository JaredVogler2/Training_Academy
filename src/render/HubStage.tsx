import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { loadChunk } from '@/app/chunks';
import { mark, recordError, setHubDiagnostics } from '@/app/diagnostics';
import {
  GRAPHICS_OPTIONS,
  useReducedMotion,
  useSettings,
  type GraphicsOption,
} from '@/app/settings';
import type { Frame, PlaceId } from './archipelago';
import { HubPicture } from './HubPicture';
import { planHub, type HubPlan, type IllustratedReason } from './quality';
import { probeWebGl } from './webgl';
import styles from './HubStage.module.css';

// three.js, React Three Fiber and the scene: one chunk group, fetched after the shell is on screen.
const Hub3D = lazy(() => loadChunk('hub-3d', () => import('./hub3d/Hub3D')));

/** `?gfx=low|medium|high|pictures` overrides the graphics setting for one visit: for testing and for captures. */
function graphicsOverride(): GraphicsOption | null {
  const value = new URLSearchParams(window.location.search).get('gfx');
  return (GRAPHICS_OPTIONS as readonly string[]).includes(value ?? '')
    ? (value as GraphicsOption)
    : null;
}

function devicePlan(graphics: GraphicsOption): HubPlan {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  return planHub({
    graphics,
    webgl: graphics === 'pictures' ? { available: false, software: false } : probeWebGl(),
    saveData: nav.connection?.saveData === true,
    device: {
      coarsePointer: window.matchMedia('(pointer: coarse)').matches,
      memoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
      cores: typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
    },
  });
}

function whenIdle(run: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(run, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 200);
  return () => window.clearTimeout(id);
}

/**
 * The hub's picture. The archipelago is there as a picture from the first paint; when the device can do it, the
 * real-time 3D scene is fetched in the background and faded in over it, island for island in the same places. If 3D
 * is unavailable, switched off, fails to load, throws, or loses its graphics context, the picture is simply what
 * stays — the hub never shows an empty box.
 * (After a lost context the hub stays a picture until it is next opened, when 3D is tried afresh.)
 */
export function HubStage({ frame, lifted }: { frame: Frame | null; lifted: PlaceId | null }) {
  const settings = useSettings();
  const reducedMotion = useReducedMotion();
  const graphics = graphicsOverride() ?? settings.graphics;

  const [plan, setPlan] = useState<HubPlan>({ use3d: false, reason: 'loading', tier: null });
  const [idle, setIdle] = useState(false);
  const [ready, setReady] = useState(false);
  const [trouble, setTrouble] = useState<IllustratedReason | null>(null);

  useEffect(() => {
    const next = devicePlan(graphics);
    // Probing WebGL touches the DOM, so it happens after render, and its answer is state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlan(next);
    setReady(false);
    setTrouble(null);
  }, [graphics]);

  useEffect(() => whenIdle(() => setIdle(true)), []);

  const show3d = plan.use3d && idle && trouble === null;
  const mode = show3d && ready ? '3d' : plan.use3d && trouble === null ? 'pending' : 'illustrated';
  const reason = mode === 'illustrated' ? (trouble ?? plan.reason) : null;

  useEffect(() => {
    setHubDiagnostics({ mode, reason, tier: plan.tier });
    if (mode !== 'pending') mark(mode === '3d' ? 'hub-3d-shown' : 'hub-illustrated-shown');
  }, [mode, reason, plan.tier]);

  const onReady = useCallback(() => setReady(true), []);
  const onContextLost = useCallback(() => {
    setReady(false);
    setTrouble('context-lost');
    recordError('webgl', 'The graphics context was lost.');
  }, []);

  return (
    <div
      className={styles.stage}
      data-testid="hub-stage"
      data-hub-mode={mode}
      data-hub-reason={reason ?? undefined}
      data-hub-tier={plan.tier ?? undefined}
    >
      <div className={styles.picture} data-hidden={mode === '3d'}>
        {frame && <HubPicture frame={frame} lifted={lifted} still={reducedMotion} />}
      </div>
      {show3d && plan.tier && frame && (
        <div className={styles.canvas} data-ready={ready}>
          <ErrorBoundary
            fallback={(error) => {
              // Whatever went wrong in the 3D scene, the illustration underneath is still there.
              queueMicrotask(() => {
                setTrouble(error.name === 'ChunkLoadError' ? 'load-failed' : 'render-error');
              });
              return null;
            }}
          >
            <Suspense fallback={null}>
              <Hub3D
                tier={plan.tier}
                adaptive={graphics === 'auto'}
                reducedMotion={reducedMotion}
                frame={frame}
                lifted={lifted}
                onReady={onReady}
                onContextLost={onContextLost}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}
