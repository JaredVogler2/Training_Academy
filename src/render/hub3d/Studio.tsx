import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PITCH } from '../archipelago';
import { TIERS, type Tier } from '../quality';
import { isPlaceId, isSpriteId, spriteBox, type FloatingId } from '../sprites';
import { Harbour, type Placed } from './Harbour';
import type { Isle, SeaLook } from './Sea';
import { ROCK_SHORE, boatShape, cloudShape, rocksShape } from './floating';
import { OrthoRig } from './stage';
import { installThreeConsole } from './threeConsole';
import styles from './Studio.module.css';

installThreeConsole();

/**
 * The studio: one island, or one floating thing, on its own. Not linked from the game.
 *
 *   /studio/academy                   the island on the water, filling the window
 *   /studio/academy?tier=low          at another quality tier
 *   /studio/academy?sprite=80         as the fallback picture is rendered: 80 pixels to the world unit, clear
 *                                     background, the canvas exactly the picture's size, nothing moving
 *   /studio/boat-0, /studio/rock, /studio/cloud
 *
 * It exists for the art review (docs/QUALITY_REPORT.md) and to render the pictures the hub falls back to
 * (scripts/render-sprites.mjs).
 */

const LOOK: SeaLook = { depth: [-30, 16], haze: [40, 90, 0] };
const NO_PLACES: Placed[] = [];

function floatingShape(id: FloatingId) {
  if (id === 'rock') return rocksShape([{ x: 0, z: 0 }]);
  if (id === 'cloud') return cloudShape();
  return boatShape(Number(id.slice(-1)));
}

function floatingIsles(id: FloatingId): Isle[] {
  if (id === 'cloud') return [];
  if (id === 'rock') {
    return [
      {
        x: ROCK_SHORE.dx,
        z: ROCK_SHORE.dz,
        radius: ROCK_SHORE.radius,
        seed: 1,
        wander: ROCK_SHORE.wander,
        height: ROCK_SHORE.height,
      },
    ];
  }
  return [{ x: 0, z: 0, radius: 0.3, seed: 0, wander: 0, height: 1.1, grounded: false }];
}

export default function Studio({ view }: { view: string }) {
  const params = new URLSearchParams(window.location.search);
  const asked = params.get('tier');
  const tier: Tier = asked === 'low' || asked === 'medium' || asked === 'high' ? asked : 'high';
  const settings = TIERS[tier];
  const sprite = Number(params.get('sprite')) || 0;
  const [ready, setReady] = useState(false);

  const id = isSpriteId(view) ? view : null;
  const place = id && isPlaceId(id) ? id : null;
  const floating = id && !isPlaceId(id) ? id : null;
  const placed = useMemo<Placed[]>(
    () => (place ? [{ id: place, x: 0, z: 0 }] : NO_PLACES),
    [place],
  );
  const shape = useMemo(() => (floating ? floatingShape(floating) : null), [floating]);
  const isles = useMemo(() => (floating ? floatingIsles(floating) : []), [floating]);
  useEffect(() => () => shape?.dispose(), [shape]);

  // A picture is rendered on a clear ground: the page behind the canvas must be clear too.
  useEffect(() => {
    if (!sprite) return;
    const before = document.body.style.background;
    document.body.style.background = 'transparent';
    return () => {
      document.body.style.background = before;
    };
  }, [sprite]);

  const box = id ? spriteBox(id) : null;
  // For a picture the camera looks at the middle of the picture's box; otherwise at a point a little above the
  // water, so the landmark is centred.
  const target = useMemo<[number, number, number]>(() => {
    if (!box || (!sprite && place)) return [0, 1.1, 0];
    const across = box.width / 2 - box.anchorX;
    const up = box.anchorY - box.height / 2;
    return [across, 0, -up / Math.sin(PITCH)];
  }, [sprite, place, box]);

  if (!id || !box) return <p data-testid="studio">Nothing by that name.</p>;
  const zoom =
    sprite ||
    (place
      ? Math.min(window.innerWidth / 6.4, window.innerHeight / 6.2)
      : Math.min(window.innerWidth / box.width, window.innerHeight / box.height));
  return (
    <div
      className={styles.studio}
      data-testid="studio"
      data-view={view}
      data-ready={ready}
      data-sprite={sprite ? 'true' : undefined}
      data-anchor-x={sprite ? box.anchorX * sprite : undefined}
      data-anchor-y={sprite ? box.anchorY * sprite : undefined}
      style={sprite ? { width: box.width * sprite, height: box.height * sprite } : undefined}
    >
      <Canvas
        orthographic
        flat
        shadows={settings.shadows ? 'percentage' : false}
        dpr={sprite ? 1 : Math.min(window.devicePixelRatio, settings.maxPixelRatio)}
        frameloop={sprite ? 'demand' : 'always'}
        gl={{
          antialias: true,
          alpha: sprite > 0,
          stencil: false,
          preserveDrawingBuffer: sprite > 0,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.autoUpdate = false;
          if (sprite) gl.setClearColor(0x000000, 0);
        }}
        aria-hidden="true"
      >
        <OrthoRig target={target} zoom={zoom} />
        <Harbour
          placed={placed}
          extras={null}
          tier={tier}
          still={sprite > 0}
          lifted={null}
          look={LOOK}
          sprite={sprite > 0}
          bare={floating === 'cloud'}
          moreIsles={isles}
          onReady={() => setReady(true)}
        >
          {(material) =>
            shape ? (
              <mesh geometry={shape} material={material} castShadow={settings.shadows} />
            ) : null
          }
        </Harbour>
      </Canvas>
    </div>
  );
}
