/**
 * On-device diagnostics: what loaded, how long it took, what failed, how the hub is being drawn.
 *
 * Everything here stays in this page's memory. It is shown to a grown-up under "Diagnostics" and read by the
 * browser tests; nothing is ever sent anywhere. (The Content-Security-Policy's `connect-src 'self'` and an
 * end-to-end test that fails on any cross-origin request both hold that line.)
 */

export interface ChunkRecord {
  name: string;
  ms: number;
  ok: boolean;
}

export interface ErrorRecord {
  at: number;
  source: 'render' | 'window' | 'promise' | 'chunk' | 'storage' | 'audio' | 'webgl';
  message: string;
}

export interface HubDiagnostics {
  mode: 'pending' | '3d' | 'picture';
  /** Why the hub as a picture is showing, when it is. */
  reason: string | null;
  tier: string | null;
  pixelRatio: number | null;
  renderer: string | null;
  /** Rolling frame statistics from the last sampling window; `null` until one has been measured. */
  frames: { fps: number; p95Ms: number; samples: number } | null;
  drawCalls: number | null;
  triangles: number | null;
  /** What the renderer is holding on the graphics card: a number that keeps growing is a leak. */
  geometries: number | null;
  textures: number | null;
  programs: number | null;
}

export interface Diagnostics {
  /** Milliseconds since navigation start. */
  marks: Record<string, number>;
  chunks: ChunkRecord[];
  errors: ErrorRecord[];
  hub: HubDiagnostics;
  vitals: {
    firstContentfulPaintMs: number | null;
    largestContentfulPaintMs: number | null;
    cumulativeLayoutShift: number | null;
    longTasks: number;
    longestTaskMs: number;
  };
}

const MAX_RECORDS = 50;

let state: Diagnostics = {
  marks: {},
  chunks: [],
  errors: [],
  hub: {
    mode: 'pending',
    reason: null,
    tier: null,
    pixelRatio: null,
    renderer: null,
    frames: null,
    drawCalls: null,
    triangles: null,
    geometries: null,
    textures: null,
    programs: null,
  },
  vitals: {
    firstContentfulPaintMs: null,
    largestContentfulPaintMs: null,
    cumulativeLayoutShift: null,
    longTasks: 0,
    longestTaskMs: 0,
  },
};

const listeners = new Set<() => void>();

function update(next: Diagnostics): void {
  state = next;
  for (const listener of listeners) listener();
}

export function getDiagnostics(): Diagnostics {
  return state;
}

export function subscribeDiagnostics(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const round = (ms: number): number => Math.round(ms * 10) / 10;

/** Record the first time something happened. Later calls with the same name are ignored. */
export function mark(name: string): void {
  if (name in state.marks) return;
  const at = round(performance.now());
  try {
    performance.mark(`ta:${name}`);
  } catch {
    // The User Timing API is a nicety for DevTools; the number above is what is kept.
  }
  update({ ...state, marks: { ...state.marks, [name]: at } });
}

export function recordChunk(name: string, ms: number, ok: boolean): void {
  update({
    ...state,
    chunks: [...state.chunks, { name, ms: round(ms), ok }].slice(-MAX_RECORDS),
  });
}

export function recordError(source: ErrorRecord['source'], error: unknown): void {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error).slice(0, 300);
  update({
    ...state,
    errors: [...state.errors, { at: round(performance.now()), source, message }].slice(
      -MAX_RECORDS,
    ),
  });
}

export function setHubDiagnostics(patch: Partial<HubDiagnostics>): void {
  update({ ...state, hub: { ...state.hub, ...patch } });
}

/** Start the browser's own performance observers, where it has them. Safe to call once at boot. */
export function observeVitals(): void {
  if (typeof PerformanceObserver === 'undefined') return;
  const watch = (type: string, onEntries: (entries: PerformanceEntry[]) => void): void => {
    try {
      const observer = new PerformanceObserver((list) => onEntries(list.getEntries()));
      observer.observe({ type, buffered: true });
    } catch {
      // This browser does not report this entry type (Safari reports fewer than Chromium).
    }
  };
  const setVitals = (patch: Partial<Diagnostics['vitals']>) =>
    update({ ...state, vitals: { ...state.vitals, ...patch } });

  watch('paint', (entries) => {
    const paint = entries.find((entry) => entry.name === 'first-contentful-paint');
    if (paint) setVitals({ firstContentfulPaintMs: round(paint.startTime) });
  });
  watch('largest-contentful-paint', (entries) => {
    const last = entries.at(-1);
    if (last) setVitals({ largestContentfulPaintMs: round(last.startTime) });
  });
  watch('layout-shift', (entries) => {
    let total = state.vitals.cumulativeLayoutShift ?? 0;
    for (const entry of entries as (PerformanceEntry & {
      value?: number;
      hadRecentInput?: boolean;
    })[]) {
      if (!entry.hadRecentInput) total += entry.value ?? 0;
    }
    setVitals({ cumulativeLayoutShift: Math.round(total * 1000) / 1000 });
  });
  watch('longtask', (entries) => {
    setVitals({
      longTasks: state.vitals.longTasks + entries.length,
      longestTaskMs: Math.max(
        state.vitals.longestTaskMs,
        ...entries.map((entry) => round(entry.duration)),
      ),
    });
  });
}

/** For tests. */
export function resetDiagnosticsForTest(): void {
  state = {
    marks: {},
    chunks: [],
    errors: [],
    hub: { ...state.hub, mode: 'pending', reason: null, frames: null },
    vitals: { ...state.vitals, longTasks: 0, longestTaskMs: 0 },
  };
}
