import {
  KEYS,
  askOf,
  nextTurn,
  pageLines,
  pagesOf,
  type Story,
} from '@/content/explorer-harbor/storymaker';
import { REST, Writer, type Beat, type Script, type Seconds } from '@/game/lesson/script';

/**
 * What the room for making a story shows and says, moment by moment: the page a choice has just made, turned to
 * and told; the question that comes next; the whole story told again from the beginning. Scripts, like a
 * lesson's, so that they can be read and tested apart from the screen that plays them.
 *
 * Nothing here decides anything, and there is nothing to decide: every choice is a good one.
 */

/** How long a page takes to turn (ms). The stylesheet's turn takes as long. */
export const TURN_TIME = 700;
/** How long a page is left to be looked at, when a story is told again and its lines cannot be heard (ms). */
export const LOOK_TIME = 2600;
/** A breath between the end of a page and the turn to the next (ms). */
const BREATH = 350;

/** The beat that shows one page of the book; with `line`, while that line of the page is being said. */
export const pageBeat = (page: number, line?: number): Beat =>
  line === undefined
    ? { show: 'name', which: `page-${String(page)}` }
    : { show: 'name', which: `page-${String(page)}`, part: line };

/** The beat at which the question is put, and what there is to choose from is offered. */
export const ASKING: Beat = { show: 'ask' };

/** The book lying open at a page with nothing being told: where a page that was asked for comes to rest. */
export const openAt = (page: number): Beat => ({ show: 'do', parts: page });

/** The page a beat is telling, if it is telling one, and which of its lines is being said (`null`: none yet). */
export function toldPage(beat: Beat): { page: number; line: number | null } | null {
  if (beat.show !== 'name') return null;
  const page = /^page-([123])$/.exec(beat.which)?.[1];
  return page === undefined ? null : { page: Number(page), line: beat.part ?? null };
}

/** The page a beat leaves the book open at, if it says. */
export function openPage(beat: Beat): number | null {
  return beat.show === 'do' && beat.parts >= 1 && beat.parts <= 3 ? beat.parts : null;
}

/** The page the last choice of a story made, if it made one: the third choice makes the first page. */
export function pageMadeBy(story: Story): number {
  const turn = nextTurn(story);
  if (turn === 'trouble') return 1;
  if (turn === 'ending') return 2;
  return turn === null ? 3 : 0;
}

/**
 * A page turned to, and each of its lines said in turn. With `dwell`, a page none of whose lines can be heard
 * is left open long enough to be looked at, or read aloud by someone: without it the pages of a story told
 * again would go by as fast as they turn.
 */
function tell(script: Writer, story: Story, page: number, dwell: boolean): void {
  script.beat(pageBeat(page)).wait(TURN_TIME);
  const keys = pageLines(story, page);
  keys.forEach((key, index) => {
    script.beat(pageBeat(page, index)).say(key);
  });
  if (dwell && !keys.some((key) => script.spoken(key) > 0)) script.wait(LOOK_TIME);
}

/**
 * What follows a choice: the page it made, if it made one, turned to and told; and then the next question, or,
 * when the story is whole, what there is to do with it. With nothing chosen yet it is the first question.
 *
 * It plays where motion is reduced too: it is what the room is for. (The page then changes without turning.)
 */
export function momentScript(story: Story, seconds: Seconds): Script {
  const script = new Writer(seconds).essential();
  const made = pageMadeBy(story);
  if (made > 0) tell(script, story, made, false);
  const ask = askOf(story);
  script.wait(made > 0 ? BREATH : 250).beat(ASKING);
  script.say(ask ?? KEYS.whole);
  return script.end(REST);
}

/** The question said again, and nothing else: for whoever taps Glim. */
export function askAgainScript(story: Story, seconds: Seconds): Script {
  const script = new Writer(seconds).essential();
  script
    .wait(150)
    .beat(ASKING)
    .say(askOf(story) ?? KEYS.whole);
  return script.end(REST);
}

/** A whole story told again from its first page, a page at a time. */
export function retellScript(story: Story, seconds: Seconds): Script {
  const script = new Writer(seconds).essential();
  script.beat(pageBeat(1)).wait(TURN_TIME).say(KEYS.told);
  for (let page = 1; page <= pagesOf(story); page++) {
    if (page > 1) script.wait(BREATH);
    tell(script, story, page, true);
  }
  return script.wait(BREATH).end(REST);
}

/** One page of a story turned to and told, by itself: for whoever taps it. */
export function pageScript(story: Story, page: number, seconds: Seconds): Script {
  const script = new Writer(seconds).essential();
  tell(script, story, page, false);
  // The book stays where it was turned to.
  return script.end(openAt(page));
}

/** Every line a story may still want said from here on: fetched ahead, so that each starts on time. */
export function linesAhead(story: Story): string[] {
  const keys = new Set<string>([KEYS.told, KEYS.whole]);
  const ask = askOf(story);
  if (ask !== null) keys.add(ask);
  for (let page = 1; page <= pagesOf(story); page++) {
    for (const key of pageLines(story, page)) keys.add(key);
  }
  return [...keys];
}
