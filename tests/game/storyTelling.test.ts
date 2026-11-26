import { describe, expect, it } from 'vitest';
import {
  KEYS,
  askOf,
  choicesAt,
  everyLine,
  everyStory,
  nextTurn,
  pageLines,
  type Story,
} from '@/content/explorer-harbor/storymaker';
import type { Beat, Script } from '@/game/lesson/script';
import {
  ASKING,
  LOOK_TIME,
  TURN_TIME,
  askAgainScript,
  linesAhead,
  momentScript,
  openAt,
  openPage,
  pageBeat,
  pageMadeBy,
  pageScript,
  retellScript,
  toldPage,
} from '@/game/worlds/explorer-harbor/telling';

/**
 * What the room for making a story shows and says after each choice, as scripts: read here without a screen.
 * Two voices are tried: one that says every line in two seconds, and none at all, because the room has to work
 * with the sound off and the pages must still turn, in order, and stay to be looked at.
 */

const TWO = () => 2;
const NONE = () => 0;

const said = (script: Script): string[] =>
  script.moments.flatMap((moment) => (moment.sound?.kind === 'say' ? [moment.sound.key] : []));
const beats = (script: Script): { at: number; beat: Beat }[] =>
  script.moments.flatMap((moment) => (moment.beat ? [{ at: moment.at, beat: moment.beat }] : []));
const when = (script: Script, key: string): number =>
  script.moments.find((moment) => moment.sound?.kind === 'say' && moment.sound.key === key)?.at ??
  -1;

const fox: Story = { who: 'fox' };
const atBeach: Story = { who: 'fox', where: 'beach' };
const kite: Story = { ...atBeach, seed: 'kite' };
const noWind: Story = { ...kite, trouble: 'no-wind' };
const whole: Story = { ...noWind, ending: 'run' };

/** Every story as far as it can have been chosen: nothing, and every step of every way through. */
function everyStage(): Story[] {
  const stages: Story[] = [];
  const grow = (story: Story) => {
    stages.push(story);
    const turn = nextTurn(story);
    if (turn !== null) for (const id of choicesAt(story)) grow({ ...story, [turn]: id });
  };
  grow({});
  return stages;
}

describe('what follows a choice', () => {
  it('is the first question, with nothing chosen: and what there is to choose from is there at once', () => {
    const script = momentScript({}, TWO);
    expect(said(script)).toEqual([KEYS.who]);
    expect(beats(script).map((found) => found.beat)).toEqual([ASKING, { show: 'rest' }]);
    // Nothing is being told before the question: nothing is held back from a child who is ready to choose.
    expect(beats(script).some((found) => toldPage(found.beat) !== null)).toBe(false);
  });

  it('is only the next question while the first page is still being put together', () => {
    expect(said(momentScript(fox, TWO))).toEqual([KEYS.where]);
    expect(said(momentScript(atBeach, TWO))).toEqual(['eh.make.want.fox']);
    expect(pageMadeBy({})).toBe(0);
    expect(pageMadeBy(fox)).toBe(0);
    expect(pageMadeBy(atBeach)).toBe(0);
  });

  it('turns to the page a choice has made, tells it line by line, and then puts the next question', () => {
    expect(pageMadeBy(kite)).toBe(1);
    const script = momentScript(kite, TWO);
    expect(said(script)).toEqual([
      'eh.make.went.fox.beach',
      'eh.make.wanted.fox.kite',
      KEYS.trouble,
    ]);
    const shown = beats(script);
    // The page is turned to from the very first moment, and its first line waits for the turn.
    expect(shown[0]).toEqual({ at: 0, beat: pageBeat(1) });
    expect(shown[1]).toEqual({ at: TURN_TIME, beat: pageBeat(1, 0) });
    expect(when(script, 'eh.make.went.fox.beach')).toBe(TURN_TIME);
    // The second line begins when the first is over, and the question when the second is.
    expect(when(script, 'eh.make.wanted.fox.kite')).toBeGreaterThanOrEqual(TURN_TIME + 2000);
    expect(when(script, KEYS.trouble)).toBeGreaterThanOrEqual(TURN_TIME + 4000);
    const asked = shown.find((found) => found.beat.show === 'ask');
    expect(asked?.at).toBe(when(script, KEYS.trouble));
  });

  it('tells the second page and asks for an ending; tells the third and says the story is whole', () => {
    expect(pageMadeBy(noWind)).toBe(2);
    expect(said(momentScript(noWind, TWO))).toEqual(['eh.make.but.kite.no-wind', KEYS.ending]);
    expect(pageMadeBy(whole)).toBe(3);
    expect(said(momentScript(whole, TWO))).toEqual([
      'eh.make.so.kite.no-wind.run',
      'eh.make.happy.fox',
      KEYS.whole,
    ]);
  });

  it('offers nothing to choose from while a page is being told, at any step of any story', () => {
    const stages = everyStage();
    // 1 + 3 + 9 + 18 + 36 + 72: nothing chosen, and every step of every way through.
    expect(stages).toHaveLength(139);
    for (const story of stages) {
      const script = momentScript(story, TWO);
      const shown = beats(script);
      const asked = shown.findIndex((found) => found.beat.show === 'ask');
      expect(asked, JSON.stringify(story)).toBeGreaterThanOrEqual(0);
      // Before the question every beat is a page being told, of the page this choice made and no other.
      for (const found of shown.slice(0, asked)) {
        expect(toldPage(found.beat)?.page, JSON.stringify(story)).toBe(pageMadeBy(story));
      }
      // After it nothing is told: the room is waiting.
      for (const found of shown.slice(asked)) expect(toldPage(found.beat)).toBeNull();
      expect(script.settled).toEqual({ show: 'rest' });
      // And it always says something last that can be acted on: a question, or what to do with a whole story.
      expect(said(script).at(-1)).toBe(askOf(story) ?? KEYS.whole);
    }
  });

  it('says only lines that exist, whatever was chosen', () => {
    const lines = everyLine();
    for (const story of everyStage()) {
      for (const key of said(momentScript(story, TWO)))
        expect(lines[key], key).toBeTypeOf('string');
    }
  });

  it('with no voice, still turns to the page, and the question follows as soon as it has turned', () => {
    const script = momentScript(kite, NONE);
    // The lines are still asked for, in order: a voice that wakes half-way says the rest.
    expect(said(script)).toEqual([
      'eh.make.went.fox.beach',
      'eh.make.wanted.fox.kite',
      KEYS.trouble,
    ]);
    const asked = beats(script).find((found) => found.beat.show === 'ask');
    expect(asked?.at).toBeGreaterThanOrEqual(TURN_TIME);
    expect(asked?.at).toBeLessThan(TURN_TIME + 1000);
  });

  it('plays where less motion is asked for: it is what the room is for', () => {
    for (const script of [
      momentScript(kite, TWO),
      askAgainScript(kite, TWO),
      retellScript(whole, TWO),
      pageScript(whole, 2, TWO),
    ]) {
      expect(script.essential).toBe(true);
    }
  });
});

describe('the question, said again', () => {
  it('is the question and nothing else: no page is told a second time', () => {
    const script = askAgainScript(noWind, TWO);
    expect(said(script)).toEqual([KEYS.ending]);
    expect(beats(script).some((found) => toldPage(found.beat) !== null)).toBe(false);
  });

  it('is what there is to do with it, once the story is whole', () => {
    expect(said(askAgainScript(whole, TWO))).toEqual([KEYS.whole]);
  });
});

describe('a whole story, told again', () => {
  it('goes from the first page to the last, every line in order, after saying that it will', () => {
    for (const story of everyStory()) {
      const script = retellScript(story, TWO);
      expect(said(script), JSON.stringify(story)).toEqual([
        KEYS.told,
        ...pageLines(story, 1),
        ...pageLines(story, 2),
        ...pageLines(story, 3),
      ]);
      const pages = beats(script).flatMap((found) => {
        const told = toldPage(found.beat);
        return told ? [told.page] : [];
      });
      // The first page is open from the first moment: it is over that page that the telling is announced.
      expect(beats(script)[0], JSON.stringify(story)).toEqual({ at: 0, beat: pageBeat(1) });
      expect(when(script, KEYS.told)).toBe(TURN_TIME);
      // Each page in turn, never back to one that has been told.
      expect([...new Set(pages)]).toEqual([1, 2, 3]);
      expect(pages).toEqual([...pages].sort());
      expect(script.settled).toEqual({ show: 'rest' });
    }
  });

  it('with no voice, leaves each page open long enough to be looked at', () => {
    const script = retellScript(whole, NONE);
    const turned = [1, 2, 3].map(
      (page) => beats(script).find((found) => toldPage(found.beat)?.page === page)?.at ?? -1,
    );
    expect(turned[0]).toBe(0);
    expect((turned[1] ?? 0) - (turned[0] ?? 0)).toBeGreaterThanOrEqual(TURN_TIME + LOOK_TIME);
    expect((turned[2] ?? 0) - (turned[1] ?? 0)).toBeGreaterThanOrEqual(TURN_TIME + LOOK_TIME);
    expect(script.length - (turned[2] ?? 0)).toBeGreaterThanOrEqual(TURN_TIME + LOOK_TIME);
  });

  it('with a voice, does not wait beyond the words', () => {
    const heard = retellScript(whole, TWO);
    // Six lines of two seconds, three turns, and breaths: well under what silence would be given.
    expect(heard.length).toBeLessThan(6 * 2000 + 3 * TURN_TIME + 3000);
  });
});

describe('one page, asked for', () => {
  it('is turned to and told, and the book is left open at it', () => {
    const script = pageScript(whole, 2, TWO);
    expect(said(script)).toEqual(['eh.make.but.kite.no-wind']);
    expect(script.settled).toEqual(openAt(2));
    expect(openPage(script.settled)).toBe(2);
    expect(beats(script)[0]).toEqual({ at: 0, beat: pageBeat(2) });
  });

  it('says nothing for a page that has not been made', () => {
    expect(said(pageScript(kite, 3, TWO))).toEqual([]);
  });
});

describe('what a beat means to the book', () => {
  it('is a page being told, with the line being said; or a page lying open; or neither', () => {
    expect(toldPage(pageBeat(2))).toEqual({ page: 2, line: null });
    expect(toldPage(pageBeat(3, 1))).toEqual({ page: 3, line: 1 });
    expect(toldPage({ show: 'rest' })).toBeNull();
    expect(toldPage(ASKING)).toBeNull();
    // A picture lifted in a lesson is not a page of this book.
    expect(toldPage({ show: 'name', which: 'prompt' })).toBeNull();
    expect(toldPage({ show: 'name', which: 'page-4' })).toBeNull();
    expect(openPage(openAt(1))).toBe(1);
    expect(openPage({ show: 'do', parts: 0 })).toBeNull();
    expect(openPage({ show: 'do', parts: 4 })).toBeNull();
    expect(openPage(pageBeat(1))).toBeNull();
  });
});

describe('the lines fetched ahead', () => {
  it('are the question that is coming and every line of every page made so far', () => {
    expect(linesAhead({})).toEqual(expect.arrayContaining([KEYS.who, KEYS.told, KEYS.whole]));
    expect(linesAhead(noWind)).toEqual(
      expect.arrayContaining([
        KEYS.ending,
        'eh.make.went.fox.beach',
        'eh.make.wanted.fox.kite',
        'eh.make.but.kite.no-wind',
      ]),
    );
    expect(new Set(linesAhead(whole)).size).toBe(linesAhead(whole).length);
  });
});
