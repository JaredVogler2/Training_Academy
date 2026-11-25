/**
 * How to play: what Glim shows a child who has not played before. Three things, each shown and then tried:
 * tapping the one that is asked for; tapping a picture so that it goes to its place, and the tick when it is
 * finished; and tapping Glim to have something shown again.
 *
 * They are the game's own boards, drawn with the same parts, so that what is learnt here is what is met there.
 * (Everything in the game is done with a tap. Nothing is dragged: a tap is within reach of a hand that cannot yet
 * hold a thing down and move it.)
 *
 * Nothing here is a question. There is no wrong answer to record and nothing is written down about the child: a
 * tap on the other picture is met with Glim's hand on the one that is meant, and that is all.
 *
 * This file is the whole of it as data and rules, with no screen: what is shown, in what order and how long
 * after what; and what a tap does.
 */

export const STEPS = ['choose', 'place', 'again'] as const;
export type Step = (typeof STEPS)[number];

/** Glim is showing; it is the child's turn; the child has done it. */
export type Phase = 'show' | 'turn' | 'done';

/** What Glim's hand can be on. */
export type Target = `choice:${string}` | `card:${string}` | 'tick' | 'glim' | 'next';

/** Tapping the one that is the same: what Glim shows it with, and what the child tries it with. */
export const CHOOSE = {
  show: { same: 'sun', choices: ['moon', 'sun'] },
  turn: { same: 'fish', choices: ['fish', 'cat'] },
} as const;

/** Tapping a picture to put it in its place: two pictures and two places, in any order. */
export const PLACE = { cards: ['apple', 'hen'] } as const;

/** Having something shown again: a bell, which rings each time it is shown. */
export const AGAIN = { picture: 'bell', note: 'e5' } as const;

export interface HowTo {
  /** Which of the three: a place in `STEPS`, or their number once the last is done with. */
  step: number;
  phase: Phase;
  /** Goes up each time a showing is begun, so that one begun again starts from its first moment. */
  round: number;
  /** What Glim's hand is on. */
  hand: Target | null;
  /** Choosing: the choice that was tapped and is the one. */
  chosen: string | null;
  /** Choosing: the choice last tapped that was not. */
  tried: string | null;
  /** Placing: what stands in each place. */
  placed: readonly (string | null)[];
  /** Placing: the tick has been tapped. */
  handedIn: boolean;
  /** Showing again: how many times the bell has been rung. */
  rung: number;
}

const WORK = {
  hand: null,
  chosen: null,
  tried: null,
  placed: PLACE.cards.map(() => null),
  handedIn: false,
  rung: 0,
} satisfies Partial<HowTo>;

export function begin(): HowTo {
  return { step: 0, phase: 'show', round: 0, ...WORK };
}

export function stepOf(state: HowTo): Step | null {
  return STEPS[state.step] ?? null;
}

/** All three have been shown and tried. */
export function isOver(state: HowTo): boolean {
  return state.step >= STEPS.length;
}

/** The pictures on the choosing board: Glim's own while it shows, others for the child's turn. */
export function choosing(state: HowTo): (typeof CHOOSE)['show' | 'turn'] {
  return state.phase === 'show' ? CHOOSE.show : CHOOSE.turn;
}

export type Move =
  /** Glim's hand goes to something, or away. */
  | { type: 'hand'; on: Target | null }
  | { type: 'choose'; choice: string }
  | { type: 'place'; card: string }
  | { type: 'take-back'; place: number }
  /** The tick. */
  | { type: 'hand-in' }
  /** The bell is rung: the thing that is shown, in the last of the three. */
  | { type: 'ring' }
  /** Glim was tapped: show it again. */
  | { type: 'again' }
  /** The showing is over. */
  | { type: 'turn' }
  /** The arrow: on to the next. */
  | { type: 'next' };

/** Who made the move: Glim, in a showing; or the child. A child's tap on the board counts only in their turn. */
export type Mover = 'glim' | 'child';

const allPlaced = (state: HowTo) => state.placed.every((card) => card !== null);

/**
 * What a move does. A move that does not belong to the moment (a tap on the board while Glim is showing, the tick
 * before everything is placed, the arrow before the turn is done) changes nothing, and the same state is given
 * back.
 */
export function move(state: HowTo, by: Mover, action: Move): HowTo {
  const step = stepOf(state);
  if (step === null) return state;
  const { phase } = state;
  const acting = by === 'glim' ? phase === 'show' : phase === 'turn';
  // The child's turn ends when the thing is done; Glim's showing ends when Glim says so.
  const doneBy = (next: HowTo): HowTo =>
    by === 'child' ? { ...next, phase: 'done', hand: null } : next;

  switch (action.type) {
    case 'hand':
      return by === 'glim' ? { ...state, hand: action.on } : state;

    case 'choose': {
      if (step !== 'choose' || !acting || state.chosen !== null) return state;
      const { same, choices } = choosing(state);
      if (!(choices as readonly string[]).includes(action.choice)) return state;
      if (action.choice === same)
        return doneBy({ ...state, chosen: same, tried: null, hand: null });
      // Not that one: Glim's hand goes to the one that is meant. Nothing else follows from it.
      return { ...state, tried: action.choice, hand: `choice:${same}` };
    }

    case 'place': {
      if (step !== 'place' || !acting || state.handedIn) return state;
      const empty = state.placed.indexOf(null);
      const known = (PLACE.cards as readonly string[]).includes(action.card);
      if (empty < 0 || !known || state.placed.includes(action.card)) return state;
      const placed = state.placed.map((card, index) => (index === empty ? action.card : card));
      return { ...state, placed, hand: null };
    }

    case 'take-back': {
      if (step !== 'place' || by !== 'child' || phase !== 'turn' || state.handedIn) return state;
      if (state.placed[action.place] === null || state.placed[action.place] === undefined) {
        return state;
      }
      return {
        ...state,
        placed: state.placed.map((card, index) => (index === action.place ? null : card)),
        hand: null,
      };
    }

    case 'hand-in':
      if (step !== 'place' || !acting || state.handedIn || !allPlaced(state)) return state;
      return doneBy({ ...state, handedIn: true, hand: null });

    case 'ring':
      return step === 'again' && by === 'glim' ? { ...state, rung: state.rung + 1 } : state;

    case 'again':
      if (by !== 'child' || phase === 'show') return state;
      // In the last of the three, tapping Glim is the thing to do: the bell is rung again.
      if (step === 'again') {
        return phase === 'turn'
          ? { ...state, phase: 'done', hand: null, rung: state.rung + 1 }
          : { ...state, rung: state.rung + 1 };
      }
      // Anywhere else it means what it means in every activity: show me that again, from the start.
      return { ...state, ...WORK, phase: 'show', round: state.round + 1 };

    case 'turn':
      if (by !== 'glim' || phase !== 'show') return state;
      // The board is cleared for the child, but for the bell, which stays as it is with Glim's hand on Glim.
      return step === 'again'
        ? { ...state, phase: 'turn', hand: 'glim' }
        : { ...state, ...WORK, phase: 'turn' };

    case 'next':
      if (by !== 'child' || phase !== 'done') return state;
      return { ...state, ...WORK, step: state.step + 1, phase: 'show', round: state.round + 1 };
  }
}

/** What there is to tap next, in the child's turn or after it: where Glim's hand goes if nothing is tapped. */
export function nextTarget(state: HowTo): Target | null {
  const step = stepOf(state);
  if (step === null || state.phase === 'show') return null;
  if (state.phase === 'done') return 'next';
  if (step === 'choose') return `choice:${CHOOSE.turn.same}`;
  if (step === 'again') return 'glim';
  const waiting = PLACE.cards.find((card) => !state.placed.includes(card));
  return waiting === undefined ? 'tick' : `card:${waiting}`;
}

/** The line that goes with Glim's hand, when it is put there because nothing was tapped. */
export function reminderFor(target: Target): string {
  if (target === 'next') return 'help.next';
  if (target === 'tick') return 'help.done';
  if (target === 'glim') return 'howto.again';
  return 'help.answers';
}

/** Nothing tapped for this long in the child's turn: Glim's hand goes to what there is to tap. */
export const IDLE_MS = 6500;
/** The arrow is pointed out sooner: the thing has been done, and there is nothing else on the screen to try. */
export const IDLE_DONE_MS = 3500;

/** One moment of a showing: after `wait` milliseconds, a line may be said and Glim may make a move. */
export interface Beat {
  wait: number;
  say?: string;
  do?: Move;
}

/** A line is given this long at least, said or not: without sound the pictures still need their time. */
export const UNSAID_MS = 1500;
/** What follows a line waits this long after its last word. */
const BREATH_MS = 350;
/** How long a thing that has just happened is left to be looked at. */
export const LOOK_MS = 1500;

/**
 * A showing, as beats. `seconds` says how long a line takes to say (nothing, where it will not be heard), so that
 * Glim's hand keeps time with the words where there are words. `first` is the very first showing: it begins with
 * a hello.
 */
export function showingOf(step: Step, first: boolean, seconds: (line: string) => number): Beat[] {
  const said = (line: string) => Math.max(UNSAID_MS, seconds(line) * 1000 + BREATH_MS);
  const hello: Beat[] = first
    ? [{ wait: 400, say: 'howto.hello' }, { wait: said('howto.hello') }]
    : [{ wait: 500 }];
  switch (step) {
    case 'choose':
      return [
        ...hello,
        { wait: 0, say: 'howto.choose', do: { type: 'hand', on: `choice:${CHOOSE.show.same}` } },
        { wait: said('howto.choose'), do: { type: 'choose', choice: CHOOSE.show.same } },
        { wait: LOOK_MS, do: { type: 'turn' } },
      ];
    case 'place': {
      const [one, two] = PLACE.cards;
      // Two taps while the first line is said, and then the tick with the line that is about it.
      const line = said('howto.place');
      return [
        ...hello,
        { wait: 0, say: 'howto.place', do: { type: 'hand', on: `card:${one}` } },
        { wait: 1200, do: { type: 'place', card: one } },
        { wait: 500, do: { type: 'hand', on: `card:${two}` } },
        { wait: 1000, do: { type: 'place', card: two } },
        {
          wait: Math.max(500, line - 2700),
          say: 'howto.done',
          do: { type: 'hand', on: 'tick' },
        },
        { wait: said('howto.done'), do: { type: 'hand-in' } },
        { wait: LOOK_MS, do: { type: 'turn' } },
      ];
    }
    case 'again':
      return [
        ...hello,
        { wait: 0, do: { type: 'ring' } },
        { wait: 1000, say: 'howto.again', do: { type: 'hand', on: 'glim' } },
        { wait: said('howto.again'), do: { type: 'turn' } },
      ];
  }
}

/** How long a showing takes from its first beat to the child's turn. */
export function lengthOf(beats: readonly Beat[]): number {
  return beats.reduce((total, beat) => total + beat.wait, 0);
}
