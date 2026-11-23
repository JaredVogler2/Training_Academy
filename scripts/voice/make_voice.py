"""Make the game's voice: one small sound file for every line a child hears.

    python -I scripts/voice/make_voice.py --voice <voice.onnx> --listener <whisper-model-dir> [--only KEY ...]
                                          [--again KEY ...] [--prune] [--check]

What is said comes from these places, and nowhere else:

  src/content/packs/*.json   every line of every content pack (`strings.en`): each is spoken as written
  src/voice/lines.json       the lines every world shares, and the counting words
  src/voice/lines/*.json     what a world needs beside its lines: the names of its pictures, said plainly, with
                             the first sound drawn out, and slowly; and sounds that are not speech at all

A clip is of one of five kinds:

  line    a sentence, said as it is written
  word    one word, cut from the end of a sentence (said alone, the synthesiser clips it)
  onset   one word with its first sound drawn out: "sssun"
  slow    one word said slowly, sound running into sound: "mmmaaap"
  sound   not speech: a drum, a bell. Made from arithmetic, by the recipes at the foot of this file

What is written:

  src/assets/voice/en/<group>/<key>.mp3   the clips (mono MP3; a group is a world, or `common`)
  src/voice/manifest.json                 every clip: its words, how long it is, a checksum, what a speech
                                          recogniser heard when it was played back, and whether a person has
                                          listened to it yet (nobody has, until someone says so there)
  src/voice/timings/<group>.json          how long each clip of a group lasts, for the game

The voice is a speech synthesiser run here, on this machine, ahead of time. The game itself never synthesises
speech and never fetches a sound from anywhere but its own files.

A clip is only made when it is missing or its words have changed, so clips that have been listened to and passed
stay exactly as they were. `--again KEY` makes named clips afresh; `--prune` deletes clips nothing asks for any
more; `--check` makes nothing and fails if anything is missing, stale or left over (it needs neither model).

How a clip is checked. Nobody can listen to several hundred clips every time one line changes, and the tool that
makes them cannot listen at all. So every clip is played to a speech recogniser, and what it heard is written down
beside what was meant:

  matches       it heard exactly the words that were meant (or a word that sounds the same: "son" for "sun")
  in-sentence   (single words) it heard the word in the sentence the word was cut from, but not from the cut alone;
                a short word on its own is hard for a recogniser, so this is the usual result for those
  differs       it heard something else; the manifest says what
  made          (sounds that are not speech) there is nothing to recognise

A sentence is tried several times, because the synthesiser does not say a thing the same way twice, and the first
take that is heard right is kept. This is a filter for gross faults — a wrong word, a clipped ending, noise — and
no more than that. It cannot tell whether a clip sounds kind, or clear to a three-year-old. A person has to listen;
the grown-ups' area has a page for it, and docs/QUALITY_REPORT.md says how far that has got.
"""

import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
import wave
from math import gcd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACKS = ROOT / 'src/content/packs'
LINES = ROOT / 'src/voice/lines.json'
WORLD_LINES = ROOT / 'src/voice/lines'
MANIFEST = ROOT / 'src/voice/manifest.json'
TIMINGS = ROOT / 'src/voice/timings'
CLIPS = ROOT / 'src/assets/voice/en'

# How the voice is asked to speak: a little slower than its usual pace, and a little steadier.
SENTENCE = {'length_scale': 1.14, 'noise_scale': 0.5, 'noise_w_scale': 0.6}
# A word on its own is said at the end of this, after a comma, and cut out: said alone, the synthesiser clips it.
CARRIER = 'The next word is, {word}.'
WORD = {'length_scale': 1.2, 'noise_scale': 0.5, 'noise_w_scale': 0.6}
TAKES = 5
BITRATE = '48k'
# A first sound drawn out: the sound is given to the synthesiser this many times over.
ONSET_REPEATS = 4
# Ways of saying a word slowly, tried in this order: the synthesiser asked to speak slowly, and a word said at
# its usual pace stretched afterwards. The first that is still heard as the word is kept.
SLOW = [('voice', 2.2), ('voice', 2.6), ('stretch', 0.5), ('stretch', 0.45), ('voice', 1.9)]
SLOW_AT_LEAST = 0.75
# Words a recogniser may write instead, because they sound exactly the same.
SOUND_ALIKE = {
    'sun': {'son'}, 'nose': {'knows'}, 'mat': {'matt'}, 'ant': {'aunt'}, 'fin': {'finn'}, 'ring': {'wring'},
    'rain': {'reign', 'rein'}, 'seed': {'cede'}, 'axe': {'ax'}, 'ink': {'inc'}, 'net': {'nett'}, 'pin': {'pinn'},
    'tin': {'tinn'}, 'cot': {'caught', 'cott'}, 'hut': {'hutt'}, 'ram': {'ramm'}, 'pan': {'pann'}, 'can': {'cann'},
    'one': {'won'}, 'two': {'too', 'to'}, 'four': {'for'}, 'eight': {'ate'}, 'bell': {'belle'}, 'log': {'logue'},
}
KINDS = {'lines': 'line', 'words': 'word', 'onsets': 'onset', 'slow': 'slow', 'sounds': 'sound'}

NUMBERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']


def wanted():
    """Every clip the game asks for: key -> (group, kind, text)."""
    clips = {}

    def add(key, group, kind, text):
        if key in clips and clips[key][2] != text:
            raise SystemExit(f'"{key}" is asked for twice with different words.')
        clips[key] = (group, kind, text)

    for path in sorted(PACKS.glob('*.json')):
        pack = json.loads(path.read_text())
        for key, text in pack['strings']['en'].items():
            add(key, pack['world'], 'line', text)
    for path in [LINES, *sorted(WORLD_LINES.glob('*.json'))]:
        for group, kinds in json.loads(path.read_text())['groups'].items():
            for section, entries in kinds.items():
                for key, text in entries.items():
                    add(key, group, KINDS[section], text)
    for key in clips:
        if not re.fullmatch(r'[a-z0-9]+(?:[.-][a-z0-9]+)*', key):
            raise SystemExit(f'"{key}" cannot be a file name.')
    return clips


def plain(text):
    """Words only, the way they are compared: no capitals, no punctuation, numerals spelt out."""
    words = re.sub(r"[^a-z0-9' ]+", ' ', text.lower().replace('’', "'")).split()
    return ' '.join(NUMBERS[int(word)] if word.isdigit() and int(word) < len(NUMBERS) else word for word in words)


def same_words(heard, wanted):
    """The same words, however the recogniser chose to space them: "sand castle" is "sandcastle"."""
    return heard == wanted or heard.replace(' ', '') == wanted.replace(' ', '')


def clip_path(group, key):
    return CLIPS / group / f'{key}.mp3'


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_manifest():
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text())
    return {'clips': {}}


def stale(clips, manifest):
    """What is missing or out of date, and what is left over."""
    todo = []
    for key, (group, kind, text) in clips.items():
        entry = manifest['clips'].get(key)
        path = clip_path(group, key)
        if entry is None or entry['text'] != text or entry['kind'] != kind or entry['group'] != group:
            todo.append(key)
        elif not path.exists() or sha256(path) != entry['sha256']:
            todo.append(key)
    leftover = [key for key in manifest['clips'] if key not in clips]
    files = {clip_path(group, key) for key, (group, _, _) in clips.items()}
    strays = [path for path in sorted(CLIPS.glob('*/*.mp3')) if path not in files]
    return todo, leftover, strays


class Studio:
    """The synthesiser and the recogniser, loaded once."""

    def __init__(self, voice_path, listener_path):
        import numpy as np
        from faster_whisper import WhisperModel
        from piper import PiperVoice, SynthesisConfig
        from scipy.signal import resample_poly

        self.np = np
        self.config = SynthesisConfig
        self.resample = resample_poly
        self.voice = PiperVoice.load(voice_path)
        self.rate = self.voice.config.sample_rate
        self.listener = WhisperModel(listener_path, device='cpu', compute_type='int8')

    def say(self, text, settings):
        chunks = list(self.voice.synthesize(text, self.config(**settings)))
        return self.np.concatenate([chunk.audio_float_array for chunk in chunks])

    def words_heard(self, audio, pad=0.5):
        """What the recogniser hears, word by word: (word, start, end), in seconds from the start of `audio`."""
        np = self.np
        step = gcd(16000, self.rate)
        at16k = self.resample(audio, 16000 // step, self.rate // step).astype(np.float32)
        silence = np.zeros(int(16000 * pad), dtype=np.float32)
        segments, _ = self.listener.transcribe(
            np.concatenate([silence, at16k, silence]),
            language='en',
            beam_size=5,
            word_timestamps=True,
            condition_on_previous_text=False,
        )
        heard = []
        for segment in segments:
            for word in segment.words or []:
                heard.append((word.word.strip(), word.start - pad, word.end - pad))
        return heard

    def heard(self, audio):
        return plain(' '.join(word for word, _, _ in self.words_heard(audio)))

    @staticmethod
    def same_word(heard, word):
        target = plain(word)
        return heard == target or heard in SOUND_ALIKE.get(target, set())

    def trimmed(self, audio, lead=0.02, tail=0.05):
        """Without the silence at either end, faded in and out, and at one loudness for every clip."""
        np = self.np
        frame = max(1, int(self.rate * 0.005))
        level = np.abs(audio)
        loud = np.nonzero(level > 0.02 * float(level.max()))[0]
        if len(loud) == 0:
            return audio
        begin = max(0, int(loud[0]) - int(self.rate * lead))
        end = min(len(audio), int(loud[-1]) + int(self.rate * tail))
        cut = audio[begin:end].astype(np.float32).copy()
        fade_in = min(len(cut), frame)
        fade_out = min(len(cut), frame * 8)
        cut[:fade_in] *= np.linspace(0, 1, fade_in, dtype=np.float32)
        cut[-fade_out:] *= np.linspace(1, 0, fade_out, dtype=np.float32)
        # One loudness for all: the level of the loudest tenth of a second, brought to the same mark.
        window = max(1, int(self.rate * 0.1))
        power = np.convolve(cut**2, np.ones(window) / window, mode='valid') if len(cut) > window else cut**2
        loudest = float(np.sqrt(power.max()))
        if loudest > 0:
            cut *= 0.2 / loudest
        peak = float(np.abs(cut).max())
        if peak > 0.97:
            cut *= 0.97 / peak
        return cut

    def sentence(self, text):
        """The first of a few takes that is heard right; failing that, the last one."""
        result = None
        for take in range(1, TAKES + 1):
            audio = self.trimmed(self.say(text, SENTENCE))
            heard = self.heard(audio)
            result = (audio, heard, 'matches' if same_words(heard, plain(text)) else 'differs', take)
            if result[2] == 'matches':
                break
        return result

    def last_word(self, audio, text):
        """The last word of a sentence, cut out at the time the recogniser says it begins, and how it was heard."""
        np = self.np
        found = self.words_heard(audio)
        if not found:
            return None
        last_word, start, _ = found[-1]
        in_sentence = self.same_word(plain(last_word), text)
        # Cut at the quietest hundredth of a second near where the word is said to begin.
        frame = int(self.rate * 0.01)
        low = max(0, int((start - 0.12) * self.rate))
        high = max(low + 1, min(len(audio) - frame, int((start + 0.12) * self.rate)))
        begin = min(range(low, high, max(1, frame // 2)), key=lambda at: float(np.mean(audio[at : at + frame] ** 2)))
        clip = self.trimmed(audio[begin:], lead=0.01)
        alone = self.heard(clip)
        check = 'matches' if self.same_word(alone, text) else 'in-sentence' if in_sentence else 'differs'
        return clip, alone or '(nothing)', check

    def best_of(self, text, takes):
        """Try each way of making a word in turn; keep the first heard right, or failing that the best there was."""
        ranks = ['matches', 'in-sentence', 'differs']
        best = None
        for take, make in enumerate(takes, start=1):
            result = self.last_word(make(), text)
            if result is None:
                continue
            clip, heard, check = result
            if best is None or ranks.index(check) < ranks.index(best[2]):
                best = (clip, heard, check, take)
            if check == 'matches':
                break
        if best is None:
            raise SystemExit(f'Nothing was heard for the word "{text}".')
        return best

    def word(self, text):
        """A word cut from the end of a sentence."""
        return self.best_of(text, [lambda: self.say(CARRIER.format(word=text), WORD)] * TAKES)

    def from_phonemes(self, phonemes, settings):
        np = self.np
        ids = self.voice.phonemes_to_ids(phonemes)
        audio = np.asarray(self.voice.phoneme_ids_to_audio(ids, self.config(**settings))).astype(np.float32).reshape(-1)
        return audio / 32768.0 if float(np.abs(audio).max()) > 2 else audio

    def onset(self, text):
        """A word with its first sound drawn out: the sound is given to the synthesiser several times over."""
        sentence = self.voice.phonemize(CARRIER.format(word=text))[0]
        alone = [phoneme for phoneme in self.voice.phonemize(text)[0] if phoneme not in '.,!? ']
        end = len(sentence) - 1 - sentence[::-1].index('.')
        first = end - len(alone)
        if sentence[first] in 'ˈˌ':
            first += 1
        drawn_out = sentence[:first] + [sentence[first]] * ONSET_REPEATS + sentence[first + 1 :]
        return self.best_of(text, [lambda: self.from_phonemes(drawn_out, WORD)] * TAKES)

    def stretched(self, audio, tempo):
        """The same sound, slower, at the same pitch."""
        np = self.np
        with tempfile.TemporaryDirectory() as scratch:
            source, target = Path(scratch) / 'in.wav', Path(scratch) / 'out.wav'
            with wave.open(str(source), 'wb') as file:
                file.setnchannels(1)
                file.setsampwidth(2)
                file.setframerate(self.rate)
                file.writeframes((np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes())
            # The filter will not go below half speed in one step; two steps get there.
            steps = f'atempo={tempo}' if tempo >= 0.5 else f'atempo=0.5,atempo={tempo / 0.5:.3f}'
            subprocess.run(
                ['ffmpeg', '-v', 'error', '-y', '-i', str(source), '-filter:a', steps, str(target)],
                check=True,
            )
            with wave.open(str(target)) as file:
                frames = file.readframes(file.getnframes())
        return np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768

    def slow(self, text):
        """A word said slowly, sound running into sound."""
        def way(method, amount):
            if method == 'voice':
                return lambda: self.say(CARRIER.format(word=text), {**WORD, 'length_scale': amount})
            return lambda: self.stretched(self.say(CARRIER.format(word=text), WORD), amount)

        clip, heard, check, take = self.best_of(text, [way(method, amount) for method, amount in SLOW])
        # A word said slowly takes a while to say. One that does not was cut in the wrong place, whatever was heard.
        if len(clip) / self.rate < SLOW_AT_LEAST:
            check = 'differs'
        return clip, heard, check, take

    def sound(self, text):
        """A sound that is not speech, from its recipe."""
        recipe = RECIPES.get(text)
        if recipe is None:
            raise SystemExit(f'There is no recipe for a sound called "{text}".')
        return self.trimmed(recipe(self.np, self.rate).astype(self.np.float32)), '', 'made', 1

    def write(self, audio, path):
        np = self.np
        path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory() as scratch:
            source = Path(scratch) / 'clip.wav'
            with wave.open(str(source), 'wb') as file:
                file.setnchannels(1)
                file.setsampwidth(2)
                file.setframerate(self.rate)
                file.writeframes((np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes())
            subprocess.run(
                ['ffmpeg', '-v', 'error', '-y', '-i', str(source), '-ac', '1', '-ar', str(self.rate),
                 '-codec:a', 'libmp3lame', '-b:a', BITRATE, '-write_xing', '0', '-id3v2_version', '0',
                 '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', str(path)],
                check=True,
            )  # fmt: skip
        return len(audio) / self.rate


def save(manifest, clips):
    manifest['clips'] = {key: manifest['clips'][key] for key in sorted(manifest['clips'])}
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    TIMINGS.mkdir(parents=True, exist_ok=True)
    groups = {}
    for key, (group, _, _) in clips.items():
        entry = manifest['clips'].get(key)
        if entry:
            groups.setdefault(group, {})[key] = entry['seconds']
    for group, timings in groups.items():
        path = TIMINGS / f'{group}.json'
        path.write_text(json.dumps({key: timings[key] for key in sorted(timings)}, indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--voice', help='the voice model (.onnx, with its .onnx.json beside it)')
    parser.add_argument('--listener', help='the speech recogniser (a faster-whisper model directory)')
    parser.add_argument('--only', nargs='*', default=None, help='make only these clips, if they need making')
    parser.add_argument('--again', nargs='*', default=[], help='make these clips afresh')
    parser.add_argument('--prune', action='store_true', help='delete clips nothing asks for')
    parser.add_argument('--check', action='store_true', help='make nothing; fail if anything is out of date')
    args = parser.parse_args()

    clips = wanted()
    manifest = load_manifest()
    todo, leftover, strays = stale(clips, manifest)

    if args.check:
        for key in todo:
            print(f'needs making: {key}')
        for key in leftover:
            print(f'in the manifest but not asked for: {key}')
        for path in strays:
            print(f'a clip nothing asks for: {path.relative_to(ROOT)}')
        if todo or leftover or strays:
            raise SystemExit(1)
        print(f'{len(clips)} clips, all present and as the manifest says.')
        return

    if args.prune:
        for key in leftover:
            del manifest['clips'][key]
        for path in strays:
            path.unlink()
            print(f'deleted {path.relative_to(ROOT)}')

    todo = sorted(set(todo) | set(args.again))
    if args.only is not None:
        todo = [key for key in todo if key in args.only]
    unknown = [key for key in todo if key not in clips]
    if unknown:
        raise SystemExit(f'Not asked for by anything: {", ".join(unknown)}')
    if not todo:
        save(manifest, clips)
        print(f'{len(clips)} clips, nothing to make.')
        return
    if not args.voice or not args.listener:
        raise SystemExit(f'{len(todo)} clips need making: give --voice and --listener.')

    studio = Studio(args.voice, args.listener)
    model = Path(args.voice)
    manifest['voice'] = {
        'madeWith': 'piper-tts 1.8.0, run ahead of time; nothing is synthesised in the game',
        'model': model.name,
        'modelSha256': sha256(model),
        'modelFrom': 'rhasspy/piper-voices on Hugging Face (repository licence: MIT)',
        'modelTrainedOn': 'LibriVox recordings (public domain), per the model card',
        'settings': {'sentence': SENTENCE, 'word': WORD, 'carrier': CARRIER},
        'format': f'MP3, mono, {studio.rate} Hz, {BITRATE}',
        'checkedWith': f'faster-whisper 1.2.1, model {Path(args.listener).name}',
    }
    differs = 0
    for index, key in enumerate(todo, start=1):
        group, kind, text = clips[key]
        make = {'line': studio.sentence, 'word': studio.word, 'onset': studio.onset, 'slow': studio.slow, 'sound': studio.sound}
        audio, heard, check, takes = make[kind](text)
        path = clip_path(group, key)
        seconds = studio.write(audio, path)
        manifest['clips'][key] = {
            'group': group,
            'kind': kind,
            'text': text,
            'file': str(path.relative_to(ROOT)),
            'bytes': path.stat().st_size,
            'seconds': round(seconds, 2),
            'sha256': sha256(path),
            'heard': heard,
            'check': check,
            'takes': takes,
            # Whether a person has listened to this clip and passed it: null until one has.
            'reviewed': None,
        }
        differs += check == 'differs'
        print(f'[{index}/{len(todo)}] {check:11} {key:36} {seconds:4.1f}s  "{text}"' + (f'  heard: "{heard}"' if check != 'matches' else ''))
        if index % 5 == 0:
            save(manifest, clips)
    save(manifest, clips)
    total = sum(entry['bytes'] for entry in manifest['clips'].values())
    print(f'{len(todo)} made; {differs} heard differently. {len(manifest["clips"])} clips in all, {total / 1024:.0f} kB.')


# ----------------------------------------------------------------------------------------------------------------------
# Sounds that are not speech. Each recipe is a few lines of arithmetic: there is no recording behind any of them.
# They are instruments of the game's own — the drum in the picture makes this sound because the game says so — and
# not imitations to be recognised from life.
# ----------------------------------------------------------------------------------------------------------------------


def _envelope(np, length, rate, attack=0.004, decay=6.0):
    t = np.arange(length) / rate
    return np.minimum(1, t / attack) * np.exp(-decay * t)


def _noise(np, length, seed):
    return np.random.default_rng(seed).standard_normal(length)


def _band(np, signal, rate, low, high):
    """Keep what lies between two frequencies, by zeroing the rest of the spectrum."""
    spectrum = np.fft.rfft(signal)
    freqs = np.fft.rfftfreq(len(signal), 1 / rate)
    spectrum[(freqs < low) | (freqs > high)] = 0
    return np.fft.irfft(spectrum, len(signal))


def drum(np, rate):
    """One low thump: a note that falls as it dies away, with the tap of the stick at the front."""
    length = int(rate * 0.5)
    t = np.arange(length) / rate
    pitch = 62 + 90 * np.exp(-18 * t)
    body = np.sin(2 * np.pi * np.cumsum(pitch) / rate) * _envelope(np, length, rate, decay=9)
    tap = _band(np, _noise(np, length, 1), rate, 900, 5000) * _envelope(np, length, rate, attack=0.001, decay=120)
    return body + 0.35 * tap


def bell(np, rate):
    """One clear ring: a few notes that do not quite agree, the high ones dying first."""
    length = int(rate * 1.1)
    t = np.arange(length) / rate
    partials = [(1, 1.0, 3.5), (2.76, 0.5, 5), (5.4, 0.28, 8), (8.93, 0.14, 12)]
    return sum(level * np.sin(2 * np.pi * 880 * ratio * t) * _envelope(np, length, rate, decay=decay)
               for ratio, level, decay in partials)


def shaker(np, rate):
    """Two short rustles: there and back."""
    length = int(rate * 0.55)
    out = np.zeros(length)
    for start, level in ((0.0, 1.0), (0.2, 0.85)):
        burst = int(rate * 0.16)
        grain = _band(np, _noise(np, burst, 7 + int(start * 100)), rate, 3500, 9500)
        t = np.arange(burst) / rate
        shape = np.minimum(1, t / 0.03) * np.exp(-22 * np.maximum(0, t - 0.03))
        at = int(rate * start)
        out[at : at + burst] += level * grain * shape
    return out


def whistle(np, rate):
    """One breathy toot that lifts a little at the end."""
    length = int(rate * 0.55)
    t = np.arange(length) / rate
    pitch = 1750 + 120 * np.clip((t - 0.3) / 0.25, 0, 1) + 14 * np.sin(2 * np.pi * 6 * t)
    tone = np.sin(2 * np.pi * np.cumsum(pitch) / rate)
    breath = 0.12 * _band(np, _noise(np, length, 3), rate, 1500, 6000)
    shape = np.minimum(1, t / 0.03) * np.minimum(1, (0.55 - t) / 0.08)
    return (tone + breath) * shape


def bird(np, rate):
    """Three quick chirps, each sliding upwards."""
    length = int(rate * 0.75)
    out = np.zeros(length)
    for start in (0.0, 0.22, 0.44):
        chirp = int(rate * 0.13)
        t = np.arange(chirp) / rate
        pitch = 2600 + 1700 * (t / 0.13) ** 0.7
        shape = np.sin(np.pi * t / 0.13) ** 2
        at = int(rate * start)
        out[at : at + chirp] += np.sin(2 * np.pi * np.cumsum(pitch) / rate) * shape
    return out


def clock(np, rate):
    """Tick, tock, tick, tock: two small knocks, one a little lower than the other."""
    length = int(rate * 1.15)
    out = np.zeros(length)
    for index, start in enumerate((0.0, 0.3, 0.6, 0.9)):
        knock = int(rate * 0.06)
        centre = 2300 if index % 2 == 0 else 1500
        grain = _band(np, _noise(np, knock, 20 + index), rate, centre - 500, centre + 500)
        t = np.arange(knock) / rate
        at = int(rate * start)
        out[at : at + knock] += grain * np.exp(-90 * t)
    return out


RECIPES = {'drum': drum, 'bell': bell, 'shaker': shaker, 'whistle': whistle, 'bird': bird, 'clock': clock}


if __name__ == '__main__':
    sys.exit(main())
