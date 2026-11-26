import { EventEmitter } from 'node:events';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LeftUndone,
  Pages,
  fetchNotLoaded,
  onSite,
  openingInWords,
  pageLogPath,
  pagesServed,
} from '../../e2e/diagnosis';
import { vercelParity } from '../../scripts/vite/vercel-parity';

/**
 * What the browser tests use to tell one kind of trouble from another. It decides what fails a test and what a
 * test that ran out of time says for itself, so it is tested here, where no browser is needed.
 */

describe('a download WebKit says it would not begin', () => {
  // Word for word what a test was failed for in CI, three times: Playwright had taken "Fetch API cannot load http"
  // for the error's name and passed on the rest.
  const asPassedOn =
    '/127.0.0.1:4173/immutable/rr.steps.correct-BoltnQ2G.mp3 due to access control checks.';
  const asWebKitSaysIt =
    'Fetch API cannot load http://127.0.0.1:4173/immutable/rr.steps.correct-BoltnQ2G.mp3 due to access control checks.';

  it('is recognised, cut short or whole, by the address that was wanted', () => {
    for (const message of [asPassedOn, asWebKitSaysIt]) {
      expect(fetchNotLoaded(message)).toBe(
        '127.0.0.1:4173/immutable/rr.steps.correct-BoltnQ2G.mp3',
      );
    }
  });

  it('is not mistaken for any other error', () => {
    for (const message of [
      'ChunkLoadError: Could not load "grown-ups".',
      "undefined is not an object (evaluating 'a.b')",
      ' due to access control checks.',
      'Something failed due to access control checks, and more besides',
    ]) {
      expect(fetchNotLoaded(message), message).toBeNull();
    }
  });

  it('is this site’s own only if the address is on the site under test', () => {
    const address = fetchNotLoaded(asPassedOn) ?? '';
    expect(onSite(address, 'http://127.0.0.1:4173')).toBe(true);
    // Another port is another site, and so is a host that only begins the same way, or one named in the path.
    expect(onSite(address, 'http://127.0.0.1:4174')).toBe(false);
    expect(onSite('127.0.0.1:41730/immutable/a.mp3', 'http://127.0.0.1:4173')).toBe(false);
    expect(onSite('elsewhere.example/127.0.0.1:4173/a.mp3', 'http://127.0.0.1:4173')).toBe(false);
    expect(onSite('fonts.example/a.woff2', 'https://training-academy.example')).toBe(false);
    expect(onSite('training-academy.example/robots.txt', 'https://training-academy.example')).toBe(
      true,
    );
  });
});

describe('which page asked for what', () => {
  const HUB = 'http://127.0.0.1:4173/';
  const WORLD = 'http://127.0.0.1:4173/world/robot-ridge';

  it('gives what a page asks for to that page, and holds a cancelled download against it while it is the last', () => {
    const pages = new Pages();
    const hub = pages.ask(HUB);
    pages.arrive(HUB);
    const clip = pages.current;
    expect(clip).toBe(hub);
    // Nothing has been asked for since: a download cancelled now was not cancelled by leaving.
    expect(pages.left(clip)).toBe(false);
    pages.ask(WORLD);
    // The next page has been asked for: what the hub left unfinished was cancelled by leaving it.
    expect(pages.left(clip)).toBe(true);
  });

  it('gives a download begun after the next page was asked for, and before it arrived, to the page being left', () => {
    // The next page is asked for; the page that is still there asks for a clip; the next page arrives.
    const pages = new Pages();
    pages.ask(HUB);
    pages.arrive(HUB);
    const world = pages.ask(WORLD);
    const clip = pages.current;
    expect(clip).not.toBe(world);
    pages.arrive(WORLD);
    expect(pages.left(clip)).toBe(true);
    // And what the new page asks for is its own: cancelled with nothing after it, it counts.
    expect(pages.current).toBe(world);
    expect(pages.left(pages.current)).toBe(false);
  });

  it('does not take moving about inside a page for the arrival of the next one', () => {
    const pages = new Pages();
    pages.ask(HUB);
    pages.arrive(HUB);
    const world = pages.ask(WORLD);
    // The page being left moves on by itself (a link inside the game) while the next is on its way.
    pages.arrive('http://127.0.0.1:4173/grown-ups');
    expect(pages.current).not.toBe(world);
    pages.arrive(WORLD);
    expect(pages.current).toBe(world);
    // Once it has arrived, moving about inside it changes nothing.
    pages.arrive('http://127.0.0.1:4173/world/robot-ridge/play/rr-move-01');
    expect(pages.current).toBe(world);
  });

  it('follows a page that is sent on to another address, and takes no notice of what follows a #', () => {
    const pages = new Pages();
    pages.ask('http://127.0.0.1:4173/old');
    const sentOn = pages.ask(`${WORLD}#top`);
    pages.arrive(WORLD);
    expect(pages.current).toBe(sentOn);
  });

  it('has nobody there before the first page has arrived', () => {
    const pages = new Pages();
    expect(pages.current).toBe(0);
    const first = pages.ask(HUB);
    expect(pages.current).toBe(0);
    pages.arrive(HUB);
    expect(pages.current).toBe(first);
  });
});

describe('what a page left undone', () => {
  const HUB = 'http://127.0.0.1:4173/';
  const WORLD = 'http://127.0.0.1:4173/world/robot-ridge';
  const REFUSED = 'uncaught: /127.0.0.1:4173/immutable/a.mp3 due to access control checks.';
  const CANCELLED = 'request failed: http://127.0.0.1:4173/immutable/a.mp3 (cancelled)';

  const onTheHub = () => {
    const pages = new Pages();
    pages.ask(HUB);
    pages.arrive(HUB);
    return { pages, undone: new LeftUndone(pages) };
  };

  it('lets pass a download WebKit would not begin while the next page was on its way', () => {
    // What failed a test in CI three times: the next page is asked for; the page still there asks for a clip, and
    // WebKit will not begin it; the next page arrives. It is the doing of the page that was left.
    const { pages, undone } = onTheHub();
    pages.ask(WORLD);
    undone.refused(REFUSED);
    expect(undone.held()).toEqual([]);
    pages.arrive(WORLD);
    expect(undone.held()).toEqual([]);
    expect(undone.passed()).toEqual([REFUSED]);
  });

  it('lets it pass whichever the browser reports first, the refusal or the next page', () => {
    const { pages, undone } = onTheHub();
    undone.refused(REFUSED);
    // Nothing has been asked for yet, as far as anyone has been told: it is held, for now.
    expect(undone.held()).toHaveLength(1);
    pages.ask(WORLD);
    pages.arrive(WORLD);
    expect(undone.held()).toEqual([]);
    expect(undone.passed()).toEqual([REFUSED]);
  });

  it('holds a refusal with no page after it against the test, and says which page was there', () => {
    const { undone } = onTheHub();
    undone.refused(REFUSED);
    expect(undone.passed()).toEqual([]);
    expect(undone.held()).toEqual([
      `${REFUSED} (WebKit would not begin this download, and no page was asked for after the one that was there: page 1 of 1)`,
    ]);
  });

  it('holds a refusal said once the next page has arrived against that page', () => {
    const { pages, undone } = onTheHub();
    pages.ask(WORLD);
    pages.arrive(WORLD);
    undone.refused(REFUSED);
    expect(undone.held()).toEqual([
      `${REFUSED} (WebKit would not begin this download, and no page was asked for after the one that was there: page 2 of 2)`,
    ]);
    expect(undone.passed()).toEqual([]);
  });

  it('holds a cancelled download against the page that began it, in its own words, until that page is left', () => {
    const { pages, undone } = onTheHub();
    undone.cancelled(CANCELLED, pages.current);
    expect(undone.held()).toEqual([CANCELLED]);
    expect(undone.passed()).toEqual([]);
    pages.ask(WORLD);
    expect(undone.held()).toEqual([]);
    expect(undone.passed()).toEqual([CANCELLED]);
  });

  it('judges each thing by its own page', () => {
    const { pages, undone } = onTheHub();
    undone.cancelled(CANCELLED, pages.current);
    const world = pages.ask(WORLD);
    pages.arrive(WORLD);
    // The hub's is forgiven; what the world itself began, and had cancelled with nothing after it, is not.
    const own = 'request failed: http://127.0.0.1:4173/immutable/b.mp3 (cancelled)';
    undone.cancelled(own, world);
    expect(undone.held()).toEqual([own]);
    expect(undone.passed()).toEqual([CANCELLED]);
    // And by the page that began it, whichever page is there when its being cancelled is reported.
    const late = 'request failed: http://127.0.0.1:4173/immutable/c.mp3 (cancelled)';
    undone.cancelled(late, 1);
    expect(undone.held()).toEqual([own]);
    expect(undone.passed()).toEqual([CANCELLED, late]);
  });
});

describe('what a page that is opening an activity says it is waiting for', () => {
  it('is nothing where the page is opening nothing', () => {
    expect(openingInWords(null)).toBeNull();
    expect(openingInWords('')).toBeNull();
  });

  it('is put into words for each of the three things an activity waits for, in the order it waits', () => {
    expect(openingInWords('content')).toBe('the world’s content and the code that draws it');
    expect(openingInWords('store')).toBe(
      'the store on the device to open, and to say who is playing',
    );
    expect(openingInWords('sitting')).toBe(
      'the sitting to be found or begun in the store on the device',
    );
  });

  it('passes on a word it does not know, and says that it does not', () => {
    expect(openingInWords('something-new')).toBe(
      '“something-new”, which these tests have no words for',
    );
  });
});

describe('what the server noted of its pages', () => {
  const PORT = 59_871;
  const file = pageLogPath(PORT);
  const SINCE = 1_800_000_000_000;
  const iPad = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
  const write = (notes: object[]) => {
    writeFileSync(file, notes.map((note) => JSON.stringify(note)).join('\n') + '\n');
  };
  afterEach(() => rmSync(file, { force: true }));

  it('says so when there is no note to read', () => {
    expect(pagesServed(PORT, '/', SINCE)).toBe('the server kept no note of its pages');
  });

  it('says that nothing arrived, when nothing did after the page was asked for', () => {
    write([
      { id: 1, path: '/', arrived: SINCE - 9000, agent: iPad },
      { id: 1, path: '/', arrived: SINCE - 9000, answered: SINCE - 8998, agent: iPad },
      { id: 2, path: '/world/number-garden', arrived: SINCE + 20, agent: iPad },
    ]);
    expect(pagesServed(PORT, '/', SINCE)).toBe('no request for / reached the server after that');
  });

  it('says when each arrived, who asked, and whether it was answered', () => {
    write([
      { id: 7, path: '/', arrived: SINCE + 30, agent: iPad },
      { id: 7, path: '/', arrived: SINCE + 30, answered: SINCE + 33, agent: iPad },
      {
        id: 8,
        path: '/',
        arrived: SINCE + 12_400,
        agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
      },
    ]);
    expect(pagesServed(PORT, '/', SINCE)).toBe(
      'requests for / that reached the server after that: ' +
        'at +0.0 s from iPad, answered in 3 ms; at +12.4 s from Macintosh, not answered',
    );
  });

  it('calls a request that seems to arrive a moment before it was made "at once"', () => {
    // Word for word what CI printed the first time this was used: "at +-0.0 s".
    write([{ id: 3, path: '/', arrived: SINCE - 40, answered: SINCE - 40, agent: iPad }]);
    expect(pagesServed(PORT, '/', SINCE)).toBe(
      'requests for / that reached the server after that: at +0.0 s from iPad, answered in 0 ms',
    );
    write([{ id: 3, path: '/', arrived: SINCE - 300, answered: SINCE - 299, agent: iPad }]);
    expect(pagesServed(PORT, '/', SINCE)).toContain('at −0.3 s from iPad, answered in 1 ms');
  });

  it('reads past a line that was half written', () => {
    writeFileSync(
      file,
      `${JSON.stringify({ id: 1, path: '/', arrived: SINCE + 5, answered: SINCE + 6, agent: iPad })}\n{"id":2,"pa`,
    );
    expect(pagesServed(PORT, '/', SINCE)).toContain('at +0.0 s from iPad, answered in 1 ms');
  });
});

describe('the preview server', () => {
  let root: string;
  let log: string;
  type Handler = (req: object, res: object, next: () => void) => void;

  /** The plugin's request handler, as `vite preview` would be given it, over a build that is one page. */
  function handler(): Handler {
    const added: Handler[] = [];
    const hook = vercelParity().configurePreviewServer as unknown as (server: object) => void;
    hook({
      config: { root, build: { outDir: 'dist' } },
      middlewares: { use: (each: Handler) => added.push(each) },
    });
    const [found] = added;
    if (!found) throw new Error('The plugin added no handler.');
    return found;
  }

  function ask(handle: Handler, url: string, agent: string) {
    const res = Object.assign(new EventEmitter(), {
      statusCode: 0,
      setHeader: () => undefined,
      end: () => undefined,
    });
    let passedOn = false;
    handle({ method: 'GET', url, headers: { 'user-agent': agent } }, res, () => {
      passedOn = true;
    });
    return { res, passedOn: () => passedOn };
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'ta-preview-'));
    copyFileSync(join(process.cwd(), 'vercel.json'), join(root, 'vercel.json'));
    mkdirSync(join(root, 'dist'));
    writeFileSync(join(root, 'dist/index.html'), '<!doctype html><title>t</title>');
    writeFileSync(join(root, 'dist/favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    log = join(root, 'pages.log');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  const notes = () =>
    readFileSync(log, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Record<string, unknown>);

  it('notes each page as it arrives and again when it has been answered, and nothing else', () => {
    vi.stubEnv('PREVIEW_PAGE_LOG', log);
    // A note from an earlier run is not carried over.
    writeFileSync(log, '{"id":99}\n');
    const handle = handler();
    expect(notes()).toEqual([]);

    const page = ask(handle, '/world/number-garden?x=1', 'a browser');
    expect(page.res.statusCode).toBe(200);
    expect(notes()).toEqual([
      { id: 1, path: '/world/number-garden', arrived: expect.any(Number), agent: 'a browser' },
    ]);
    page.res.emit('finish');
    expect(notes()).toHaveLength(2);
    expect(notes()[1]).toMatchObject({ id: 1, path: '/world/number-garden', agent: 'a browser' });
    expect(notes()[1]?.answered).toEqual(expect.any(Number));

    // A file is not a page, and neither is something that is not there.
    expect(ask(handle, '/favicon.svg', 'a browser').passedOn()).toBe(true);
    expect(ask(handle, '/immutable/missing.js', 'a browser').res.statusCode).toBe(404);
    expect(notes()).toHaveLength(2);

    // The next page is the second.
    ask(handle, '/', 'another');
    expect(notes()[2]).toMatchObject({ id: 2, path: '/', agent: 'another' });
  });

  it('notes nothing unless it is told where', () => {
    vi.stubEnv('PREVIEW_PAGE_LOG', '');
    const handle = handler();
    const page = ask(handle, '/', 'a browser');
    page.res.emit('finish');
    expect(page.res.statusCode).toBe(200);
    expect(() => readFileSync(log)).toThrow();
  });
});
