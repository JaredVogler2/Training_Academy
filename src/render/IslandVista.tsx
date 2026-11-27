import { lazy, Suspense, useCallback, useEffect, useState, type ComponentType } from 'react';
import { loadChunk } from '@/app/chunks';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { useSettings, type GraphicsOption } from '@/app/settings';
import { devicePlan, graphicsOverride } from './deviceGraphics';
import type { PlaceId } from './extents';
import type { IslandVista3DProps } from './hub3d/IslandVista3D';
import type { Tier } from './quality';
import { spriteFile } from './spriteFiles';
import styles from './IslandVista.module.css';

const IslandVista3D = lazy<ComponentType<IslandVista3DProps>>(() =>
  loadChunk('island-vista-3d', () => import('./hub3d/IslandVista3D')).catch(() => ({
    default: () => null,
  })),
);

/** The illustration is always available, including while the optional 3D view is being prepared. */
export function IslandVista({ place }: { place: PlaceId }) {
  const settings = useSettings();
  const graphics = graphicsOverride() ?? settings.graphics;
  const sprite = spriteFile(place);

  return (
    <div className={styles.vista} aria-hidden="true" data-testid="island-vista" data-island={place}>
      {sprite && (
        <img
          className={styles.picture}
          src={sprite.url}
          alt=""
          width={sprite.width}
          height={sprite.height}
          decoding="async"
          draggable={false}
        />
      )}
      {graphics !== 'pictures' && <IslandScene key={graphics} graphics={graphics} place={place} />}
    </div>
  );
}

function IslandScene({ graphics, place }: { graphics: GraphicsOption; place: PlaceId }) {
  const [tier, setTier] = useState<Tier | null>(null);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onContextLost = useCallback(() => setTier(null), []);

  useEffect(() => {
    // Let the illustration paint before probing WebGL and loading the heavier scene.
    const frame = window.requestAnimationFrame(() => setTier(devicePlan(graphics).tier));
    return () => window.cancelAnimationFrame(frame);
  }, [graphics]);

  if (!tier) return null;
  return (
    <div className={styles.canvas} data-ready={ready}>
      <ErrorBoundary fallback={() => null}>
        <Suspense fallback={null}>
          <IslandVista3D
            place={place}
            tier={tier}
            onReady={onReady}
            onContextLost={onContextLost}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
