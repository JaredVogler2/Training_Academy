import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * What the browser tests' guard (fixtures.ts) uses to tell one kind of trouble from another. Nothing here needs a
 * browser, so that it can be tested without one (tests/config/e2eDiagnosis.test.ts).
 */

/**
 * WebKit reports a download begun by `fetch()` and cancelled by leaving the page a second time, in words: "Fetch API
 * cannot load <address> due to access control checks." Playwright passes that on as an uncaught error, having taken
 * everything up to the first colon for the error's name, so what arrives begins part-way through the address.
 * Returns the address without its scheme, or null if the message is something else.
 */
export function fetchNotLoaded(message: string): string | null {
  const found = /^(.*) due to access control checks\.$/.exec(message);
  if (!found?.[1]) return null;
  return found[1].replace(/^.*?:\/\//, '').replace(/^\/+/, '');
}

/**
 * The preview server's own note of each page it was asked for and when it answered, kept only while the browser
 * tests run (scripts/vite/vercel-parity.ts writes it when PREVIEW_PAGE_LOG names a file).
 *
 * It exists for one question. Three times in CI a page load in WebKit has waited a whole minute for the page
 * itself and then passed at once on a second attempt, while the other worker's pages were being served as usual.
 * The browser's side of that is known (the request was made and nothing came back). This is the server's side:
 * whether that request ever arrived, and whether it was answered.
 */
export const pageLogPath = (port: number): string =>
  join(tmpdir(), `training-academy-preview-${String(port)}.pages.log`);

interface PageNote {
  /** Which request, counted from the server's start. */
  id: number;
  path: string;
  arrived: number;
  /** Absent on the note written as the request arrives; set on the one written when its answer has been sent. */
  answered?: number;
  agent: string;
}

const short = (agent: string): string =>
  /iPad|iPhone|Android|Macintosh|Windows|Linux/.exec(agent)?.[0] ?? 'an unnamed browser';

/** What the server noted about requests for `path` from `since` on, in words. */
export function pagesServed(port: number, path: string, since: number): string {
  let lines: string[];
  try {
    lines = readFileSync(pageLogPath(port), 'utf8').split('\n').filter(Boolean);
  } catch {
    return 'the server kept no note of its pages';
  }
  const notes = new Map<number, PageNote>();
  for (const line of lines) {
    try {
      const note = JSON.parse(line) as PageNote;
      // The later note of a request (its answer) replaces the earlier one (its arrival).
      notes.set(note.id, note);
    } catch {
      // A line half written as it was read.
    }
  }
  // A little before, because the two clocks are read at slightly different moments.
  const asked = [...notes.values()].filter(
    (note) => note.path === path && note.arrived >= since - 500,
  );
  if (asked.length === 0) return `no request for ${path} reached the server after that`;
  const seconds = (at: number) => ((at - since) / 1000).toFixed(1);
  return (
    `requests for ${path} that reached the server after that: ` +
    asked
      .slice(0, 6)
      .map((note) =>
        note.answered === undefined
          ? `at +${seconds(note.arrived)} s from ${short(note.agent)}, not answered`
          : `at +${seconds(note.arrived)} s from ${short(note.agent)}, answered in ${String(note.answered - note.arrived)} ms`,
      )
      .join('; ') +
    (asked.length > 6 ? `; and ${String(asked.length - 6)} more` : '')
  );
}
