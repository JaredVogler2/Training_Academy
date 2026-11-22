import { useMemo } from 'react';
import { PLACES, visibleDepth, type Frame, type PlaceId } from '../archipelago';
import type { Tier } from '../quality';
import { Harbour, type GullCourse, type Placed } from './Harbour';
import type { SeaLook } from './Sea';
import { OrthoRig } from './stage';

/** The hub: the whole archipelago, framed for this screen. */
export function Scene({
  tier,
  reducedMotion,
  frame,
  lifted,
  onReady,
}: {
  tier: Tier;
  reducedMotion: boolean;
  frame: Frame;
  lifted: PlaceId | null;
  onReady: () => void;
}) {
  const placed = useMemo<Placed[]>(
    () => PLACES.map((id) => ({ id, x: frame.layout.spots[id].x, z: frame.layout.spots[id].z })),
    [frame.layout],
  );
  const target = useMemo<[number, number, number]>(
    () => [frame.target.x, 0, frame.target.z],
    [frame.target.x, frame.target.z],
  );
  // The water is deepest at the near edge of the screen and palest at the far edge, whatever the layout; haze
  // gathers over the far half.
  const look = useMemo<SeaLook>(() => {
    const { far, near } = visibleDepth(frame);
    return {
      depth: [far, near],
      haze: [-(far + near) / 2, -far + 6, 0.2],
    };
  }, [frame]);

  // The gulls wheel over the middle of what is on screen, in a circle a third as wide as the shorter side.
  const gulls = useMemo<GullCourse>(
    () => ({
      x: frame.target.x,
      z: frame.target.z,
      radius: (Math.min(frame.stage.width, frame.stage.height) / frame.scale) * 0.32,
    }),
    [frame],
  );

  return (
    <>
      <OrthoRig target={target} zoom={frame.scale} />
      <Harbour
        placed={placed}
        extras={frame.layout.extras}
        tier={tier}
        still={reducedMotion}
        lifted={lifted}
        look={look}
        gulls={gulls}
        onReady={onReady}
      />
    </>
  );
}
