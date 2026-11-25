import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The voice is files made ahead of time (scripts/voice/make_voice.py). These tests keep the files, the list of them
 * and the words the game shows saying the same thing: a line that is changed without its clip being made again, a
 * clip nothing asks for, a file swapped for another — each fails here.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

type Kind = 'line' | 'read' | 'word' | 'onset' | 'slow' | 'beats' | 'sound';

interface Clip {
  group: string;
  kind: Kind;
  text: string;
  file: string;
  bytes: number;
  seconds: number;
  sha256: string;
  heard: string;
  check: 'matches' | 'in-sentence' | 'differs' | 'made';
  takes: number;
  reviewed: string | null;
  /** For a clip with several things in it to follow: when each begins, in seconds from its start. */
  marks?: number[];
}

const manifest = JSON.parse(read('src/voice/manifest.json')) as {
  voice: Record<string, unknown>;
  clips: Record<string, Clip>;
};
const clips = Object.entries(manifest.clips);

/** What each section of a lines file holds. */
const KINDS: Record<string, Kind> = {
  lines: 'line',
  read: 'read',
  words: 'word',
  onsets: 'onset',
  slow: 'slow',
  beats: 'beats',
  sounds: 'sound',
};

/**
 * How many things a clip has in it to follow, from how it is written: the words of a sentence read aloud, the
 * beats of "el-e-phant", the sounds of "m-a-p". `null` for a clip that is one thing from beginning to end.
 */
function partsOf(clip: Clip): number | null {
  if (clip.kind === 'read') return clip.text.trim().split(/\s+/).length;
  if (clip.kind === 'beats') return clip.text.split('-').length;
  if (clip.kind === 'slow' && clip.text.includes('-')) return clip.text.split('-').length;
  return null;
}

/** Every clip the game asks for, gathered the way the script that makes them gathers it. */
function wanted(): Map<string, { group: string; kind: string; text: string }> {
  const found = new Map<string, { group: string; kind: string; text: string }>();
  for (const name of readdirSync(join(root, 'src/content/packs'))) {
    const pack = JSON.parse(read(`src/content/packs/${name}`)) as {
      world: string;
      strings: { en: Record<string, string> };
    };
    for (const [key, text] of Object.entries(pack.strings.en)) {
      found.set(key, { group: pack.world, kind: 'line', text });
    }
  }
  const files = [
    'src/voice/lines.json',
    ...readdirSync(join(root, 'src/voice/lines')).map((name) => `src/voice/lines/${name}`),
  ];
  for (const file of files) {
    const { groups } = JSON.parse(read(file)) as {
      groups: Record<string, Record<string, Record<string, string>>>;
    };
    for (const [group, sections] of Object.entries(groups)) {
      for (const [section, entries] of Object.entries(sections)) {
        const kind = KINDS[section];
        if (!kind) throw new Error(`${file} has a section called "${section}".`);
        for (const [key, text] of Object.entries(entries)) found.set(key, { group, kind, text });
      }
    }
  }
  return found;
}

/**
 * Clips the speech recogniser heard differently from what was meant, each with what it heard and why the clip is
 * kept all the same. A clip that is heard differently and is not listed here fails the suite: make it again
 * (`--again KEY`), or reword the line, or — only after listening to it — list it.
 */
const HEARD_DIFFERENTLY: Record<string, string> = {};

describe('the voice', () => {
  it('has a clip for every line the game can say, and for nothing else', () => {
    const asked = wanted();
    expect(clips.map(([key]) => key).sort()).toEqual([...asked.keys()].sort());
    for (const [key, clip] of clips) {
      expect({ group: clip.group, kind: clip.kind, text: clip.text }, key).toEqual(asked.get(key));
    }
  });

  it('keeps each clip where the manifest says, unchanged since it was made', () => {
    for (const [key, clip] of clips) {
      expect(clip.file, key).toBe(`src/assets/voice/en/${clip.group}/${key}.mp3`);
      const path = join(root, clip.file);
      expect(existsSync(path), clip.file).toBe(true);
      const bytes = readFileSync(path);
      expect(bytes.length, key).toBe(clip.bytes);
      expect(createHash('sha256').update(bytes).digest('hex'), key).toBe(clip.sha256);
    }
  });

  it('has no clip lying about that the manifest does not know', () => {
    const known = new Set(clips.map(([, clip]) => clip.file));
    const base = 'src/assets/voice/en';
    const onDisk = readdirSync(join(root, base)).flatMap((group) =>
      statSync(join(root, base, group)).isDirectory()
        ? readdirSync(join(root, base, group)).map((name) => `${base}/${group}/${name}`)
        : [`${base}/${group}`],
    );
    expect(onDisk.filter((file) => !known.has(file))).toEqual([]);
  });

  it('tells the game how long each clip lasts, group by group', () => {
    const groups = new Map<string, Record<string, number>>();
    for (const [key, clip] of clips) {
      groups.set(clip.group, { ...groups.get(clip.group), [key]: clip.seconds });
    }
    for (const [group, timings] of groups) {
      expect(JSON.parse(read(`src/voice/timings/${group}.json`)), group).toEqual(timings);
    }
  });

  it('is made of short, small clips: a sentence or a word each', () => {
    for (const [key, clip] of clips) {
      expect(clip.seconds, key).toBeGreaterThan(0.15);
      expect(clip.seconds, key).toBeLessThan(clip.kind === 'line' ? 7 : 3);
      expect(clip.bytes, key).toBeLessThan(60 * 1024);
    }
  });

  it('was heard to say what it should by a speech recogniser, clip by clip', () => {
    const differing = Object.fromEntries(
      clips.filter(([, clip]) => clip.check === 'differs').map(([key, clip]) => [key, clip.heard]),
    );
    expect(differing).toEqual(HEARD_DIFFERENTLY);
    // A sentence is either heard word for word or it is listed above: "nearly" is not a result a sentence can have.
    // A sound that is not speech has nothing to be heard as, and only such a sound may say so.
    for (const [key, clip] of clips) {
      if (clip.kind === 'line' || clip.kind === 'read') {
        expect(['matches', 'differs'], key).toContain(clip.check);
      }
      expect(clip.check === 'made', key).toBe(clip.kind === 'sound');
    }
  });

  it('says where each word, beat or sound begins in every clip that has them to follow, and in no other', () => {
    let marked = 0;
    for (const [key, clip] of clips) {
      const parts = partsOf(clip);
      if (parts === null) {
        expect(clip.marks, key).toBeUndefined();
        continue;
      }
      marked += 1;
      const marks = clip.marks ?? [];
      expect(marks, key).toHaveLength(parts);
      // In order, each after the one before, and all of them inside the clip.
      for (const [index, at] of marks.entries()) {
        expect(at, key).toBeGreaterThanOrEqual(0);
        expect(at, key).toBeLessThan(clip.seconds);
        if (index > 0) expect(at, key).toBeGreaterThan(marks[index - 1] ?? 0);
      }
      // A word that is cut out begins with its first sound; a sentence may begin with a breath.
      if (clip.kind !== 'read') expect(marks[0], key).toBe(0);
      else expect(marks[0], key).toBeLessThan(0.2);
    }
    // Every word that is said slowly is written with its sounds apart, so every one of them is marked.
    expect(clips.filter(([, clip]) => clip.kind === 'slow' && !clip.text.includes('-'))).toEqual(
      [],
    );
    expect(marked).toBeGreaterThan(40);
  });

  it('gives the game those marks group by group, and no file of marks for a group without any', () => {
    const groups = new Map<string, Record<string, number[]>>();
    for (const [key, clip] of clips) {
      if (clip.marks) groups.set(clip.group, { ...groups.get(clip.group), [key]: clip.marks });
    }
    const files = readdirSync(join(root, 'src/voice/marks')).sort();
    expect(files).toEqual([...groups.keys()].sort().map((group) => `${group}.json`));
    for (const [group, marks] of groups) {
      expect(JSON.parse(read(`src/voice/marks/${group}.json`)), group).toEqual(marks);
    }
  });

  it('gives a sound that begins softly its whole beginning: "ship" is not cut down to "chip"', () => {
    // The synthesiser says a soft first sound begins later than it does. A slow word cut there lost its first
    // tenth of a second, and a recogniser heard "ship" as "chip". Cut where the silence before the word ends, the
    // first sound of each of these lasts a fifth of a second and more.
    for (const key of ['slow.ship', 'slow.shop', 'slow.sun', 'slow.fish', 'slow.fan']) {
      const clip = manifest.clips[key];
      expect(clip, key).toBeDefined();
      expect(clip?.check, key).toBe('matches');
      expect((clip?.marks?.[1] ?? 0) - (clip?.marks?.[0] ?? 0), key).toBeGreaterThanOrEqual(0.15);
    }
  });

  it('says of every clip whether a person has listened to it: a date, or not yet', () => {
    for (const [key, clip] of clips) {
      expect(clip.reviewed === null || /^\d{4}-\d{2}-\d{2}$/.test(clip.reviewed), key).toBe(true);
    }
  });

  it('records what it was made with', () => {
    expect(manifest.voice).toMatchObject({
      model: expect.stringMatching(/\.onnx$/),
      modelSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });
});
