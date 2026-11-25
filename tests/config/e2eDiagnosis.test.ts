import { EventEmitter } from 'node:events';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchNotLoaded, pageLogPath, pagesServed } from '../../e2e/diagnosis';
import { vercelParity } from '../../scripts/vite/vercel-parity';

/**
 * What the browser tests use to tell one kind of trouble from another. It decides what fails a test and what a
 * test that ran out of time says for itself, so it is tested here, where no browser is needed.
 */

describe('a download WebKit says it could not load', () => {
  // Word for word what a test was failed for in CI: Playwright had taken "Fetch API cannot load http" for the
  // error's name and passed on the rest.
  const asPassedOn =
    '/127.0.0.1:4173/immutable/rr.steps.correct-BoltnQ2G.mp3 due to access control checks.';
  const asWebKitSaysIt =
    'Fetch API cannot load http://127.0.0.1:4173/immutable/rr.steps.correct-BoltnQ2G.mp3 due to access control checks.';
  const asked = 'http://127.0.0.1:4173/immutable/rr.steps.correct-BoltnQ2G.mp3';

  it('is recognised, cut short or whole, as the address that was asked for', () => {
    for (const message of [asPassedOn, asWebKitSaysIt]) {
      const address = fetchNotLoaded(message);
      expect(address).toBe('127.0.0.1:4173/immutable/rr.steps.correct-BoltnQ2G.mp3');
      expect(asked.endsWith(address ?? 'no')).toBe(true);
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
