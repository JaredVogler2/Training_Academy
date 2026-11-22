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
/** The widest the camera drifts to either side, in radians, on a wide screen. Narrow screens get less. */
const SWAY = 0.1;
/** Where the sun sits: this far across the free area from its left edge, this high above the horizon. */
const SUN_ACROSS = 0.2;
const SUN_ELEVATION = (4.3 * Math.PI) / 180;

export function CameraRig({
  focusArea,
  clock,
  sun,
}: {
  focusArea: RefObject<HTMLElement | null>;
  clock: Clock;
  /** Written here, read by the sky: the direction of the sun, chosen so that it is in view on this screen. */
  sun: Vector3;
}) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const canvas = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
  const size = useThree((state) => state.size);
  const framing = useRef({ distance: 36, sway: SWAY });

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
      const tanHalfFov = Math.tan((camera.fov * Math.PI) / 360);
      const tanHalfAcross = tanHalfFov * (whole.width / whole.height);

      const shiftX = area.left - whole.left + area.width / 2 - whole.width / 2;
      const shiftY = area.top - whole.top + area.height / 2 - whole.height / 2;
      camera.setViewOffset(whole.width, whole.height, -shiftX, -shiftY, whole.width, whole.height);

      // A phone held upright sees a narrow slice of the world; the same drift there would swing the sky right out of
      // view. Scale the drift to the width of the view.
      const sway = SWAY * Math.min(1, Math.atan(tanHalfAcross) / 0.55);
      framing.current = { distance: whole.height / (2 * pixelsPerUnit * tanHalfFov), sway };

      // Put the sun where this screen can see it: a fixed way across the free area, whatever its shape.
      const sunX = area.left - whole.left + area.width * SUN_ACROSS;
      const across = (sunX - whole.width / 2 - shiftX) / (whole.width / 2);
      const azimuth = Math.atan(across * tanHalfAcross);
      sun.set(
        Math.sin(azimuth) * Math.cos(SUN_ELEVATION),
        Math.sin(SUN_ELEVATION),
        -Math.cos(azimuth) * Math.cos(SUN_ELEVATION),
      );
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
  }, [camera, canvas, focusArea, invalidate, sun, size.width, size.height]);

  useFrame(() => {
    // A slow side-to-side drift gives the diorama depth. It stops with the clock when motion is reduced.
    const { distance, sway } = framing.current;
    const azimuth = Math.sin(clock.current * 0.12) * sway;
    const flat = Math.cos(ELEVATION) * distance;
    camera.position.set(
      TARGET.x + Math.sin(azimuth) * flat,
      TARGET.y + Math.sin(ELEVATION) * distance,
      TARGET.z + Math.cos(azimuth) * flat,
    );
    camera.lookAt(TARGET);
  });

  return null;
}
