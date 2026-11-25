import { describe, expect, it } from 'vitest';
import readingCove from '@/content/packs/reading-cove.v2.json';
import { lintPack } from '@/content/lint';
import { lettersTaught, nearness, rimeOf } from '@/content/rules/readingCove';
import lexicon from '@/art/lexicon.json';
import { isPictureId } from '@/art/pictures';
import { LETTERS } from '@/art/letters';
import {
  parseContentPack,
  placedBy,
  readReadingPicture,
  type ChooseOneChallenge,
  type ContentPack,
  type Lesson,
} from '@/engine';
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

  it('teaches fifteen letters and three pairs, and gives nothing to read that needs another', () => {
    const taught = lettersTaught(pack());
    const single = [...taught].filter((each) => each.length === 1).sort();
    const pairs = [...taught].filter((each) => each.length === 2).sort();
    expect(single.join('')).toBe('acefhilmnoprstu');
    expect(pairs).toEqual(['ch', 'sh', 'th']);
    // Every letter of every pair is one there is a drawing for.
    for (const each of taught) for (const letter of each) expect(LETTERS).toContain(letter);
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
    expect(read.size).toBe(21);
  });

  it('blends, reads or builds thirty-two different words, each spelt as it sounds', () => {
    const words = new Set<string>();
    for (const lesson of pack().lessons) {
      for (const challenge of lesson.challenges) {
        const { stimulus } = challenge.prompt;
        if (challenge.kind === 'make') {
          // A word to build.
          if (challenge.task.type === 'order' && stimulus?.type === 'picture')
            words.add(stimulus.id);
          continue;
        }
        if (stimulus?.type === 'word') words.add(stimulus.id);
        if (stimulus?.type === 'sound' && stimulus.clip.startsWith('slow.')) {
          words.add(stimulus.clip.slice('slow.'.length));
        }
      }
    }
    for (const word of words) {
      expect(
        (lexicon.words as Record<string, { letters?: string[] }>)[word]?.letters,
      ).toBeDefined();
    }
    expect(words.size).toBe(32);
  });

  it('never shows a letter, or a word in letters, before the letter lessons', () => {
    const { lessons } = pack();
    const early = lessons.slice(
      0,
      lessons.findIndex((lesson) => lesson.id.startsWith('rc-letters-')),
    );
    expect(early.map((lesson) => lesson.id)).toEqual([
      'rc-listen-01',
      'rc-listen-02',
      'rc-rhyme-01',
      'rc-syllables-01',
      'rc-first-01',
      'rc-first-02',
    ]);
    const byEar = ['rhyme', 'beats', 'claps'];
    for (const lesson of early) {
      for (const challenge of lesson.challenges) {
        const shown =
          challenge.kind === 'choose-one'
            ? [challenge.prompt.stimulus, ...challenge.choices.map((c) => c.stimulus)]
            : challenge.task.type === 'echo'
              ? challenge.task.cards.map((card) => card.stimulus)
              : [];
        expect(shown.length, challenge.id).toBeGreaterThan(0);
        for (const stimulus of shown) {
          const fine =
            stimulus.type === 'picture' ||
            stimulus.type === 'sound' ||
            (stimulus.type === 'scene' && byEar.includes(stimulus.scene));
          expect(fine, challenge.id).toBe(true);
        }
      }
    }
  });

  it('gives a word to build, a pair of letters, or a sentence only after every single letter', () => {
    const order = pack().lessons.map((lesson) => lesson.id);
    const last = order.indexOf('rc-letters-04');
    for (const later of ['rc-spell-01', 'rc-letters-05', 'rc-blend-03', 'rc-sentences-01']) {
      expect(order.indexOf(later), later).toBeGreaterThan(last);
    }
    // And a word with a pair in it is not read until the pairs have been met.
    expect(order.indexOf('rc-blend-03')).toBeGreaterThan(order.indexOf('rc-letters-05'));
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

const lessonOf = (id: string): Lesson => {
  const found = pack().lessons.find((lesson) => lesson.id === id);
  if (!found) throw new Error(`no lesson ${id}`);
  return found;
};
const questions = (id: string): ChooseOneChallenge[] =>
  lessonOf(id).challenges.flatMap((challenge) =>
    challenge.kind === 'choose-one' ? [challenge] : [],
  );
const independent = (id: string): ChooseOneChallenge[] => {
  const pool = new Set(lessonOf(id).plan.independent.pool);
  return questions(id).filter((challenge) => pool.has(challenge.id));
};

describe('rhyme', () => {
  it('asks about a different word every time, and the answer is the only one that ends the same', () => {
    const asked = new Set<string>();
    for (const challenge of questions('rc-rhyme-01')) {
      const prompt = readReadingPicture(challenge.prompt.stimulus);
      if (prompt?.kind !== 'rhyme') throw new Error(challenge.id);
      expect(asked.has(prompt.word), challenge.id).toBe(false);
      asked.add(prompt.word);
      const rhyming = challenge.choices.filter(
        (choice) =>
          choice.stimulus.type === 'picture' && rimeOf(choice.stimulus.id) === rimeOf(prompt.word),
      );
      expect(rhyming.map((choice) => choice.id)).toEqual([challenge.answer]);
    }
    expect(asked.size).toBe(13);
  });

  it('on their own, always sets beside the rhyme a word that starts the same', () => {
    // That is the word a child picks who has first sounds but not yet rhyme: without it, a right answer could
    // be "the one that sounds a bit like it" and no more.
    for (const challenge of independent('rc-rhyme-01')) {
      const prompt = readReadingPicture(challenge.prompt.stimulus);
      if (prompt?.kind !== 'rhyme') throw new Error(challenge.id);
      const tags = challenge.choices
        .filter((choice) => choice.id !== challenge.answer)
        .map((choice) =>
          choice.stimulus.type === 'picture' ? nearness(prompt.word, choice.stimulus.id) : '',
        );
      expect(tags, challenge.id).toContain('same-first-sound');
    }
  });

  it('knows how a word ends from its sounds, not its letters', () => {
    expect(rimeOf('cat')).toBe('at');
    expect(rimeOf('ship')).toBe('ip');
    expect(rimeOf('chin')).toBe('in');
    expect(rimeOf('path')).toBe('ath');
    expect(rimeOf('fish')).toBe('ish');
    // A word that is not spelt as it sounds has no ending that can be worked out.
    expect(rimeOf('moon')).toBeNull();
    expect(rimeOf('zebra')).toBeNull();
    // "ship" and "sun" do not start with the same sound; "moth" and "path" end with the same one.
    expect(nearness('ship', 'sun')).toBe('other-word');
    expect(nearness('ship', 'shop')).toBe('same-first-sound');
    expect(nearness('moth', 'path')).toBe('same-last-sound');
  });
});

describe('clapping a word', () => {
  const beatsOf = (word: string) =>
    (lexicon.words as Record<string, { beats?: string[] }>)[word]?.beats ?? [];

  it('has words of one, two and three beats to clap alone, and at least three of each', () => {
    const counts = [0, 0, 0, 0];
    for (const challenge of independent('rc-syllables-01')) {
      const prompt = readReadingPicture(challenge.prompt.stimulus);
      if (prompt?.kind !== 'beats') throw new Error(challenge.id);
      const beats = beatsOf(prompt.word).length;
      counts[beats] = (counts[beats] ?? 0) + 1;
      // Alone, every number of claps is there to choose from.
      const cards = challenge.choices.map((choice) => {
        const card = readReadingPicture(choice.stimulus);
        return card?.kind === 'claps' ? card.count : 0;
      });
      expect([...cards].sort(), challenge.id).toEqual([1, 2, 3]);
    }
    expect(counts.slice(1).every((count) => count >= 3)).toBe(true);
  });

  it('never claps the same word twice in the activity', () => {
    const words = questions('rc-syllables-01').map((challenge) => {
      const prompt = readReadingPicture(challenge.prompt.stimulus);
      return prompt?.kind === 'beats' ? prompt.word : '';
    });
    expect(new Set(words).size).toBe(words.length);
  });

  it('writes the beats of every word it claps so that they make the word', () => {
    for (const [id, entry] of Object.entries(
      lexicon.words as Record<string, { word: string; beats?: string[] }>,
    )) {
      if (entry.beats) expect(entry.beats.join(''), id).toBe(entry.word);
    }
  });
});

describe('building a word', () => {
  it('gives the letters of a word of three sounds, each once, and nothing else', () => {
    const built = new Set<string>();
    for (const challenge of lessonOf('rc-spell-01').challenges) {
      if (challenge.kind !== 'make' || challenge.task.type !== 'order')
        throw new Error(challenge.id);
      const shown = challenge.prompt.stimulus;
      if (shown?.type !== 'picture') throw new Error(challenge.id);
      built.add(shown.id);
      const letters = (lexicon.words as Record<string, { letters?: string[] }>)[shown.id]?.letters;
      expect(challenge.task.solution, challenge.id).toEqual(letters);
      expect(challenge.task.cards.map((card) => card.id).sort()).toEqual(
        [...(letters ?? [])].sort(),
      );
      expect(challenge.task.solution).toHaveLength(3);
    }
    // Thirteen different words: one shown, two built with help, ten to draw from alone.
    expect(built.size).toBe(13);
  });
});

describe('sentences', () => {
  it('has twelve different sentences to read, every word of every one made of letters that are taught', () => {
    const taught = lettersTaught(pack());
    const sentences = new Set<string>();
    for (const challenge of questions('rc-sentences-01')) {
      const prompt = readReadingPicture(challenge.prompt.stimulus);
      if (prompt?.kind !== 'sentence') throw new Error(challenge.id);
      sentences.add(prompt.words.join(' '));
      for (const word of prompt.words) {
        const letters =
          (lexicon.words as Record<string, { letters?: string[] }>)[word]?.letters ??
          Array.from(word);
        for (const letter of letters) expect(taught.has(letter), `${word}: ${letter}`).toBe(true);
      }
    }
    // A count the documents quote, so it is pinned here.
    expect(sentences.size).toBe(12);
  });

  it('offers only pictures that are one word away from what the sentence says, or the same two swapped', () => {
    for (const challenge of questions('rc-sentences-01')) {
      const prompt = readReadingPicture(challenge.prompt.stimulus);
      const says = prompt?.kind === 'sentence' ? placedBy(prompt.words) : null;
      if (!says) throw new Error(challenge.id);
      for (const choice of challenge.choices) {
        const shown = readReadingPicture(choice.stimulus);
        if (shown?.kind !== 'placed') throw new Error(challenge.id);
        const differing = [
          shown.thing !== says.thing,
          shown.how !== says.how,
          shown.base !== says.base,
        ].filter(Boolean).length;
        const swapped = shown.thing === says.base && shown.base === says.thing;
        if (choice.id === challenge.answer) expect(differing).toBe(0);
        else expect(differing === 1 || swapped, `${challenge.id} ${choice.id}`).toBe(true);
      }
    }
  });

  it('alone, makes every word matter: a first word, a last word and a little word are each put to the test', () => {
    const tags = new Set(
      independent('rc-sentences-01').flatMap((challenge) =>
        Object.values(challenge.misconceptions ?? {}),
      ),
    );
    expect([...tags].sort()).toEqual([
      'first-word-misread',
      'last-word-misread',
      'little-word-misread',
      'words-swapped',
    ]);
  });

  it('shows only things there is a picture of', () => {
    for (const challenge of questions('rc-sentences-01')) {
      for (const choice of challenge.choices) {
        const shown = readReadingPicture(choice.stimulus);
        if (shown?.kind !== 'placed') throw new Error(challenge.id);
        expect(isPictureId(shown.thing), shown.thing).toBe(true);
        expect(isPictureId(shown.base), shown.base).toBe(true);
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
        type: 'select',
        cards: challenge.task.cards,
        solution: ['drum', 'bell'],
      };
    },
    'reading-echo-card': (pack) => {
      at(pack, 'rc-listen-02.demo').task.cards[0].id = 'bongo';
    },
    'reading-scene': (pack) => {
      // Four claps: there is no card for so many.
      at(pack, 'rc-syllables-01.demo').choices[0].stimulus.of.count = 4;
    },
    'reading-no-rime': (pack) => {
      // "moon" is not spelt as it sounds, so nothing says how it ends.
      at(pack, 'rc-rhyme-01.demo').choices[1].stimulus.id = 'moon';
    },
    'reading-no-beats': (pack) => {
      at(pack, 'rc-syllables-01.demo').prompt.stimulus.of.word = 'map';
    },
    'reading-claps-twice': (pack) => {
      const { choices } = at(pack, 'rc-syllables-01.octopus');
      choices[0].stimulus.of.count = choices[1].stimulus.of.count;
    },
    'reading-misconception-wrong': (pack) => {
      const challenge = at(pack, 'rc-rhyme-01.mat');
      const wrong = challenge.choices.find((choice: Loose) => choice.id !== challenge.answer).id;
      challenge.misconceptions[wrong] = 'guessed';
    },
    'reading-sentence-shape': (pack) => {
      at(pack, 'rc-sentences-01.demo').prompt.stimulus.of.words = ['a', 'cat', 'sat'];
    },
    'reading-picture-twice': (pack) => {
      const { choices } = at(pack, 'rc-sentences-01.pen-in-cup');
      choices[0].stimulus.of = { ...choices[1].stimulus.of };
    },
    'reading-build-word': (pack) => {
      // "moon" cannot be built from its sounds one letter at a time.
      at(pack, 'rc-spell-01.demo').prompt.stimulus.id = 'moon';
    },
    'reading-build-tiles': (pack) => {
      at(pack, 'rc-spell-01.demo').task.cards[0].stimulus.letters = 'm';
    },
    'reading-build-order': (pack) => {
      at(pack, 'rc-spell-01.demo').task.solution.reverse();
    },
  };

  it.each(Object.keys(BREAK))('%s', (code) => {
    expect(codes(broken(BREAK[code]!))).toContain(code);
  });

  it('has a case here for every rule Reading Cove has', async () => {
    const source = (await import('@/content/rules/readingCove.ts?raw')).default;
    // The words that are not rules are the tags a wrong word is given, and a kind of challenge.
    const data = ['choose-one', 'other-word', 'same-first-sound', 'same-last-sound'];
    expect(rulesIn(source, data)).toEqual(Object.keys(BREAK).sort());
  });
});
