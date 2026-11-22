import { useEffect, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, type PerspectiveCamera } from 'three';
import type { Clock } from './Props';

/**
 * Frames the island inside the part of the screen that the interface leaves uncovered.
 *
 * The canvas fills the whole hub, but the dock covers its lower edge (or its right-hand side on a phone held
 * sideways). So the camera backs off until the island fits the free area, and the view is shifted so the island sits
 * in the middle of that area rather than the middle of the canvas. The same numbers work for every screen shape.
 */

/** What the camera looks at: a point a little above the hill, nudged towards the pier so the harbour is in frame. */
const TARGET = new Vector3(1.2, 3.5, 0.6);
/** Half the width and height, in world units, that must stay in view around the target. */
const HALF_WIDTH = 9.6;
const HALF_HEIGHT = 5.3;
/**
 * A low viewpoint: the island is seen a little from above, with the horizon and a band of sky behind the tower.
 * Higher and the scene becomes a map with no sky; lower and the top of the island disappears.
 */
const ELEVATION = (8 * Math.PI) / 180;
const SWAY = 0.1;

export function CameraRig({
  focusArea,
  clock,
}: {
  focusArea: RefObject<HTMLElement | null>;
  clock: Clock;
}) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const canvas = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const distance = useRef(36);

  useEffect(() => {
    const frame = () => {
      const whole = canvas.getBoundingClientRect();
      if (whole.width === 0 || whole.height === 0) return;
      const area = focusArea.current?.getBoundingClientRect() ?? whole;
      const width = Math.max(area.width, 120);
      const height = Math.max(area.height, 120);

      const pixelsPerUnit = Math.min(
        (width * 0.94) / (2 * HALF_WIDTH),
        (height * 0.9) / (2 * HALF_HEIGHT),
      );
      const halfFov = (camera.fov * Math.PI) / 360;
      distance.current = whole.height / (2 * pixelsPerUnit * Math.tan(halfFov));

      const shiftX = area.left - whole.left + area.width / 2 - whole.width / 2;
      const shiftY = area.top - whole.top + area.height / 2 - whole.height / 2;
      camera.setViewOffset(whole.width, whole.height, -shiftX, -shiftY, whole.width, whole.height);
      invalidate();
    };
    frame();
    const observer = new ResizeObserver(frame);
    observer.observe(canvas);
    if (focusArea.current) observer.observe(focusArea.current);
    return () => {
      observer.disconnect();
      camera.clearViewOffset();
    };
  }, [camera, canvas, focusArea, invalidate, size.width, size.height]);

  useFrame(() => {
    // A slow side-to-side drift gives the diorama depth. It stops with the clock when motion is reduced.
    const azimuth = Math.sin(clock.current * 0.12) * SWAY;
    const flat = Math.cos(ELEVATION) * distance.current;
    camera.position.set(
      TARGET.x + Math.sin(azimuth) * flat,
      TARGET.y + Math.sin(ELEVATION) * distance.current,
      TARGET.z + Math.cos(azimuth) * flat,
    );
    camera.lookAt(TARGET);
  });

  return null;
}
