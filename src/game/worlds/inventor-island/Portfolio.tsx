import { useEffect, useState } from 'react';
import { loadChunk } from '@/app/chunks';
import { Link } from '@/app/navigation';
import { useReducedMotion } from '@/app/settings';
import { loadPack } from '@/content';
import { lessonCalled } from '@/content/lessonList';
import { testSetup } from '@/engine';
import { dayInWords } from '@/game/dates';
import { triedOn } from '@/game/placement';
import { activeProfile, refreshProfiles, useProfiles } from '@/game/profiles';
import { getRepository } from '@/game/services';
import { worldById } from '@/game/worlds';
import { ActionLink } from '@/ui/controls';
import { IconBack } from '@/ui/icons';
import { TEST_TIME } from './geometry';
import { portfolioOf, type Page } from './portfolio';
import { SceneView } from './scenes';
import { describe, portfolioText } from './words';
import styles from './portfolio.module.css';

const WORLD = 'inventor-island';

/**
 * The portfolio: one card for each workbench, with the last thing this child mended there, drawn from the very
 * answer they handed in. A tap tests it again, to watch. Where nothing has been mended yet, the card shows what is
 * waiting to be, and leads to it.
 *
 * Nothing is asked here and nothing is written down. Under each picture, for the grown-up, is when it was made,
 * how the guesses went, and what they have said was tried away from the screen: in those words, because the game
 * saw none of that.
 */

type Loaded =
  { status: 'loading' } | { status: 'failed'; error: Error } | { status: 'ready'; pages: Page[] };

function usePages(): Loaded {
  const { status, activeId } = useProfiles();
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  // This page can be the first thing opened: it finds out who is playing if nobody has.
  useEffect(() => {
    if (status === 'loading') void refreshProfiles();
  }, [status]);
  useEffect(() => {
    if (status !== 'ready') return;
    let current = true;
    Promise.all([
      loadChunk(`content:${WORLD}`, () => loadPack(WORLD)),
      activeId === null
        ? Promise.resolve([])
        : getRepository().then((repository) => repository.listAttempts(activeId)),
    ]).then(
      ([pack, attempts]) => {
        if (current) setLoaded({ status: 'ready', pages: portfolioOf(pack, attempts) });
      },
      (error: unknown) => {
        if (current) {
          setLoaded({
            status: 'failed',
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    );
    return () => {
      current = false;
    };
  }, [status, activeId]);
  return loaded;
}

function Card({ page, tried }: { page: Page; tried: string | undefined }) {
  const calm = useReducedMotion();
  const name = lessonCalled(page.lessonId)?.title ?? page.lessonId;
  // Each tap is a test of its own: the picture is made afresh, so a second tap starts it over.
  const [test, setTest] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setPlaying(false), TEST_TIME + 150);
    return () => window.clearTimeout(timer);
  }, [playing, test]);
  const { invention, toMend } = page;
  const outcome = invention ? testSetup(invention.bench, invention.setup)?.outcome : undefined;
  return (
    <li className={styles.card} data-lesson={page.lessonId} data-made={invention !== null}>
      {invention ? (
        <button
          type="button"
          className={styles.picture}
          aria-label={portfolioText.testAgain(name)}
          data-testing={playing}
          onClick={() => {
            // Where motion is reduced the test is not played: the picture is of how it came out, and stays.
            if (calm) return;
            setTest((count) => count + 1);
            setPlaying(true);
          }}
        >
          <SceneView
            key={test}
            scene={invention.bench}
            setup={invention.setup}
            phase={playing ? 'testing' : 'after'}
          />
          <span className="sr-only">
            {describe({
              type: 'scene',
              scene: invention.bench,
              of: outcome === undefined ? invention.setup : { ...invention.setup, shown: outcome },
            })}
          </span>
        </button>
      ) : (
        <Link
          to={{ name: 'play', world: WORLD, lessonId: page.lessonId }}
          className={styles.picture}
          data-empty="true"
          aria-label={portfolioText.play(name)}
        >
          {toMend && <SceneView scene={toMend.bench} setup={toMend.setup} phase="before" />}
        </Link>
      )}
      <h2 className={styles.name}>{name}</h2>
      <div className={styles.lines} data-selectable>
        <p>{invention ? portfolioText.made(dayInWords(invention.day)) : portfolioText.notYet}</p>
        <p>{portfolioText.guesses(page.guesses, page.cameTrue)}</p>
        {tried !== undefined && (
          <p data-testid="tried-away">{portfolioText.tried(dayInWords(tried))}</p>
        )}
      </div>
    </li>
  );
}

export default function Portfolio() {
  const info = worldById(WORLD);
  const player = activeProfile(useProfiles());
  const loaded = usePages();
  if (loaded.status === 'failed') throw loaded.error;
  return (
    <article className={styles.page} data-role={info.role} data-testid="portfolio">
      <div className={styles.bar}>
        <ActionLink
          to={{ name: 'world', world: WORLD }}
          round
          icon={<IconBack />}
          className={styles.barButton}
          aria-label={portfolioText.back}
          data-tip={portfolioText.back}
          data-tip-align="start"
        />
        <h1 className={styles.title}>{info.room?.title}</h1>
        <span />
      </div>
      {loaded.status === 'ready' && (
        <ol className={styles.cards}>
          {loaded.pages.map((page) => (
            <Card key={page.lessonId} page={page} tried={triedOn(player, page.lessonId)} />
          ))}
        </ol>
      )}
      <p className={styles.about} data-selectable>
        {player ? portfolioText.about(player.name) : portfolioText.nobody}
      </p>
    </article>
  );
}
