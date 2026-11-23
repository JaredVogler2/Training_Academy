import { describe, expect, it } from 'vitest';
import type { Stage } from '@/engine';
import type { Beat, Script, ScriptEvent } from '@/game/lesson/script';
import { GHOST_MS, STEP_MS, type Mode } from '@/game/worlds/robot-ridge/run';
import {
  robotScript,
  showingOf,
  showsTheWay,
  type RobotSituation,
  type Showing,
} from '@/game/worlds/robot-ridge/script';

/** A journey of three steps; where there is a faulty row, it stops after two, at a rock. */
function situation(
  mode: Mode,
  stage: Stage,
  event: ScriptEvent,
  extra: Partial<RobotSituation> = {},
): RobotSituation {
  return {
    stage,
    event,
    again: false,
    mode,
    way: 3,
    parts: mode === 'mend' ? 1 : mode === 'again' ? 4 : 3,
    fault: mode === 'mend' ? 2 : 0,
    faultBumps: mode === 'mend',
    lines: { instruction: 'r.ask', feedback: 'r.feedback', hint: 'r.hint' },
    seconds: () => 0,
    ...extra,
  };
}

const beats = (script: Script): Beat[] =>
  script.moments.flatMap((moment) => (moment.beat ? [moment.beat] : []));

/** What a script shows, in the board's own words: "shadow:1", "do:2", "run:3", "same". */
const shown = (script: Script): string[] =>
  beats(script).map((beat) => {
    const own = showingOf(beat);
    if (own) return own.show === 'pick' ? 'pick' : `${own.show}:${String(own.frame)}`;
    return beat.show === 'do' ? `do:${String(beat.parts)}` : beat.show;
  });

const said = (script: Script): string[] =>
  script.moments.flatMap((moment) => (moment.sound?.kind === 'say' ? [moment.sound.key] : []));

const MODES: Mode[] = ['live', 'plan', 'again', 'mend'];
const STAGES: Stage[] = ['demo', 'guided', 'independent'];
const EVENTS: ScriptEvent[] = [
  'new',
  'correct',
  'incorrect',
  'hint-model',
  'hint-eliminate',
  'hint-step',
  'hint-reveal',
];

describe('reading a beat', () => {
  it('tells the board which frame of which run to show', () => {
    const cases: [string, Showing | null][] = [
      ['shadow:2', { show: 'shadow', frame: 2 }],
      ['run:5', { show: 'run', frame: 5 }],
      ['fault:1', { show: 'fault', frame: 1 }],
      ['astray:4', { show: 'astray', frame: 4 }],
      ['pick', { show: 'pick' }],
      ['prompt', null],
      ['owl', null],
    ];
    for (const [which, expected] of cases) {
      expect(showingOf({ show: 'name', which }), which).toEqual(expected);
    }
    expect(showingOf({ show: 'rest' })).toBeNull();
    expect(showingOf({ show: 'do', parts: 2 })).toBeNull();
  });
});

describe('one tap at a time', () => {
  it('is demonstrated by tapping the arrows one by one, the robot doing each as it is tapped', () => {
    const script = robotScript(situation('live', 'demo', 'new'));
    expect(shown(script)).toEqual(['do:0', 'do:1', 'do:2', 'do:3', 'same']);
    expect(script.settled).toEqual({ show: 'same' });
    expect(said(script)).toEqual(['lesson.watch', 'r.ask']);
  });

  it('is asked by putting the question and offering the arrows: nothing is shown of the way', () => {
    for (const stage of ['guided', 'independent'] as const) {
      const script = robotScript(situation('live', stage, 'new'));
      expect(shown(script)).toEqual(['ask', 'rest']);
      expect(said(script)).toEqual(['r.ask']);
    }
  });

  it('shows the way, as help, with the robot’s shadow', () => {
    expect(shown(robotScript(situation('live', 'independent', 'hint-model')))).toEqual([
      'shadow:1',
      'shadow:2',
      'shadow:3',
      'rest',
    ]);
  });
});

describe('a plan', () => {
  it('is demonstrated whole: the shadow goes the way, the steps are put in, the row is run', () => {
    const script = robotScript(situation('plan', 'demo', 'new'));
    expect(shown(script)).toEqual([
      'shadow:1',
      'shadow:2',
      'shadow:3',
      'rest',
      'do:0',
      'do:1',
      'do:2',
      'do:3',
      'run:1',
      'run:2',
      'run:3',
      'same',
    ]);
    expect(script.settled).toEqual({ show: 'same' });
  });

  it('puts in "how many times" as a part of its own when the row is done over', () => {
    const script = robotScript(situation('again', 'demo', 'new', { parts: 2, way: 4 }));
    expect(shown(script).filter((beat) => beat.startsWith('do'))).toEqual(['do:0', 'do:1', 'do:2']);
    expect(shown(script).filter((beat) => beat.startsWith('run'))).toHaveLength(4);
  });

  it('with support, shows the way and leaves the planning to the child', () => {
    const script = robotScript(situation('plan', 'guided', 'new'));
    expect(shown(script)).toEqual(['shadow:1', 'shadow:2', 'shadow:3', 'rest']);
    expect(shown(script).some((beat) => beat.startsWith('do') || beat.startsWith('run'))).toBe(
      false,
    );
  });

  it('on their own, shows nothing of the way', () => {
    expect(shown(robotScript(situation('plan', 'independent', 'new')))).toEqual(['ask', 'rest']);
    expect(shown(robotScript(situation('again', 'independent', 'new')))).toEqual(['ask', 'rest']);
  });

  it('never shows the steps, or the row being run, on a step that is being asked', () => {
    for (const mode of ['plan', 'again'] as const) {
      for (const stage of ['guided', 'independent'] as const) {
        for (const event of EVENTS) {
          const all = shown(robotScript(situation(mode, stage, event)));
          expect(all.filter((beat) => /^(do|run):/.test(beat))).toEqual([]);
        }
      }
    }
  });
});

describe('a row to mend', () => {
  it('is demonstrated by running it wrong, pointing at the wrong step, changing it and running it right', () => {
    const script = robotScript(situation('mend', 'demo', 'new'));
    expect(shown(script)).toEqual([
      'fault:1',
      'fault:2',
      'pick',
      'do:1',
      'run:1',
      'run:2',
      'run:3',
      'same',
    ]);
  });

  it('is asked by running it to where it goes wrong, and leaving the robot there', () => {
    const script = robotScript(situation('mend', 'independent', 'new'));
    // Each step of the run, and then the run is over: the robot stays, and no step is being carried out any more.
    expect(shown(script)).toEqual(['fault:1', 'fault:2', 'astray:2']);
    expect(script.settled).toEqual({ show: 'name', which: 'astray:2' });
    // The last step is given its whole time before the run is called over.
    const at = (which: string) =>
      script.moments.find((m) => m.beat?.show === 'name' && m.beat.which === which)?.at ?? -1;
    expect(at('astray:2') - at('fault:2')).toBe(STEP_MS);
    // The last thing heard is the knock of the step that could not be taken, not a note.
    const sounds = script.moments.flatMap((moment) => (moment.sound ? [moment.sound] : []));
    expect(sounds.at(-1)).toEqual({ kind: 'cue', cue: 'off' });
  });

  it('sounds a note for each step when the faulty row stops short instead of being stopped', () => {
    const script = robotScript(situation('mend', 'guided', 'new', { faultBumps: false }));
    const cues = script.moments.flatMap((moment) =>
      moment.sound?.kind === 'cue' ? [moment.sound.cue] : [],
    );
    expect(cues).not.toContain('off');
    expect(script.moments.filter((moment) => moment.sound?.kind === 'count')).toHaveLength(2);
  });

  it('runs the faulty row again, as help, and again leaves the robot where it went wrong', () => {
    const script = robotScript(situation('mend', 'independent', 'hint-model'));
    expect(shown(script)).toEqual(['fault:1', 'fault:2', 'astray:2']);
    expect(said(script)).toEqual(['r.hint']);
  });

  it('never shows the mended row on a step that is being asked', () => {
    for (const stage of ['guided', 'independent'] as const) {
      for (const event of EVENTS) {
        const all = shown(robotScript(situation('mend', stage, event)));
        expect(all.filter((beat) => /^(do|run):/.test(beat) || beat === 'pick')).toEqual([]);
      }
    }
  });
});

describe('after an answer', () => {
  it('a journey that arrives is lit, and what there is to say is said', () => {
    for (const mode of MODES) {
      const script = robotScript(situation(mode, 'independent', 'correct'));
      expect(shown(script)).toEqual(['same']);
      expect(said(script)).toEqual(['r.feedback']);
      expect(script.moments.some((m) => m.sound?.kind === 'cue' && m.sound.cue === 'same')).toBe(
        true,
      );
    }
  });

  it('one that does not is talked about and nothing more: no sound of "wrong", nothing taken away', () => {
    for (const mode of MODES) {
      const script = robotScript(situation(mode, 'independent', 'incorrect'));
      expect(shown(script)).toEqual(['rest']);
      expect(said(script)).toEqual(['r.feedback']);
      expect(script.moments.some((moment) => moment.sound?.kind === 'cue')).toBe(false);
    }
  });
});

describe('showing the way', () => {
  it('is what a demonstration, a supported plan and a first rung of help do, and nothing else does', () => {
    const shows = (mode: Mode, stage: Stage, event: ScriptEvent) =>
      showsTheWay(situation(mode, stage, event));
    expect(shows('plan', 'guided', 'new')).toBe(true);
    expect(shows('again', 'demo', 'new')).toBe(true);
    expect(shows('plan', 'independent', 'new')).toBe(false);
    expect(shows('live', 'guided', 'new')).toBe(false);
    expect(shows('live', 'independent', 'hint-model')).toBe(true);
    expect(shows('plan', 'independent', 'hint-model')).toBe(true);
    expect(shows('plan', 'independent', 'hint-step')).toBe(false);
    expect(shows('plan', 'independent', 'incorrect')).toBe(false);
    for (const stage of STAGES) {
      for (const event of EVENTS) expect(shows('mend', stage, event)).toBe(false);
    }
  });

  it('agrees with the script: the shadow walks exactly when it says the way is shown', () => {
    for (const mode of MODES) {
      for (const stage of STAGES) {
        for (const event of EVENTS) {
          // Nothing is answered and no help is asked for in a demonstration: it only ever begins.
          if (stage === 'demo' && event !== 'new') continue;
          const now = situation(mode, stage, event);
          const walks = shown(robotScript(now)).some((beat) => beat.startsWith('shadow:'));
          // One tap at a time, a demonstration does the journey itself: there is no shadow to send ahead.
          const expected = showsTheWay(now) && !(mode === 'live' && stage === 'demo');
          expect(walks, `${mode} ${stage} ${event}`).toBe(expected);
        }
      }
    }
  });
});

describe('every script', () => {
  const all = MODES.flatMap((mode) =>
    STAGES.flatMap((stage) => EVENTS.map((event) => situation(mode, stage, event))),
  );

  it('runs forwards in time and ends on its settled beat, whether or not anything is heard', () => {
    for (const now of all) {
      for (const seconds of [() => 0, () => 1.5]) {
        const script = robotScript({ ...now, seconds });
        const times = script.moments.map((moment) => moment.at);
        const what = `${now.mode} ${now.stage} ${now.event}`;
        expect(times, what).toEqual([...times].sort((a, b) => a - b));
        // The last thing the board is told to show is where it comes to rest, at the very end.
        const last = script.moments.filter((moment) => moment.beat !== undefined).at(-1);
        expect(last?.beat, what).toEqual(script.settled);
        expect(last?.at, what).toBe(script.length);
      }
    }
  });

  it('gives each step of a run its time, and each step of the shadow a shorter one', () => {
    const demo = robotScript(situation('plan', 'demo', 'new'));
    const at = (which: string) =>
      demo.moments.find((m) => m.beat?.show === 'name' && m.beat.which === which)?.at ?? -1;
    expect(at('run:2') - at('run:1')).toBe(STEP_MS);
    expect(at('shadow:2') - at('shadow:1')).toBe(GHOST_MS);
    expect(GHOST_MS).toBeLessThan(STEP_MS);
  });

  it('waits for what is said, and takes no time for it when it will not be heard', () => {
    for (const now of all) {
      const quiet = robotScript(now);
      const heard = robotScript({ ...now, seconds: () => 1.5 });
      const lines = said(quiet).length;
      expect(said(heard)).toEqual(said(quiet));
      expect(heard.length - quiet.length).toBeGreaterThanOrEqual(lines * 1500);
    }
  });
});
