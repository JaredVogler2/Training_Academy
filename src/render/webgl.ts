/**
 * Can this browser draw the 3D hub, and with what? Asked once, before the 3D code is even downloaded, so a device
 * without WebGL never pays for three.js.
 */

export interface WebGlSupport {
  available: boolean;
  /** The graphics driver as the browser describes it, when it will say. */
  renderer: string | null;
  /** True for CPU rasterisers (SwiftShader, llvmpipe…): WebGL works, slowly. */
  software: boolean;
}

const SOFTWARE_RENDERERS = /swiftshader|llvmpipe|softpipe|software|basic render/i;

export function isSoftwareRenderer(renderer: string | null): boolean {
  return renderer !== null && SOFTWARE_RENDERERS.test(renderer);
}

let cached: WebGlSupport | null = null;

/** three.js needs WebGL 2. The probe context is released straight away. */
export function probeWebGl(
  createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas'),
): WebGlSupport {
  if (cached) return cached;
  let support: WebGlSupport = { available: false, renderer: null, software: false };
  try {
    const gl = createCanvas().getContext('webgl2', { failIfMajorPerformanceCaveat: false });
    if (gl) {
      let renderer: string | null = null;
      try {
        const info = gl.getExtension('WEBGL_debug_renderer_info');
        const value: unknown = gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
        renderer = typeof value === 'string' ? value : null;
      } catch {
        // Some browsers refuse to describe the renderer; that is fine.
      }
      support = { available: true, renderer, software: isSoftwareRenderer(renderer) };
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    // Treated as "no WebGL".
  }
  cached = support;
  return support;
}

/** For tests. */
export function resetWebGlProbeForTest(): void {
  cached = null;
}
