import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { loadChunk } from '@/app/chunks';
import { mark, recordError, setHubDiagnostics } from '@/app/diagnostics';
import { useReducedMotion, useSettings } from '@/app/settings';
import type { Frame, PlaceId } from './archipelago';
import type { Hub3DProps } from './hub3d/Hub3D';
import { HubPicture } from './HubPicture';
import { devicePlan, graphicsOverride } from './deviceGraphics';
import type { HubPlan, PictureReason } from './quality';
import styles from './HubStage.module.css';

/**
 * three.js, React Three Fiber and the scene: one group of chunks, fetched after the shell is on screen.
 *
 * It is fetched by hand rather than through `React.lazy`. A lazy component that cannot be downloaded throws while
 * React is rendering; React recovers, but under load it also reports the error on the console, for what is here an
 * ordinary event: the device is offline, and the hub keeps its picture. Fetched by hand, a failure is just a value.
 */
function useHub3D(wanted: boolean): {
  Hub3D: ComponentType<Hub3DProps> | null;
  failed: boolean;
} {
  const [Hub3D, setHub3D] = useState<ComponentType<Hub3DProps> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!wanted || Hub3D || failed) return;
    let current = true;
    loadChunk('hub-3d', () => import('./hub3d/Hub3D')).then(
      (module) => {
        // A component is a function: wrap it, or React would call it as a state updater.
        if (current) setHub3D(() => module.default);
      },
      () => {
        if (current) setFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, [wanted, Hub3D, failed]);
  return { Hub3D, failed };
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
export function HubStage({
  frame,
  lifted,
  waiting = false,
}: {
  frame: Frame | null;
  lifted: PlaceId | null;
  /** True while something stands in front of the hub: it stays a picture and the 3D code is not sent for. */
  waiting?: boolean;
}) {
  const settings = useSettings();
  const reducedMotion = useReducedMotion();
  const graphics = graphicsOverride() ?? settings.graphics;

  const [plan, setPlan] = useState<HubPlan>({ use3d: false, reason: 'loading', tier: null });
  const [idle, setIdle] = useState(false);
  const [ready, setReady] = useState(false);
  const [trouble, setTrouble] = useState<PictureReason | null>(null);

  useEffect(() => {
    const next = devicePlan(graphics);
    // Probing WebGL touches the DOM, so it happens after render, and its answer is state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlan(next);
    setReady(false);
    setTrouble(null);
  }, [graphics]);

  useEffect(() => whenIdle(() => setIdle(true)), []);

  const wanted = plan.use3d && idle && !waiting;
  const { Hub3D, failed } = useHub3D(wanted && trouble === null);
  // Not being able to download the 3D code is a reason to keep the picture, like any other.
  const problem: PictureReason | null = trouble ?? (failed ? 'load-failed' : null);

  const show3d = wanted && problem === null;
  const mode = show3d && ready ? '3d' : plan.use3d && problem === null ? 'pending' : 'picture';
  const reason = mode === 'picture' ? (problem ?? plan.reason) : null;

  useEffect(() => {
    setHubDiagnostics({ mode, reason, tier: plan.tier });
    if (mode !== 'pending') mark(mode === '3d' ? 'hub-3d-shown' : 'hub-picture-shown');
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
      {show3d && plan.tier && frame && Hub3D && (
        <div className={styles.canvas} data-ready={ready}>
          <ErrorBoundary
            fallback={() => {
              // Whatever went wrong in the 3D scene, the picture underneath is still there.
              queueMicrotask(() => setTrouble('render-error'));
              return null;
            }}
          >
            <Hub3D
              tier={plan.tier}
              adaptive={graphics === 'auto'}
              reducedMotion={reducedMotion}
              frame={frame}
              lifted={lifted}
              onReady={onReady}
              onContextLost={onContextLost}
            />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}
