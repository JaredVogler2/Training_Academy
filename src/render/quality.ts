import type { GraphicsOption } from '@/app/settings';

/**
 * Visual quality tiers for the 3D hub. The same scene at every tier; what changes is how hard the device has to work.
 * Phase 02 tunes the numbers against real captures and devices — these are the starting values.
 */

export type Tier = 'low' | 'medium' | 'high';

export interface TierSettings {
  /** Upper bound on device pixel ratio: a phone at 3× would otherwise shade nine times the pixels. */
  maxPixelRatio: number;
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  /** Share of decorative detail (flowers, far islets, birds) that is drawn. */
  detail: number;
}

export const TIERS: Record<Tier, TierSettings> = {
  // Even the lightest tier smooths its edges: at one pixel per point, un-smoothed edges are plainly jagged, and
  // multisampling costs far less than drawing more pixels.
  low: { maxPixelRatio: 1, antialias: true, shadows: false, shadowMapSize: 0, detail: 0.5 },
  medium: { maxPixelRatio: 1.5, antialias: true, shadows: true, shadowMapSize: 1024, detail: 0.8 },
  high: { maxPixelRatio: 2, antialias: true, shadows: true, shadowMapSize: 2048, detail: 1 },
};

export interface DeviceHints {
  softwareRenderer: boolean;
  /** A touch-first device (phones and tablets). */
  coarsePointer: boolean;
  /** `navigator.deviceMemory` in GB, where the browser reports it. */
  memoryGb: number | null;
  /** `navigator.hardwareConcurrency`, where reported. */
  cores: number | null;
}

/** Pick a tier: the grown-up's explicit choice if there is one, otherwise a cautious guess from the device. */
export function chooseTier(graphics: GraphicsOption, device: DeviceHints): Tier {
  if (graphics === 'low' || graphics === 'medium' || graphics === 'high') return graphics;
  if (device.softwareRenderer) return 'low';
  if (
    (device.memoryGb !== null && device.memoryGb <= 2) ||
    (device.cores !== null && device.cores <= 2)
  ) {
    return 'low';
  }
  if (device.coarsePointer) return 'medium';
  if (device.memoryGb !== null && device.memoryGb <= 4) return 'medium';
  return 'high';
}

export function effectivePixelRatio(devicePixelRatio: number, tier: Tier): number {
  const ratio = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(ratio, TIERS[tier].maxPixelRatio);
}

/** Why the hub is not (or not yet) in 3D. Shown to grown-ups under Diagnostics. */
export type IllustratedReason =
  | 'loading'
  | 'setting'
  | 'no-webgl'
  | 'save-data'
  | 'load-failed'
  | 'context-lost'
  | 'render-error';

export interface HubPlan {
  use3d: boolean;
  reason: IllustratedReason | null;
  tier: Tier | null;
}

/** Decide, before downloading any 3D code, whether the hub should try for 3D at all. */
export function planHub(input: {
  graphics: GraphicsOption;
  webgl: { available: boolean; software: boolean };
  saveData: boolean;
  device: Omit<DeviceHints, 'softwareRenderer'>;
}): HubPlan {
  if (input.graphics === 'pictures') return { use3d: false, reason: 'setting', tier: null };
  if (!input.webgl.available) return { use3d: false, reason: 'no-webgl', tier: null };
  // Someone who has asked their browser to save data gets the picture unless a grown-up chose 3D explicitly.
  if (input.saveData && input.graphics === 'auto') {
    return { use3d: false, reason: 'save-data', tier: null };
  }
  return {
    use3d: true,
    reason: null,
    tier: chooseTier(input.graphics, { ...input.device, softwareRenderer: input.webgl.software }),
  };
}
