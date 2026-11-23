import { describe, expect, it, vi } from 'vitest';
import { AudioEngine, type AudioContextLike } from '@/audio/audioEngine';
import { Narrator, bankOf } from '@/audio/voice';

/** A context that can decode and play: each "clip" is just the bytes it was decoded from. */
function fakeContext() {
  const param = () => ({
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const sources: { buffer: unknown; onended: (() => void) | null; stopped: boolean }[] = [];
  const context = {
    state: 'running',
    currentTime: 1,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(() => ({
      type: 'sine',
      frequency: param(),
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createGain: vi.fn(() => ({ gain: param(), connect: vi.fn() })),
    decodeAudioData: vi.fn((data: ArrayBuffer) =>
      data.byteLength === 0 ? Promise.reject(new Error('not audio')) : Promise.resolve(data),
    ),
    createBufferSource: vi.fn(() => {
      const source = {
        buffer: null as unknown,
        onended: null as (() => void) | null,
        stopped: false,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(() => {
          source.stopped = true;
        }),
      };
      sources.push(source);
      return source;
    }),
  };
  return { context: context as unknown as AudioContextLike & typeof context, sources };
}

const bank = bankOf(
  {
    '../assets/voice/en/common/lesson.watch.mp3': '/immutable/lesson.watch-abc.mp3',
    '../assets/voice/en/number-garden/ng.ask.mp3': '/immutable/ng.ask-def.mp3',
    '../assets/voice/en/number-garden/ng.yes.mp3': '/immutable/ng.yes-ghi.mp3',
  },
  { 'lesson.watch': 1, 'ng.ask': 1.8, 'ng.yes': 1.2 },
);

function studio(options: { enabled?: boolean; unlocked?: boolean } = {}) {
  const { context, sources } = fakeContext();
  const engine = new AudioEngine(() => context, options.enabled ?? true);
  if (options.unlocked ?? true) engine.unlock();
  const download = vi.fn((url: string) => Promise.resolve(new TextEncoder().encode(url).buffer));
  let now = 0;
  const narrator = new Narrator(engine, download, () => now);
  narrator.add(bank);
  return {
    context,
    sources,
    engine,
    download,
    narrator,
    wait: (ms: number) => {
      now += ms;
    },
    /** The clip that is playing comes to its end. */
    end: (index = sources.length - 1) => sources[index]?.onended?.(),
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('a bank of lines', () => {
  it('names each line after its file', () => {
    expect(bank.urls).toEqual({
      'lesson.watch': '/immutable/lesson.watch-abc.mp3',
      'ng.ask': '/immutable/ng.ask-def.mp3',
      'ng.yes': '/immutable/ng.yes-ghi.mp3',
    });
  });
});

describe('the voice', () => {
  it('fetches a line the first time it is said, plays it, and says when it has been said', async () => {
    const { narrator, download, sources, end } = studio();
    const saying = narrator.say('ng.ask');
    await settle();
    expect(download).toHaveBeenCalledWith('/immutable/ng.ask-def.mp3');
    expect(sources).toHaveLength(1);
    end();
    await expect(saying).resolves.toBe('heard');
    expect(narrator.stats).toEqual({ said: 1, unheard: 0 });
  });

  it('keeps a line it has fetched, and does not fetch it again', async () => {
    const { narrator, download, end } = studio();
    void narrator.say('ng.ask');
    await settle();
    end();
    void narrator.say('ng.ask');
    await settle();
    expect(download).toHaveBeenCalledTimes(1);
    expect(narrator.stats.said).toBe(2);
  });

  it('says one line at a time: a new line cuts the old one short', async () => {
    const { narrator, sources } = studio();
    void narrator.say('ng.ask');
    await settle();
    void narrator.say('ng.yes');
    await settle();
    expect(sources).toHaveLength(2);
    expect(sources[0]?.stopped).toBe(true);
    expect(sources[1]?.stopped).toBe(false);
  });

  it('stops talking when hushed, and drops a line that was still on its way', async () => {
    const { narrator, sources } = studio();
    void narrator.say('ng.ask');
    await settle();
    narrator.hush();
    expect(sources[0]?.stopped).toBe(true);

    const late = narrator.say('ng.yes');
    narrator.hush();
    await expect(late).resolves.toBe('unheard');
    expect(sources).toHaveLength(1);
  });

  it('has lines on hand before they are wanted', async () => {
    const { narrator, download, sources } = studio();
    narrator.prepare(['ng.ask', 'ng.yes', 'no.such.line']);
    await settle();
    expect(download).toHaveBeenCalledTimes(2);
    // Fetched, not played.
    expect(sources).toHaveLength(0);
  });

  it('reports how long a line takes, so that what is shown can wait for it', () => {
    const { narrator } = studio();
    expect(narrator.seconds('ng.ask')).toBe(1.8);
    expect(narrator.seconds('no.such.line')).toBe(0);
  });
});

describe('when the voice cannot be heard', () => {
  it('says nothing, fetches nothing and takes no time while the sound is off', async () => {
    const { narrator, download } = studio({ enabled: false });
    expect(narrator.seconds('ng.ask')).toBe(0);
    narrator.prepare(['ng.ask']);
    await expect(narrator.say('ng.ask')).resolves.toBe('unheard');
    expect(download).not.toHaveBeenCalled();
  });

  it('does the same before the first touch has woken the audio', async () => {
    const { narrator, download } = studio({ unlocked: false });
    expect(narrator.seconds('ng.ask')).toBe(0);
    await expect(narrator.say('ng.ask')).resolves.toBe('unheard');
    expect(download).not.toHaveBeenCalled();
  });

  it('is done without when a download fails, and tries again the next time', async () => {
    const { narrator, download, end } = studio();
    download.mockRejectedValueOnce(new Error('offline'));
    await expect(narrator.say('ng.ask')).resolves.toBe('unheard');
    expect(narrator.stats).toEqual({ said: 0, unheard: 1 });
    // Still worth waiting for: the failure was the network's, not the file's.
    expect(narrator.seconds('ng.ask')).toBe(1.8);

    const again = narrator.say('ng.ask');
    await settle();
    end();
    await expect(again).resolves.toBe('heard');
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('remembers a file that will not decode, and neither waits for it nor fetches it again', async () => {
    const { narrator, download } = studio();
    download.mockResolvedValueOnce(new ArrayBuffer(0));
    await expect(narrator.say('ng.ask')).resolves.toBe('unheard');
    expect(narrator.seconds('ng.ask')).toBe(0);
    await expect(narrator.say('ng.ask')).resolves.toBe('unheard');
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('does not say a line that took so long to arrive that it is no longer about what is on the screen', async () => {
    const { narrator, download, sources, wait } = studio();
    let deliver: (data: ArrayBuffer) => void = () => undefined;
    download.mockReturnValueOnce(
      new Promise<ArrayBuffer>((resolve) => {
        deliver = resolve;
      }),
    );
    const saying = narrator.say('ng.ask');
    wait(4000);
    deliver(new ArrayBuffer(8));
    await expect(saying).resolves.toBe('unheard');
    expect(sources).toHaveLength(0);
  });

  it('does not know a line nobody has told it about', async () => {
    const { narrator } = studio();
    expect(narrator.has('ng.ask')).toBe(true);
    expect(narrator.has('never.heard.of.it')).toBe(false);
    await expect(narrator.say('never.heard.of.it')).resolves.toBe('unheard');
  });
});

describe('the cues, while the voice is speaking', () => {
  it('step back, and come forward again when it has finished', async () => {
    const { narrator, engine, context, end } = studio();
    // The first cue makes the gain every cue goes through.
    engine.play('tap');
    const bus = context.createGain.mock.results[0]?.value as {
      gain: { setValueAtTime: ReturnType<typeof vi.fn> };
    };
    const levels = () => bus.gain.setValueAtTime.mock.calls.map(([level]) => level as number);
    expect(levels()).toEqual([1]);

    void narrator.say('ng.ask');
    await settle();
    expect(levels().at(-1)).toBeLessThan(0.5);
    end();
    expect(levels().at(-1)).toBe(1);
  });
});
