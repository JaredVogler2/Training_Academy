import { describe, expect, it } from 'vitest';
import {
  AGAIN,
  CHOOSE,
  PLACE,
  STEPS,
  UNSAID_MS,
  begin,
  choosing,
  isOver,
  lengthOf,
  move,
  nextTarget,
  reminderFor,
  showingOf,
  stepOf,
  type HowTo,
  type Move,
} from '@/game/howto/steps';
import { captionOf, howToText } from '@/game/howto/text';
import { isPictureId } from '@/art/pictures';
import { frequencyOf } from '@/engine/music';
import lines from '@/voice/lines.json';
import seconds from '@/voice/timings/common.json';

/**
 * "How to play", without a screen: what Glim shows, in what order and how long after what; and what a tap does.
 */

const said: Record<string, string> = lines.groups.common.lines;
const lengths = seconds as Record<string, number>;
const heard = (line: string) => lengths[line] ?? 0;
const unheard = () => 0;

const glim = (state: HowTo, action: Move) => move(state, 'glim', action);
const child = (state: HowTo, action: Move) => move(state, 'child', action);
const each = (state: HowTo, by: 'glim' | 'child', actions: Move[]) =>
  actions.reduce((now, action) => move(now, by, action), state);

/** Glim's showing of the step the state is at, played from its first beat to its last. */
function shown(state: HowTo): HowTo {
  const step = stepOf(state);
  if (step === null) throw new Error('nothing left to show');
  return showingOf(step, false, heard).reduce(
    (now, beat) => (beat.do ? glim(now, beat.do) : now),
    state,
  );
}

/** A state at the child's turn of the step with this name. */
function turnOf(step: (typeof STEPS)[number]): HowTo {
  let state = begin();
  // Each of the three at most once: if doing a thing does not lead on, that is said, not waited for.
  for (const each of STEPS) {
    expect(stepOf(state), `on the way to ${step}`).toBe(each);
    state = shown(state);
    if (each === step) return state;
    state = child(done(state), { type: 'next' });
  }
  throw new Error(`"How to play" has no ${step}.`);
}

/** The child does the thing the step asks for. */
function done(state: HowTo): HowTo {
  switch (stepOf(state)) {
    case 'choose':
      return child(state, { type: 'choose', choice: CHOOSE.turn.same });
    case 'place':
      return each(state, 'child', [
        ...PLACE.cards.map((card): Move => ({ type: 'place', card })),
        { type: 'hand-in' },
      ]);
    case 'again':
      return child(state, { type: 'again' });
    case null:
      throw new Error('nothing left to do');
  }
}

describe('what is shown', () => {
  it('is three things: choosing, placing, and having it shown again', () => {
    expect(STEPS).toEqual(['choose', 'place', 'again']);
  });

  it('is drawn with pictures the kit has, and rung on a note there is', () => {
    const pictures = [
      CHOOSE.show.same,
      ...CHOOSE.show.choices,
      CHOOSE.turn.same,
      ...CHOOSE.turn.choices,
      ...PLACE.cards,
      AGAIN.picture,
    ];
    for (const picture of pictures) expect(isPictureId(picture), picture).toBe(true);
    expect(frequencyOf(AGAIN.note)).toBeGreaterThan(0);
  });

  it('has the one that is the same among the choices, once, and one that is not', () => {
    for (const board of [CHOOSE.show, CHOOSE.turn]) {
      expect(board.choices.filter((choice) => choice === board.same)).toHaveLength(1);
      expect(board.choices).toHaveLength(2);
    }
    // The child is not asked to copy where Glim tapped: the one to tap is in the other place.
    expect(CHOOSE.show.choices.indexOf(CHOOSE.show.same)).not.toBe(
      (CHOOSE.turn.choices as readonly string[]).indexOf(CHOOSE.turn.same),
    );
  });
});

describe('a showing', () => {
  it.each(STEPS)('of %s ends with the child’s turn and nothing done for them', (step) => {
    const state = turnOf(step);
    expect(state.phase).toBe('turn');
    expect(state.chosen).toBeNull();
    expect(state.tried).toBeNull();
    expect(state.placed).toEqual(PLACE.cards.map(() => null));
    expect(state.handedIn).toBe(false);
  });

  it('of choosing has Glim’s hand on the one that is the same, and then that one chosen', () => {
    const beats = showingOf('choose', false, heard);
    const hand = beats.findIndex((beat) => beat.do?.type === 'hand');
    const chosen = beats.findIndex((beat) => beat.do?.type === 'choose');
    expect(beats[hand]?.do).toEqual({ type: 'hand', on: `choice:${CHOOSE.show.same}` });
    expect(beats[chosen]?.do).toEqual({ type: 'choose', choice: CHOOSE.show.same });
    expect(hand).toBeLessThan(chosen);
  });

  it('of placing puts every picture in a place, then presses the tick', () => {
    let state = begin();
    state = child(done(shown(state)), { type: 'next' });
    const seen: HowTo[] = [];
    for (const beat of showingOf('place', false, heard)) {
      if (beat.do) state = glim(state, beat.do);
      seen.push(state);
    }
    const full = seen.findIndex((each) => each.placed.every((card) => card !== null));
    const handed = seen.findIndex((each) => each.handedIn);
    expect(full).toBeGreaterThanOrEqual(0);
    expect(handed).toBeGreaterThan(full);
    // Glim's hand is on the tick before the tick is pressed.
    expect(seen.slice(full, handed).some((each) => each.hand === 'tick')).toBe(true);
  });

  it('of showing again rings the bell once and leaves Glim’s hand on Glim', () => {
    const state = turnOf('again');
    expect(state.rung).toBe(1);
    expect(state.hand).toBe('glim');
  });

  it('says hello only the first time anything is shown', () => {
    const lineOf = (beats: ReturnType<typeof showingOf>) => beats.map((beat) => beat.say);
    expect(lineOf(showingOf('choose', true, heard))).toContain('howto.hello');
    for (const step of STEPS) {
      expect(lineOf(showingOf(step, false, heard))).not.toContain('howto.hello');
    }
  });

  it('says only lines that have been recorded', () => {
    for (const step of STEPS) {
      for (const beat of showingOf(step, true, heard)) {
        if (beat.say === undefined) continue;
        expect(said[beat.say], beat.say).toBeTypeOf('string');
        expect(lengths[beat.say], beat.say).toBeGreaterThan(0);
      }
    }
  });

  it('never begins a line before the one before it is over', () => {
    for (const step of STEPS) {
      let free = 0;
      let now = 0;
      for (const beat of showingOf(step, true, heard)) {
        now += beat.wait;
        if (beat.say === undefined) continue;
        expect(now, `${step}: ${beat.say}`).toBeGreaterThanOrEqual(free);
        free = now + heard(beat.say) * 1000;
      }
    }
  });

  it('is short: a few seconds, with the sound or without it', () => {
    for (const step of STEPS) {
      for (const clock of [heard, unheard]) {
        const length = lengthOf(showingOf(step, false, clock));
        expect(length, step).toBeGreaterThanOrEqual(3000);
        expect(length, step).toBeLessThanOrEqual(10000);
      }
    }
    // The very first is longer by a hello, and still short.
    expect(lengthOf(showingOf('choose', true, heard))).toBeLessThanOrEqual(12000);
  });

  it('gives a line its time even when it will not be heard', () => {
    const beats = showingOf('choose', false, unheard);
    const chosen = beats.find((beat) => beat.do?.type === 'choose');
    expect(chosen?.wait).toBe(UNSAID_MS);
  });
});

describe('a tap', () => {
  it('on the board does nothing while Glim is showing', () => {
    const state = begin();
    expect(child(state, { type: 'choose', choice: CHOOSE.show.same })).toBe(state);
    expect(child(state, { type: 'next' })).toBe(state);
    expect(child(state, { type: 'again' })).toBe(state);
  });

  it('on the one that is the same is all that is asked', () => {
    const state = done(turnOf('choose'));
    expect(state.phase).toBe('done');
    expect(state.chosen).toBe(CHOOSE.turn.same);
    expect(state.hand).toBeNull();
  });

  it('on the other one is not held against anyone: Glim’s hand goes to the one that is meant', () => {
    const other = CHOOSE.turn.choices.find((choice) => choice !== CHOOSE.turn.same) ?? '';
    const state = child(turnOf('choose'), { type: 'choose', choice: other });
    expect(state.phase).toBe('turn');
    expect(state.tried).toBe(other);
    expect(state.chosen).toBeNull();
    expect(state.hand).toBe(`choice:${CHOOSE.turn.same}`);
    // And the one that is meant can still be tapped.
    expect(done(state).phase).toBe('done');
  });

  it('on a picture that is not on the board does nothing', () => {
    const state = turnOf('choose');
    expect(child(state, { type: 'choose', choice: CHOOSE.show.same })).toBe(state);
  });

  it('on a picture puts it in the first empty place, in whatever order', () => {
    const [one, two] = PLACE.cards;
    const state = each(turnOf('place'), 'child', [
      { type: 'place', card: two },
      { type: 'place', card: one },
    ]);
    expect(state.placed).toEqual([two, one]);
    expect(state.phase).toBe('turn');
  });

  it('on a picture already placed does nothing; on its place takes it back', () => {
    const [one] = PLACE.cards;
    const placed = child(turnOf('place'), { type: 'place', card: one });
    expect(child(placed, { type: 'place', card: one })).toBe(placed);
    const back = child(placed, { type: 'take-back', place: 0 });
    expect(back.placed).toEqual(PLACE.cards.map(() => null));
    expect(child(back, { type: 'take-back', place: 0 })).toBe(back);
  });

  it('on the tick counts only once everything is in its place', () => {
    const [one, two] = PLACE.cards;
    const some = child(turnOf('place'), { type: 'place', card: one });
    expect(child(some, { type: 'hand-in' })).toBe(some);
    const all = child(some, { type: 'place', card: two });
    const handed = child(all, { type: 'hand-in' });
    expect(handed.handedIn).toBe(true);
    expect(handed.phase).toBe('done');
    // Handed in is handed in: nothing is taken back afterwards.
    expect(child(handed, { type: 'take-back', place: 0 })).toBe(handed);
  });

  it('on Glim shows it again from the start, anywhere but in the last of the three', () => {
    const turn = child(turnOf('place'), { type: 'place', card: PLACE.cards[0] });
    const again = child(turn, { type: 'again' });
    expect(again.phase).toBe('show');
    expect(again.round).toBe(turn.round + 1);
    expect(again.placed).toEqual(PLACE.cards.map(() => null));
    expect(stepOf(again)).toBe('place');
  });

  it('on Glim is the thing to do in the last of the three: the bell rings again', () => {
    const turn = turnOf('again');
    const state = child(turn, { type: 'again' });
    expect(state.phase).toBe('done');
    expect(state.rung).toBe(turn.rung + 1);
    // And again, for as long as anyone likes.
    expect(child(state, { type: 'again' }).rung).toBe(turn.rung + 2);
    expect(child(state, { type: 'again' }).phase).toBe('done');
  });

  it('on the arrow goes on, and only once the thing has been done', () => {
    const turn = turnOf('choose');
    expect(child(turn, { type: 'next' })).toBe(turn);
    const next = child(done(turn), { type: 'next' });
    expect(stepOf(next)).toBe('place');
    expect(next.phase).toBe('show');
    expect(next.round).toBeGreaterThan(turn.round);
  });

  it('on the arrow after the last of the three is the end of it', () => {
    const state = child(done(turnOf('again')), { type: 'next' });
    expect(isOver(state)).toBe(true);
    expect(stepOf(state)).toBeNull();
    // Nothing more happens to it.
    expect(child(state, { type: 'again' })).toBe(state);
    expect(glim(state, { type: 'turn' })).toBe(state);
  });

  it('is never made for the child: Glim’s moves count only in a showing', () => {
    const turn = turnOf('choose');
    expect(glim(turn, { type: 'choose', choice: CHOOSE.turn.same })).toBe(turn);
    const placing = turnOf('place');
    expect(glim(placing, { type: 'place', card: PLACE.cards[0] })).toBe(placing);
    expect(glim(placing, { type: 'hand-in' })).toBe(placing);
  });
});

describe('when nothing is tapped', () => {
  it('Glim’s hand goes to what there is to tap', () => {
    expect(nextTarget(begin())).toBeNull();
    expect(nextTarget(turnOf('choose'))).toBe(`choice:${CHOOSE.turn.same}`);
    const placing = turnOf('place');
    expect(nextTarget(placing)).toBe(`card:${PLACE.cards[0]}`);
    const one = child(placing, { type: 'place', card: PLACE.cards[0] });
    expect(nextTarget(one)).toBe(`card:${PLACE.cards[1]}`);
    const all = child(one, { type: 'place', card: PLACE.cards[1] });
    expect(nextTarget(all)).toBe('tick');
    expect(nextTarget(turnOf('again'))).toBe('glim');
    expect(nextTarget(done(turnOf('choose')))).toBe('next');
  });

  it('and the line that goes with it has been recorded', () => {
    for (const target of ['choice:fish', 'card:apple', 'tick', 'glim', 'next'] as const) {
      expect(said[reminderFor(target)], target).toBeTypeOf('string');
    }
    expect(reminderFor('tick')).toBe('help.done');
    expect(reminderFor('next')).toBe('help.next');
  });

  it('the hand can be put there by Glim at any time, and by nobody else', () => {
    const turn = turnOf('choose');
    expect(glim(turn, { type: 'hand', on: 'next' }).hand).toBe('next');
    expect(child(turn, { type: 'hand', on: 'next' })).toBe(turn);
  });
});

describe('what is written at the foot', () => {
  it('is what Glim says, word for word', () => {
    for (const [key, text] of Object.entries(howToText.lines)) {
      expect(said[`howto.${key}`], key).toBe(text);
    }
  });

  it('says to watch while Glim shows, and whose turn it is after', () => {
    expect(captionOf(begin())).toBe(`${howToText.watch} ${howToText.lines.choose}`);
    expect(captionOf(turnOf('choose'))).toBe(`${howToText.yourTurn} ${howToText.lines.choose}`);
    expect(captionOf(done(turnOf('choose')))).toBe(howToText.lines.yes);
    expect(captionOf(done(turnOf('again')))).toBe(howToText.lines.end);
  });

  it('is about the tick once everything is in its place', () => {
    const turn = turnOf('place');
    expect(captionOf(turn)).toContain(howToText.lines.place);
    const all = each(
      turn,
      'child',
      PLACE.cards.map((card): Move => ({ type: 'place', card })),
    );
    expect(captionOf(all)).toBe(`${howToText.yourTurn} ${howToText.lines.done}`);
  });

  it('shows Glim’s own pictures in a showing and others in the turn', () => {
    expect(choosing(begin())).toBe(CHOOSE.show);
    expect(choosing(turnOf('choose'))).toBe(CHOOSE.turn);
    expect(choosing(done(turnOf('choose')))).toBe(CHOOSE.turn);
  });
});
