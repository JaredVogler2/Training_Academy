import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { settingsStore, useReducedMotion } from '@/app/settings';
import { ui } from '@/app/strings';
import { addVoice, audio, playCue, voice } from '@/audio';
import {
  KEYS,
  askOf,
  choicesAt,
  everyLine,
  nameOf,
  nextTurn,
  pageLines,
  pagesOf,
  type Story,
} from '@/content/explorer-harbor/storymaker';
import type { Seconds } from '@/game/lesson/script';
import { useScript } from '@/game/lesson/useScript';
import { worldById } from '@/game/worlds';
import { Guide, type GuideState } from '@/ui/Guide';
import { ActionButton, ActionLink } from '@/ui/controls';
import {
  IconBack,
  IconPlus,
  IconReplay,
  IconSayAgain,
  IconSoundOff,
  IconSoundOn,
} from '@/ui/icons';
import { StoryPicture } from './storyScenes';
import { storyText } from './storyText';
import {
  askAgainScript,
  linesAhead,
  momentScript,
  openPage,
  pageScript,
  retellScript,
  toldPage,
} from './telling';
import { voice as bank } from './voice';
import styles from './storyRoom.module.css';

const WORLD = 'explorer-harbor';
const PAGES = [1, 2, 3] as const;

/**
 * What the room is playing: what follows the last choice, the question again, the whole story, or one page.
 * `count` tells one asking from the next, so that the same thing asked for twice is played twice.
 */
type Playing =
  | { kind: 'moment' | 'again' | 'retell'; count: number }
  | { kind: 'page'; page: number; count: number };

/** Whether the page is in front of someone: nothing is told to a phone that has been put down. */
function useInSight(): boolean {
  const [seen, setSeen] = useState(() => document.visibilityState !== 'hidden');
  useEffect(() => {
    const look = () => setSeen(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', look);
    return () => document.removeEventListener('visibilitychange', look);
  }, []);
  return seen;
}

/**
 * The book: one page of the story at a time, and a leaf that turns when the page changes. Going on, the page
 * that was there turns away over the spine and the next is under it; going back, the earlier page turns in over
 * the one that was there. Where motion is reduced the stylesheet shows no leaf, and the page simply changes.
 */
function Book({ story, page }: { story: Story; page: number }) {
  const [held, setHeld] = useState({ page, from: page, turn: 0 });
  if (held.page !== page) setHeld({ page, from: held.page, turn: held.turn + 1 });
  const turning = held.from !== held.page;
  const back = turning && held.page < held.from;
  return (
    <div
      className={styles.pages}
      data-testid="story-pages"
      data-turning={turning ? (back ? 'back' : 'on') : 'no'}
    >
      {/* What ends up underneath: the page turned to, or, going back, the page being covered. */}
      <StoryPicture story={story} page={back ? held.from : held.page} className={styles.page} />
      {turning && (
        <div
          key={held.turn}
          className={styles.leaf}
          data-way={back ? 'back' : 'on'}
          onAnimationEnd={() => setHeld((was) => ({ ...was, from: was.page }))}
        >
          <StoryPicture story={story} page={back ? held.page : held.from} className={styles.page} />
        </div>
      )}
    </div>
  );
}

function moodOf(telling: boolean, whole: boolean): { mood: GuideState; aim: number } {
  if (telling) return { mood: 'point', aim: 112 };
  return whole ? { mood: 'celebrate', aim: 90 } : { mood: 'think', aim: 90 };
}

/**
 * Explorer Harbor's room for making a story. Five choices, each made by tapping a picture: who it is about,
 * where it happens, what they want, what goes wrong, and how it comes right. The first three make the first
 * page of a book, the fourth the second and the fifth the third; each page is turned to and told as it is made,
 * and the whole can be told again, or a page at a time.
 *
 * Nothing here is right or wrong, nothing is counted, and nothing is kept: a story lasts until another is begun
 * or the room is left. Whether a child told it back in their own words is for a grown-up to say, on the world's
 * page.
 */
export default function StoryRoom() {
  const info = worldById(WORLD);
  const calm = useReducedMotion();
  const seen = useInSight();
  const sound = useSyncExternalStore(audio().subscribe, () => audio().state);
  const [story, setStory] = useState<Story>({});
  const [playing, setPlaying] = useState<Playing>({ kind: 'moment', count: 0 });
  const count = useRef(0);
  const answers = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);

  // The room can be the first thing opened: the lines it says are made known to the voice here.
  useEffect(() => addVoice(bank), []);
  const lines = useMemo(() => everyLine(), []);

  const turn = nextTurn(story);
  const whole = turn === null;
  const choices = choicesAt(story);

  // Whatever may be said next is fetched now: the question, and the page each choice would make.
  useEffect(() => {
    const ahead = new Set(linesAhead(story));
    const next = nextTurn(story);
    if (next !== null) {
      for (const id of choicesAt(story)) {
        for (const key of linesAhead({ ...story, [next]: id })) ahead.add(key);
      }
    }
    voice().prepare([...ahead]);
  }, [story, sound]);

  // How long a line lasts is known only once the audio is awake: a script written before the first touch is
  // written again after it, and then says what it could not.
  const script = useMemo(() => {
    const seconds: Seconds = sound === 'ready' ? voice().seconds : () => 0;
    switch (playing.kind) {
      case 'moment':
        return momentScript(story, seconds);
      case 'again':
        return askAgainScript(story, seconds);
      case 'retell':
        return retellScript(story, seconds);
      case 'page':
        return pageScript(story, playing.page, seconds);
    }
  }, [story, playing, sound]);
  const run = `${JSON.stringify(story)}|${JSON.stringify(playing)}|${sound}`;
  const { beat } = useScript(script, run, seen, calm);

  const told = toldPage(beat);
  const telling = told !== null;
  const page = told?.page ?? openPage(beat) ?? Math.max(1, pagesOf(story));
  const { mood, aim } = moodOf(telling, whole);
  const heard = sound !== 'muted';
  const next = () => {
    count.current += 1;
    return count.current;
  };

  const choose = (id: string) => {
    if (turn === null) return;
    playCue('tap');
    refocus.current = answers.current?.contains(document.activeElement) ?? false;
    setStory({ ...story, [turn]: id });
    setPlaying({ kind: 'moment', count: next() });
  };

  // Whoever was choosing with the keyboard is not left holding nothing when the choices change: the keyboard is
  // handed to the first thing there is to press next.
  const offered = telling ? 'telling' : (turn ?? 'whole');
  useEffect(() => {
    if (!refocus.current || offered === 'telling') return;
    refocus.current = false;
    answers.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
  }, [offered]);

  const question = askOf(story);
  const said = (key: string | null) => (key === null ? '' : (lines[key] ?? ''));
  return (
    <article
      className={styles.room}
      data-role={info.role}
      data-testid="story-room"
      data-turn={turn ?? 'whole'}
      data-telling={telling}
      data-page={page}
    >
      <div className={styles.bar}>
        <ActionLink
          to={{ name: 'world', world: WORLD }}
          round
          icon={<IconBack />}
          className={styles.barButton}
          aria-label={storyText.back}
          data-tip={storyText.back}
          data-tip-align="start"
        />
        <h1 className={styles.title}>{info.room?.title}</h1>
        {/* The sound, on or off: a grown-up who wants a child to tell the story themselves switches it off,
            and the small pages then turn without a word. */}
        <ActionButton
          round
          tone={heard ? 'sun' : 'plain'}
          className={styles.barButton}
          icon={heard ? <IconSoundOn /> : <IconSoundOff />}
          aria-pressed={heard}
          aria-label={ui.sound}
          data-tip={heard ? ui.soundOn : ui.soundOff}
          data-tip-align="end"
          onClick={() => {
            settingsStore().set({ sound: !heard });
            if (!heard) audio().unlock();
            // Whatever was last told is not told over again because the sound has changed: switched on, the
            // room says where the story has got to (the question, or what to do with a whole story);
            // switched off, it does nothing.
            setPlaying({ kind: 'again', count: next() });
          }}
        />
      </div>

      <figure className={styles.book} data-testid="story-book">
        <Book story={story} page={page} />
        <figcaption className={styles.told} data-selectable aria-live="polite">
          {pageLines(story, page).map((key, index) => (
            // The line that is being said is marked: only where it can be heard, or the mark says nothing.
            <span key={key} data-now={told?.line === index && voice().seconds(key) > 0}>
              {said(key)}{' '}
            </span>
          ))}
        </figcaption>
      </figure>

      {/* The three pages, small: which have been made, and which is open. Once the story is whole each is a
          way to turn to its page and hear it. */}
      <ol className={styles.strip} aria-label={storyText.pages}>
        {PAGES.map((number) => {
          // The first page is there from the moment someone is on it: it is put together as it is chosen.
          const made = number <= pagesOf(story) || (number === 1 && story.who !== undefined);
          return (
            <li key={number}>
              <button
                type="button"
                className={styles.panel}
                data-panel={number}
                data-made={made}
                aria-current={number === page ? 'page' : undefined}
                aria-label={storyText.page(number)}
                disabled={!whole}
                onClick={() => {
                  playCue('tap');
                  setPlaying({ kind: 'page', page: number, count: next() });
                }}
              >
                {made && <StoryPicture story={story} page={number} />}
              </button>
            </li>
          );
        })}
      </ol>

      <div className={styles.foot}>
        <button
          type="button"
          className={styles.again}
          aria-label={storyText.sayAgain}
          data-tip={storyText.sayAgain}
          data-tip-side="top"
          data-tip-align="start"
          onClick={() => {
            playCue('tap');
            // While something is being told, it is told again from its beginning; otherwise it is the
            // question that is said again, and no page with it.
            setPlaying(telling ? { ...playing, count: next() } : { kind: 'again', count: next() });
          }}
        >
          <Guide state={mood} aim={aim} className={styles.guide} />
          <span className={styles.againBadge} aria-hidden="true">
            <IconSayAgain size={22} />
          </span>
        </button>
        <p className={styles.caption} role="status" aria-live="polite" data-quiet={telling}>
          {telling ? '' : said(question ?? KEYS.whole)}
        </p>
      </div>

      <div className={styles.answers} ref={answers} data-testid="story-answers" data-whole={whole}>
        {!telling &&
          turn !== null &&
          choices.map((id) => {
            // The picture of a choice is the page the story would have if it were chosen.
            const after = { ...story, [turn]: id };
            return (
              <button
                key={`${turn}-${id}`}
                type="button"
                className={styles.choice}
                data-choice={id}
                aria-label={nameOf(turn, story, id)}
                onClick={() => choose(id)}
              >
                <StoryPicture story={after} page={Math.max(1, pagesOf(after))} />
              </button>
            );
          })}
        {!telling && whole && (
          <>
            <ActionButton
              tone="sun"
              big
              className={styles.more}
              icon={<IconReplay size={30} />}
              aria-label={storyText.againName}
              data-more="again"
              onClick={() => {
                playCue('step');
                refocus.current = answers.current?.contains(document.activeElement) ?? false;
                setPlaying({ kind: 'retell', count: next() });
              }}
            >
              {storyText.again}
            </ActionButton>
            <ActionButton
              big
              className={styles.more}
              icon={<IconPlus size={30} />}
              aria-label={storyText.anotherName}
              data-more="another"
              onClick={() => {
                playCue('step');
                refocus.current = answers.current?.contains(document.activeElement) ?? false;
                setStory({});
                setPlaying({ kind: 'moment', count: next() });
              }}
            >
              {storyText.another}
            </ActionButton>
          </>
        )}
      </div>
    </article>
  );
}
