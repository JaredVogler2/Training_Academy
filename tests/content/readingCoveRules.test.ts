import { describe, expect, it } from 'vitest';
import readingCove from '@/content/packs/reading-cove.v1.json';
import { lintPack } from '@/content/lint';
import { lettersTaught } from '@/content/rules/readingCove';
import lexicon from '@/art/lexicon.json';
import { parseContentPack, type ContentPack } from '@/engine';
import { breaking, challengeIn, codes, rulesIn, type Loose } from '../helpers/lint';

function pack(): ContentPack {
  const parsed = parseContentPack(readingCove);
  if (!parsed.ok) throw new Error(parsed.issues.join('\n'));
  return parsed.value;
}
const broken = breaking(pack);

describe('Reading Cove, as it is shipped', () => {
  it('passes its own rules', () => {
    expect(lintPack(pack())).toEqual([]);
  });

  it('teaches fifteen letters, and gives nothing to read that needs another', () => {
    const taught = lettersTaught(pack());
    expect([...taught].sort().join('')).toBe('acefhilmnoprstu');
    const read = new Set<string>();
    for (const lesson of pack().lessons) {
      for (const challenge of lesson.challenges) {
        if (challenge.kind !== 'choose-one' || challenge.prompt.stimulus.type !== 'word') continue;
        const { id } = challenge.prompt.stimulus;
        read.add(id);
        const letters = (lexicon.words as Record<string, { letters?: string[] }>)[id]?.letters;
        expect(letters, id).toBeDefined();
        for (const letter of letters ?? [])
          expect(taught.has(letter), `${id}: ${letter}`).toBe(true);
      }
    }
    // What is given to read in print: a count the documents quote, so it is pinned here.
    expect(read.size).toBe(14);
  });

  it('blends or reads twenty-five different words, each spelt as it sounds', () => {
    const words = new Set<string>();
    for (const lesson of pack().lessons) {
      for (const challenge of lesson.challenges) {
        if (challenge.kind !== 'choose-one') continue;
        const { stimulus } = challenge.prompt;
        if (stimulus.type === 'word') words.add(stimulus.id);
        if (stimulus.type === 'sound' && stimulus.clip.startsWith('slow.')) {
          words.add(stimulus.clip.slice('slow.'.length));
        }
      }
    }
    expect(words.size).toBe(25);
  });

  it('never shows a letter, or a word in letters, before the letter lessons', () => {
    const early = pack().lessons.filter((lesson) => /^rc-(listen|first)-/.test(lesson.id));
    expect(early).toHaveLength(4);
    for (const lesson of early) {
      for (const challenge of lesson.challenges) {
        if (challenge.kind !== 'choose-one') continue;
        const shown = [challenge.prompt.stimulus, ...challenge.choices.map((c) => c.stimulus)];
        expect(
          shown.every((stimulus) => stimulus.type === 'picture' || stimulus.type === 'sound'),
        ).toBe(true);
      }
    }
  });

  it('on a question about a letter, never offers a second picture that starts with it', () => {
    // The lint says so too; this says it in the words a parent would use.
    const starts = lexicon.words as Record<string, { starts?: string }>;
    for (const lesson of pack().lessons) {
      for (const challenge of lesson.challenges) {
        if (challenge.kind !== 'choose-one' || challenge.prompt.stimulus.type !== 'letter')
          continue;
        const { letters } = challenge.prompt.stimulus;
        const matching = challenge.choices.filter(
          (choice) =>
            choice.stimulus.type === 'picture' && starts[choice.stimulus.id]?.starts === letters,
        );
        expect(matching, challenge.id).toHaveLength(1);
      }
    }
  });
});

describe('every Reading Cove rule fires', () => {
  const at = (pack: Loose, id: string) => challengeIn(pack, id);

  const BREAK: Record<string, (pack: Loose) => void> = {
    'word-unknown': (pack) => {
      at(pack, 'rc-first-01.demo').choices[0].stimulus.id = 'zebra';
    },
    'reading-answer-count': (pack) => {
      // Two words that start with s, where one was wanted.
      at(pack, 'rc-first-01.sock').choices[1].stimulus.id = 'sun';
    },
    'reading-answer-wrong': (pack) => {
      const challenge = at(pack, 'rc-listen-01.whistle');
      challenge.answer = challenge.choices.find(
        (choice: Loose) => choice.id !== challenge.answer,
      ).id;
    },
    'reading-clip': (pack) => {
      at(pack, 'rc-listen-01.demo-drum').prompt.stimulus.clip = 'word.drum';
    },
    'reading-not-sounded-out': (pack) => {
      at(pack, 'rc-blend-01.demo').prompt.stimulus.clip = 'slow.moon';
    },
    'reading-no-first-sound': (pack) => {
      at(pack, 'rc-first-01.demo').prompt.stimulus.id = 'drum';
    },
    'reading-same-word': (pack) => {
      at(pack, 'rc-first-01.demo').choices[1].stimulus.id = 'sun';
    },
    'reading-letter-twice': (pack) => {
      const { choices } = at(pack, 'rc-letters-01.seed-letter');
      choices[0].stimulus.letters = choices[2].stimulus.letters;
    },
    'reading-untaught-letter': (pack) => {
      // With the letter lessons gone, nothing has been taught.
      pack.lessons = pack.lessons.filter((lesson: Loose) => !lesson.id.startsWith('rc-letters-'));
    },
    'reading-cove-question': (pack) => {
      at(pack, 'rc-first-01.demo').prompt.stimulus = { type: 'sign', id: 'more' };
    },
    'reading-needs-sound': (pack) => {
      delete pack.lessons[0].needsSound;
    },
    'reading-cove-task': (pack) => {
      const challenge = at(pack, 'rc-listen-02.demo');
      challenge.task = {
        type: 'order',
        cards: challenge.task.cards,
        solution: ['drum', 'bell', 'shaker'],
      };
    },
    'reading-echo-card': (pack) => {
      at(pack, 'rc-listen-02.demo').task.cards[0].id = 'bongo';
    },
  };

  it.each(Object.keys(BREAK))('%s', (code) => {
    expect(codes(broken(BREAK[code]!))).toContain(code);
  });

  it('has a case here for every rule Reading Cove has', async () => {
    const source = (await import('@/content/rules/readingCove.ts?raw')).default;
    expect(rulesIn(source, ['choose-one'])).toEqual(Object.keys(BREAK).sort());
  });
});
