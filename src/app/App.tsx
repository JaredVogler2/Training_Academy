import { Suspense, useEffect, useRef, useState } from 'react';
import { WORLDS, worldById } from '@/game/worlds';
import { ErrorBoundary } from './ErrorBoundary';
import { Home } from './Home';
import { TopBar } from './TopBar';
import { Loading, NotFound, Trouble } from './Trouble';
import { lazyView } from './chunks';
import { mark } from './diagnostics';
import { useRoute } from './navigation';
import { toPath, type Route } from './router';
import { pageTitle, ui } from './strings';
import styles from './App.module.css';

// Each of these is its own chunk, fetched the first time it is needed.
const WorldView = lazyView('world', () => import('@/game/world/WorldView'));
const LessonView = lazyView('lesson', () => import('@/game/lesson/LessonView'));
const GrownUps = lazyView('grown-ups', () => import('@/parent/GrownUps'));
const Studio = lazyView('studio', () => import('@/render/hub3d/Studio'));
const GuideSheet = lazyView('guide-sheet', () => import('@/ui/GuideSheet'));

function titleOf(route: Route): string {
  switch (route.name) {
    case 'home':
      return pageTitle();
    case 'world':
    case 'play':
      return pageTitle(worldById(route.world).name);
    case 'grown-ups':
      return pageTitle(ui.grownUps);
    case 'studio':
      return pageTitle('Studio');
    case 'not-found':
      return pageTitle(ui.notFoundTitle);
  }
}

function RouteView({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <Home />;
    case 'world':
      return <WorldView world={route.world} />;
    case 'play':
      return <LessonView world={route.world} lessonId={route.lessonId} />;
    case 'grown-ups':
      return <GrownUps />;
    case 'studio':
      return null;
    case 'not-found':
      return <NotFound />;
  }
}

export function App() {
  const route = useRoute();
  const path = toPath(route);
  const main = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    mark('shell-ready');
  }, []);

  // After a navigation: name the page, tell assistive technology, and move focus to the new content.
  useEffect(() => {
    const title = titleOf(route);
    document.title = title;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setAnnouncement(title);
    main.current?.focus({ preventScroll: true });
    // `route` is identified by `path`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  // The studio is a workbench, not a page of the game: it stands alone, without the shell around it.
  if (route.name === 'studio') {
    return (
      <Suspense fallback={null}>
        {route.view === 'guide' ? <GuideSheet /> : <Studio view={route.view} />}
      </Suspense>
    );
  }

  return (
    <div className={styles.app} data-route={route.name}>
      <a
        className={styles.skip}
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        {ui.skipToContent}
      </a>
      {/* An activity has the whole screen: its own bar has the way home, and pause has the two switches. */}
      {route.name !== 'play' && <TopBar route={route} />}
      <main id="main" ref={main} tabIndex={-1} className={styles.main}>
        <ErrorBoundary
          resetKey={path}
          fallback={(error, retry) => <Trouble error={error} retry={retry} />}
        >
          <Suspense fallback={<Loading />}>
            {/* Keyed by address: each page arrives softly, and none inherits another's state. */}
            <div key={path} className={styles.view}>
              <RouteView route={route} />
            </div>
          </Suspense>
        </ErrorBoundary>
      </main>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}

/** Every world is known up front, so a mistyped world id is a 404 rather than a blank page. */
export const KNOWN_WORLD_COUNT = WORLDS.length;
