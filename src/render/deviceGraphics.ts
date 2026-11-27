import { GRAPHICS_OPTIONS, type GraphicsOption } from '@/app/settings';
import { planHub, type HubPlan } from './quality';
import { probeWebGl } from './webgl';

/** `?gfx=low|medium|high|pictures` overrides the graphics setting for one visit: for testing and for captures. */
export function graphicsOverride(): GraphicsOption | null {
  const value = new URLSearchParams(window.location.search).get('gfx');
  return (GRAPHICS_OPTIONS as readonly string[]).includes(value ?? '')
    ? (value as GraphicsOption)
    : null;
}

export function devicePlan(graphics: GraphicsOption): HubPlan {
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
