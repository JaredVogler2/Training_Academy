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
 * Which page asked for what. A download still under way when one page gives way to another is cancelled by the
 * browser, and that is not a failure of anything; a download cancelled with no page after it is. So the guard has
 * to know which page began each download.
 *
 * Counting the pages asked for is not enough. A page that is being left goes on living until the next one has
 * arrived, and can begin a download in between: the voice starts a line a moment after an answer, and a test that
 * has seen the answer is already asking for the next page. That download belongs to the page being left. Counted
 * by pages asked for, it was taken for the new page's own, and its being cancelled failed a test in CI twice
 * (WebKit, the same clip both times) that passed on its second attempt.
 *
 * So two things are kept: how many pages have been asked for, and which of them is there now.
 */
export class Pages {
  private asked = 0;
  private here = 0;
  /** The address of the page asked for and not yet arrived, without what follows a #. */
  private awaited: string | null = null;

  private static plain(address: string): string {
    return address.replace(/#.*$/, '');
  }

  /** A page has been asked for (each hop of a redirect is asked for in its turn). Returns its number. */
  ask(address: string): number {
    this.asked += 1;
    this.awaited = Pages.plain(address);
    return this.asked;
  }

  /**
   * The browser says a page has arrived at an address. Moving about inside a page is reported the same way, so
   * it counts only if it is the address being waited for.
   */
  arrive(address: string): void {
    if (this.awaited === null || Pages.plain(address) !== this.awaited) return;
    this.here = this.asked;
    this.awaited = null;
  }

  /** The page that is there now: whatever is asked for, other than a page, is asked for by it. */
  get current(): number {
    return this.here;
  }

  /** Whether another page has been asked for since this one: what it left unfinished was cancelled by leaving. */
  left(page: number): boolean {
    return page < this.asked;
  }
}

/**
 * The preview server's own note of each page it was asked for and when it answered, kept only while the browser
 * tests run (scripts/vite/vercel-parity.ts writes it when PREVIEW_PAGE_LOG names a file).
 *
 * It exists for one question. Now and then in CI a test's first page in WebKit waits a whole minute and then
 * arrives at once on a second attempt, while the other worker's pages are being served as usual. The browser's
 * side of that was known (the request was made and nothing came back). This is the server's side, and the first
 * time it was read it said that the request had arrived at once and been answered in under a millisecond: the
 * page was sent, and the browser never read it.
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
  // To a tenth of a second, with its sign: the two clocks are read at slightly different moments, so a request can
  // seem to arrive a few hundredths before it was made.
  const seconds = (at: number) => {
    const tenths = Math.round((at - since) / 100);
    return `${tenths < 0 ? '−' : '+'}${(Math.abs(tenths) / 10).toFixed(1)}`;
  };
  return (
    `requests for ${path} that reached the server after that: ` +
    asked
      .slice(0, 6)
      .map((note) =>
        note.answered === undefined
          ? `at ${seconds(note.arrived)} s from ${short(note.agent)}, not answered`
          : `at ${seconds(note.arrived)} s from ${short(note.agent)}, answered in ${String(note.answered - note.arrived)} ms`,
      )
      .join('; ') +
    (asked.length > 6 ? `; and ${String(asked.length - 6)} more` : '')
  );
}
