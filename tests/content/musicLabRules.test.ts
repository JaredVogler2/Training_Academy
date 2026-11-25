import { describe, expect, it } from 'vitest';
import musicLab from '@/content/packs/music-lab.v1.json';
import { lintPack } from '@/content/lint';
import { parseContentPack, pitchOf, type Challenge, type ContentPack } from '@/engine';
import { breaking, challengeIn, codes, rulesIn, type Loose } from '../helpers/lint';

function pack(): ContentPack {
  const parsed = parseContentPack(musicLab);
  if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
  return parsed.value;
}
const broken = breaking(pack);

const everyChallenge = (): Challenge[] => pack().lessons.flatMap((lesson) => lesson.challenges);

/** Everything a challenge asks a child to listen to, each written out so that two can be told apart. */
function patternsIn(challenge: Challenge): string[] {
  const found: string[] = [];
  const read = (of: Record<string, unknown>) => {
    for (const key of ['notes', 'steps', 'first', 'second', 'firstSteps', 'secondSteps']) {
      const value = of[key];
      if (Array.isArray(value) && value.length > 1) found.push(value.join('-'));
    }
  };
  if (challenge.kind === 'choose-one') {
    for (const stimulus of [
      challenge.prompt.stimulus,
      ...challenge.choices.map((choice) => choice.stimulus),
    ]) {
      if (stimulus.type === 'scene') read(stimulus.of);
    }
  } else if (challenge.task.type === 'echo' || challenge.task.type === 'tune') {
    found.push(challenge.task.solution.join('-'));
  }
  return found;
}

describe('the Music Lab, as it is shipped', () => {
  it('passes its own rules', () => {
    expect(lintPack(pack())).toEqual([]);
  });

  it('has the six activities its brief asks for, in the order they are meant to be met', () => {
    expect(pack().lessons.map((lesson) => lesson.id)).toEqual([
      'ml-high-low-01',
      'ml-same-01',
      'ml-beat-01',
      'ml-echo-01',
      'ml-again-01',
      'ml-tune-01',
    ]);
  });

  it('has far more than ten patterns written for it, no two activities sharing their answers', () => {
    const patterns = new Set(everyChallenge().flatMap(patternsIn));
    expect(patterns.size).toBeGreaterThanOrEqual(40);
  });

  it('says of every activity that is put by ear that it needs sound, and of no other', () => {
    const needs = Object.fromEntries(
      pack().lessons.map((lesson) => [lesson.id, lesson.needsSound === true]),
    );
    expect(needs).toEqual({
      'ml-high-low-01': true,
      'ml-same-01': true,
      // A beat is lit as well as clicked, and bars light as they sound: these can be followed by eye.
      'ml-beat-01': false,
      'ml-echo-01': false,
      'ml-again-01': true,
      'ml-tune-01': false,
    });
  });

  it('asks about high and low alone only of things that look alike', () => {
    const lesson = pack().lessons.find((each) => each.id === 'ml-high-low-01')!;
    for (const id of lesson.plan.independent.pool) {
      const challenge = lesson.challenges.find((each) => each.id === id)!;
      if (challenge.kind !== 'choose-one') throw new Error('kind');
      const looks = challenge.choices
        .map((choice) => JSON.stringify(choice.stimulus))
        .map((text) =>
          // Everything but the note itself.
          text.replace(/"notes":\[[^\]]*\]/, ''),
        );
      expect(new Set(looks).size, id).toBe(1);
    }
  });

  it('begins with notes two octaves apart and ends with notes a third apart', () => {
    const lesson = pack().lessons.find((each) => each.id === 'ml-high-low-01')!;
    const gapOf = (id: string) => {
      const challenge = lesson.challenges.find((each) => each.id === id)!;
      if (challenge.kind !== 'choose-one') throw new Error('kind');
      const pitches = challenge.choices.map((choice) => {
        const { stimulus } = choice;
        if (stimulus.type !== 'scene') throw new Error('scene');
        const note = stimulus.scene === 'bar' ? stimulus.of.note : stimulus.of.notes;
        return pitchOf(String(Array.isArray(note) ? note[0] : note)) ?? 0;
      });
      return Math.max(...pitches) - Math.min(...pitches);
    };
    expect(gapOf(lesson.plan.demo[0]!)).toBe(24);
    const alone = lesson.plan.independent.pool.map(gapOf);
    expect(Math.max(...alone)).toBe(12);
    expect(Math.min(...alone)).toBeGreaterThanOrEqual(3);
  });

  it('keeps every beat slow, and asks for most of it and never all of it', () => {
    for (const challenge of everyChallenge()) {
      if (challenge.kind !== 'make' || challenge.task.type !== 'beat') continue;
      const { tempo, beats, need } = challenge.task;
      expect(tempo, challenge.id).toBeGreaterThanOrEqual(60);
      expect(tempo, challenge.id).toBeLessThanOrEqual(84);
      expect(need, challenge.id).toBeLessThan(beats);
      expect(need * 2, challenge.id).toBeGreaterThan(beats);
    }
  });

  it('gives every tune to make up enough bars that there is more than one right answer', () => {
    for (const challenge of everyChallenge()) {
      if (challenge.kind !== 'make' || challenge.task.type !== 'tune') continue;
      expect(challenge.task.notes.length, challenge.id).toBeGreaterThan(challenge.task.length - 2);
      expect(challenge.task.notes.length, challenge.id).toBeGreaterThanOrEqual(4);
    }
  });

  it('writes down what was asked, not talent: its skills are listening, order, tempo and making', () => {
    expect(pack().skills.map((skill) => skill.id)).toEqual([
      'music.pitch.high-low',
      'music.pattern.same-different',
      'music.rhythm.steady-beat',
      'music.memory.play-back',
      'music.pattern.repeated-phrase',
      'music.making.shape-a-tune',
    ]);
    const words = pack()
      .skills.map((skill) => `${skill.title} ${skill.objective}`)
      .join(' ')
      .toLowerCase();
    for (const word of ['talent', 'gifted', 'musical ear', 'perfect pitch', 'ability']) {
      expect(words, word).not.toContain(word);
    }
  });
});

describe('every Music Lab rule fires', () => {
  const at = (pack: Loose, id: string) => challengeIn(pack, id);
  const leader = (pack: Loose, id: string) => at(pack, id).prompt.stimulus.of;
  const bar = (note: string) => ({ type: 'scene', scene: 'bar', of: { note } });

  const BREAK: Record<string, (pack: Loose) => void> = {
    'music-voice': (pack) => {
      leader(pack, 'ml-again-01.demo').voice = 'trumpet';
    },
    'music-drum-notes': (pack) => {
      leader(pack, 'ml-again-01.drums-a').notes = ['c5', 'e5', 'g5'];
    },
    'music-drum-steps': (pack) => {
      leader(pack, 'ml-again-01.drums-a').steps = [1, 3, 1];
    },
    'music-tune-steps': (pack) => {
      leader(pack, 'ml-again-01.demo').steps = [1, 2];
    },
    'music-tune-length': (pack) => {
      leader(pack, 'ml-again-01.demo').notes = ['c5', 'd5', 'e5', 'f5', 'g5'];
    },
    'music-note': (pack) => {
      leader(pack, 'ml-again-01.demo').notes = ['c5', 'h5'];
    },
    'music-note-range': (pack) => {
      // Below middle C: a phone's speaker gives almost nothing of it.
      leader(pack, 'ml-again-01.demo').notes = ['c3', 'g5'];
    },
    'music-high-low-choice': (pack) => {
      at(pack, 'ml-high-low-01.high-octave').choices[0].stimulus.of.notes = ['e4', 'g4'];
    },
    'music-high-low-same': (pack) => {
      const { choices } = at(pack, 'ml-high-low-01.high-octave');
      choices[0].stimulus.of.notes = choices[1].stimulus.of.notes;
    },
    'music-high-low-answer': (pack) => {
      const challenge = at(pack, 'ml-high-low-01.high-octave');
      challenge.answer = challenge.answer === 'a' ? 'b' : 'a';
    },
    'music-high-low-gap': (pack) => {
      // A semitone: E and the F next to it.
      const { choices } = at(pack, 'ml-high-low-01.high-third');
      choices[0].stimulus.of.notes = ['e5'];
      choices[1].stimulus.of.notes = ['f5'];
    },
    'music-high-low-looks': (pack) => {
      at(pack, 'ml-high-low-01.guided-high').choices[0].stimulus = {
        type: 'scene',
        scene: 'phrase',
        of: { voice: 'pipe', notes: ['e6'] },
      };
    },
    'music-high-low-seen': (pack) => {
      const { choices } = at(pack, 'ml-high-low-01.high-octave');
      choices[0].stimulus = bar('e4');
      choices[1].stimulus = bar('e5');
    },
    'music-same-choices': (pack) => {
      at(pack, 'ml-same-01.demo-same').choices[0].stimulus = { type: 'sign', id: 'different' };
    },
    'music-same-length': (pack) => {
      leader(pack, 'ml-same-01.demo-different').second = ['g5', 'e5'];
    },
    'music-same-answer': (pack) => {
      at(pack, 'ml-same-01.demo-same').answer = 'different';
    },
    'music-again-leader': (pack) => {
      delete leader(pack, 'ml-again-01.demo').big;
    },
    'music-again-choice': (pack) => {
      at(pack, 'ml-again-01.demo').choices[1].stimulus = { type: 'sign', id: 'same' };
    },
    'music-again-twice': (pack) => {
      // Two of the little birds sing the same wrong tune.
      const { choices } = at(pack, 'ml-again-01.three-a');
      choices[2].stimulus.of.notes = choices[0].stimulus.of.notes;
    },
    'music-again-count': (pack) => {
      // Nobody sings what the big bird sang.
      leader(pack, 'ml-again-01.three-a').notes = ['g5', 'g5', 'g5'];
    },
    'music-again-answer': (pack) => {
      const challenge = at(pack, 'ml-again-01.three-a');
      challenge.answer = challenge.answer === 'a' ? 'b' : 'a';
    },
    'music-again-length': (pack) => {
      at(pack, 'ml-again-01.three-a').choices[0].stimulus.of.notes = ['a5', 'e5'];
    },
    'music-needs-sound': (pack) => {
      delete pack.lessons[0].needsSound;
    },
    'music-lab-question': (pack) => {
      at(pack, 'ml-high-low-01.demo-high').prompt.stimulus = { type: 'picture', id: 'cat' };
    },
    'music-bar': (pack) => {
      at(pack, 'ml-echo-01.demo').task.cards[1].stimulus.of.note = 'f4';
    },
    'music-bars-order': (pack) => {
      at(pack, 'ml-echo-01.demo').task.cards.reverse();
    },
    'music-echo-length': (pack) => {
      at(pack, 'ml-echo-01.demo').task.solution = ['c4', 'e4', 'g4', 'c4', 'e4'];
    },
    'music-beat-picture': (pack) => {
      at(pack, 'ml-beat-01.demo').prompt.stimulus.of.tempo = 100;
    },
    'music-tune-picture': (pack) => {
      at(pack, 'ml-tune-01.demo').prompt.stimulus.id = 'down';
    },
    'music-tune-twice': (pack) => {
      const { task } = at(pack, 'ml-tune-01.twice-four');
      task.length = 5;
      task.solution = ['e4', 'g4', 'e4', 'g4', 'e4'];
    },
    'music-lab-task': (pack) => {
      const challenge = at(pack, 'ml-echo-01.demo');
      challenge.task = { type: 'order', cards: challenge.task.cards, solution: ['c4', 'e4', 'g4'] };
    },
  };

  it.each(Object.keys(BREAK))('%s', (code) => {
    expect(codes(broken(BREAK[code]!))).toContain(code);
  });

  it('has a case here for every rule the Music Lab has', async () => {
    const source = (await import('@/content/rules/musicLab.ts?raw')).default;
    expect(rulesIn(source, ['choose-one'])).toEqual(Object.keys(BREAK).sort());
  });
});
