/**
 * How the globe is turned by hand: the numbers the board turns it by, kept apart from the board so that the
 * tests of it in a browser can use the same ones.
 */

/** How far one press of a turning button, or of an arrow key, turns the globe: degrees. */
export const TURN_STEP = 40;
/** How far an arrow key tips it towards a pole: degrees. */
export const TIP_STEP = 15;
/** How far a finger may slip, in pixels, and still have pressed and not pulled. */
export const SLOP = 8;
/** How long the globe is left where a child has turned it, when a pin has gone out of sight, before it turns back. */
export const BACK_AFTER_MS = 1600;
/** How long a turn takes: to a new question or a land that was found, by a button, and back. */
export const TURN_MS = { question: 900, step: 320, back: 700 } as const;
