import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TIERS,
  chooseTier,
  effectivePixelRatio,
  planHub,
  type DeviceHints,
} from '@/render/quality';
import { isSoftwareRenderer, probeWebGl, resetWebGlProbeForTest } from '@/render/webgl';

const desktop: DeviceHints = {
  softwareRenderer: false,
  coarsePointer: false,
  memoryGb: 8,
  cores: 8,
};

describe('choosing a quality tier', () => {
  it('respects an explicit choice whatever the device', () => {
    const weak = { ...desktop, softwareRenderer: true, memoryGb: 1 };
    expect(chooseTier('high', weak)).toBe('high');
    expect(chooseTier('medium', desktop)).toBe('medium');
    expect(chooseTier('low', desktop)).toBe('low');
  });

  it('guesses cautiously when left on automatic', () => {
    expect(chooseTier('auto', desktop)).toBe('high');
    expect(chooseTier('auto', { ...desktop, softwareRenderer: true })).toBe('low');
    expect(chooseTier('auto', { ...desktop, memoryGb: 2 })).toBe('low');
    expect(chooseTier('auto', { ...desktop, cores: 2 })).toBe('low');
    expect(chooseTier('auto', { ...desktop, coarsePointer: true })).toBe('medium');
    expect(chooseTier('auto', { ...desktop, memoryGb: 4 })).toBe('medium');
    expect(chooseTier('auto', { ...desktop, memoryGb: null, cores: null })).toBe('high');
  });

  it('caps the pixel ratio per tier so a 3× phone does not shade nine times the pixels', () => {
    expect(effectivePixelRatio(3, 'high')).toBe(2);
    expect(effectivePixelRatio(3, 'medium')).toBe(1.5);
    expect(effectivePixelRatio(3, 'low')).toBe(1);
    expect(effectivePixelRatio(1, 'high')).toBe(1);
    expect(effectivePixelRatio(Number.NaN, 'high')).toBe(1);
    expect(effectivePixelRatio(0, 'high')).toBe(1);
  });

  it('never asks more of a lower tier than of a higher one', () => {
    expect(TIERS.low.maxPixelRatio).toBeLessThanOrEqual(TIERS.medium.maxPixelRatio);
    expect(TIERS.medium.maxPixelRatio).toBeLessThanOrEqual(TIERS.high.maxPixelRatio);
    expect(TIERS.low.detail).toBeLessThan(TIERS.high.detail);
    expect(TIERS.low.shadows).toBe(false);
  });
});

describe('deciding whether to try 3D at all', () => {
  const base = {
    graphics: 'auto' as const,
    webgl: { available: true, software: false },
    saveData: false,
    device: { coarsePointer: false, memoryGb: 8, cores: 8 },
  };

  it('uses 3D when the device can', () => {
    expect(planHub(base)).toEqual({ use3d: true, reason: null, tier: 'high' });
    expect(planHub({ ...base, webgl: { available: true, software: true } }).tier).toBe('low');
  });

  it('keeps to pictures when a grown-up chose that, without probing further', () => {
    expect(planHub({ ...base, graphics: 'pictures' })).toEqual({
      use3d: false,
      reason: 'setting',
      tier: null,
    });
  });

  it('keeps to pictures when there is no WebGL', () => {
    expect(planHub({ ...base, webgl: { available: false, software: false } })).toEqual({
      use3d: false,
      reason: 'no-webgl',
      tier: null,
    });
    expect(
      planHub({ ...base, graphics: 'high', webgl: { available: false, software: false } }).use3d,
    ).toBe(false);
  });

  it('does not download 3D for someone saving data, unless a grown-up asked for it', () => {
    expect(planHub({ ...base, saveData: true })).toMatchObject({
      use3d: false,
      reason: 'save-data',
    });
    expect(planHub({ ...base, saveData: true, graphics: 'medium' })).toMatchObject({
      use3d: true,
      tier: 'medium',
    });
  });
});

describe('probing WebGL', () => {
  beforeEach(() => resetWebGlProbeForTest());

  const canvasWith = (context: unknown) =>
    ({ getContext: vi.fn(() => context) }) as unknown as HTMLCanvasElement;

  it('recognises CPU rasterisers by name', () => {
    expect(
      isSoftwareRenderer(
        'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
      ),
    ).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(isSoftwareRenderer('Apple GPU')).toBe(false);
    expect(isSoftwareRenderer('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)')).toBe(false);
    expect(isSoftwareRenderer(null)).toBe(false);
  });

  it('reports the renderer and releases the probe context', () => {
    const lose = vi.fn();
    const gl = {
      RENDERER: 1,
      getExtension: vi.fn((name: string) =>
        name === 'WEBGL_debug_renderer_info'
          ? { UNMASKED_RENDERER_WEBGL: 2 }
          : name === 'WEBGL_lose_context'
            ? { loseContext: lose }
            : null,
      ),
      getParameter: vi.fn((id: number) => (id === 2 ? 'Apple GPU' : 'generic')),
    };
    const canvas = canvasWith(gl);
    expect(probeWebGl(() => canvas)).toEqual({
      available: true,
      renderer: 'Apple GPU',
      software: false,
    });
    expect(canvas.getContext).toHaveBeenCalledWith('webgl2', expect.anything());
    expect(lose).toHaveBeenCalledTimes(1);
  });

  it('asks once and remembers', () => {
    const create = vi.fn(() => canvasWith(null));
    probeWebGl(create);
    probeWebGl(create);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('treats a missing or throwing context as "no WebGL"', () => {
    expect(probeWebGl(() => canvasWith(null)).available).toBe(false);
    resetWebGlProbeForTest();
    const throwing = {
      getContext: () => {
        throw new Error('blocked');
      },
    } as unknown as HTMLCanvasElement;
    expect(probeWebGl(() => throwing)).toEqual({
      available: false,
      renderer: null,
      software: false,
    });
  });

  it('still works when the browser will not describe its renderer', () => {
    const gl = {
      RENDERER: 1,
      getExtension: vi.fn(() => null),
      getParameter: vi.fn(() => {
        throw new Error('denied');
      }),
    };
    expect(probeWebGl(() => canvasWith(gl))).toEqual({
      available: true,
      renderer: null,
      software: false,
    });
  });
});
