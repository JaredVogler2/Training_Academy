import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * What the browser tests' guard (fixtures.ts) uses to tell one kind of trouble from another. Nothing here needs a
 * browser, so that it can be tested without one (tests/config/e2eDiagnosis.test.ts).
 */

/**
 * WebKit will not begin a download for a page that is being left. From the moment another page has been asked for
 * until it arrives, a `fetch()` made by the page that is still there fails at once: no request is made, so none is
 * reported, and the only thing said of it is a sentence on the console, "Fetch API cannot load <address> due to
 * access control checks." (WebKit's own source: `CachedResource::load` fails a load before it starts while the
 * frame's loader is provisional, or stopping, or has no document; `CachedResourceLoader::requestResource` calls such
 * an immediate failure "likely due to access control"; and `ThreadableLoader::logError` words it, which it never
 * does for a download that was begun and then cancelled.)
 *
 * Playwright passes the sentence on as an uncaught error, having taken everything up to the first colon for the
 * error's name, so what arrives begins part-way through the address. Returns the address without its scheme, or
 * null if the message is something else.
 */
export function fetchNotLoaded(message: string): string | null {
  const found = /^(.*) due to access control checks\.$/.exec(message);
  if (!found?.[1]) return null;
  return found[1].replace(/^.*?:\/\//, '').replace(/^\/+/, '');
}

/** Whether an address, as `fetchNotLoaded` gives it, is on the site under test: its host, and then a path. */
export function onSite(address: string, origin: string): boolean {
  return address.startsWith(`${new URL(origin).host}/`);
}

/**
 * Which page asked for what. A download still under way when one page gives way to another is cancelled by the
 * browser, and one asked for while the next page is on its way is, in WebKit, never begun; neither is a failure of
 * anything. Left undone with no page after it, either is. So the guard has to know which page each belongs to.
 *
 * Counting the pages asked for is not enough. A page that is being left goes on living until the next one has
 * arrived, and what it does in between is its own: the voice starts a line a moment after an answer, and a test
 * that has seen the answer is already asking for the next page. Counted by pages asked for, that was taken for
 * the new page's doing, with no page after it.
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

  /** How many pages have been asked for so far. */
  get count(): number {
    return this.asked;
  }

  /** Whether another page has been asked for since this one: what it left undone was left by leaving it. */
  left(page: number): boolean {
    return page < this.asked;
  }
}

/**
 * What pages left undone, and whether it is held against a test.
 *
 *   a download that was begun and then cancelled    belongs to the page that began it
 *   a download WebKit would not begin (above)       belongs to the page that was there when WebKit said so
 *
 * Either is held against a test only while its page is the last one asked for: once another has been asked for,
 * it is what leaving a page does. It is judged when it is asked about, not when it happens, so the order in which
 * the browser reports the next page and the thing left undone does not matter.
 */
export class LeftUndone {
  private readonly things: { line: string; page: number; refused: boolean }[] = [];

  constructor(private readonly pages: Pages) {}

  /** A download begun by `page` was cancelled. */
  cancelled(line: string, page: number): void {
    this.things.push({ line, page, refused: false });
  }

  /** WebKit has said it would not begin a download: the page that is there asked for it. */
  refused(line: string): void {
    this.things.push({ line, page: this.pages.current, refused: true });
  }

  /** What is held against the test: left undone by a page that nobody has since asked to leave. */
  held(): string[] {
    return this.things
      .filter(({ page }) => !this.pages.left(page))
      .map(({ line, page, refused }) =>
        refused
          ? // Said in full, because this has been misread before: which page was there, and of how many.
            `${line} (WebKit would not begin this download, and no page was asked for after the one that was ` +
            `there: page ${String(page)} of ${String(this.pages.count)})`
          : line,
      );
  }

  /** What is let pass: left undone by a page that has been left since. */
  passed(): string[] {
    return this.things.filter(({ page }) => this.pages.left(page)).map(({ line }) => line);
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

/**
 * How long a page is waited for before the test that asked for it gives up: half a minute, where it was as long
 * as the test had. A page comes or it does not. Of 2859 page loads in the reports of thirteen of CI's jobs (run
 * 49's twelve and one each of runs 50 and 51), the slowest that came took 4.7 seconds, the next 1.7, and every
 * other one less than a second; the one that did not come (run 51, WebKit as a phone: the eighth time) was
 * waited for until the test's two minutes were up. Half a minute is six times the slowest page there has been,
 * and a quarter of what the eighth one cost.
 */
export const PAGE_LIMIT = 30_000;

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
