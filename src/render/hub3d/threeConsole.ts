import { setConsoleFunction } from 'three';

/**
 * three.js messages that are known, understood and cannot be acted on here. Matched exactly, one by one; everything
 * else three.js says still reaches the console (and so still fails the browser tests, which allow no warnings).
 */
const KNOWN_MESSAGES = new Set([
  // React Three Fiber 9 constructs a THREE.Clock for its render loop, and three.js deprecated that class in r183.
  // Nothing in this project uses the clock. Delete this entry when R3F moves to THREE.Timer.
  'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.',
]);

let installed = false;

export function installThreeConsole(): void {
  if (installed) return;
  installed = true;
  setConsoleFunction((type: 'log' | 'warn' | 'error', message: string, ...details: unknown[]) => {
    if (KNOWN_MESSAGES.has(message)) return;
    if (type === 'error') console.error(message, ...details);
    else console.warn(message, ...details);
  });
}
