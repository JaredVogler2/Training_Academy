# Making the voice

Every line a child hears is a small sound file made ahead of time and kept in the repository. The game plays those
files; it never synthesises speech itself, and never fetches a sound from anywhere else.

`make_voice.py` makes the files. It needs things the game does not ship and CI does not install, so it is run by
hand, by whoever changes a line.

## Setting up (once)

```bash
python3 -m venv ~/voice-venv
```

```bash
~/voice-venv/bin/pip install -r scripts/voice/requirements.txt
```

It also needs `ffmpeg` with the MP3 encoder (`libmp3lame`), and two models that are downloaded once and kept outside
the repository:

- **the voice**: `en_US-kristin-medium.onnx` and `en_US-kristin-medium.onnx.json`, from `rhasspy/piper-voices` on
  Hugging Face (`en/en_US/kristin/medium/`). The copy the committed clips were made with has SHA-256
  `5849957f929cbf720c258f8458692d6103fff2f0e3d3b19c8259474bb06a18d4`; `src/voice/manifest.json` records it.
- **the listener**: the `small.en` model for faster-whisper (`Systran/faster-whisper-small.en`), as a directory.

## Making clips

```bash
~/voice-venv/bin/python -I scripts/voice/make_voice.py --voice <path>/en_US-kristin-medium.onnx --listener <path>/small.en
```

```bash
npx prettier --write src/voice
```

Only clips that are missing, or whose words have changed, are made: a clip that someone has listened to and passed
stays byte for byte what it was. `--again KEY …` makes named clips afresh; `--prune` deletes clips nothing asks for
any more; `--check` makes nothing and fails if anything is out of date (it needs neither model).

What is said comes from the content packs (`src/content/packs/*.json`, every line of `strings.en`), from
`src/voice/lines.json` (what every world shares, and single words) and from `src/voice/lines/<world>.json`
(what a world needs besides, written by its generator). Nothing else is ever said.

## Clips that are followed on the screen

Three kinds of clip have several things in them, one after another, and the screen shows each as it comes: a
word said slowly, written with its sounds apart (`"m-a-p"`); a word said in its beats (`"el-e-phant"`); and a
sentence read aloud. Each is made with **marks**: the moment, in seconds from the start of the clip, that each
sound, beat or word begins. They are written into the manifest and, group by group, into
`src/voice/marks/<group>.json`, which the game reads.

The marks are not guessed and not listened for. The synthesiser is asked which of the samples it made belong to
which sound (it needs the `onnx` package for that, which is in `requirements.txt`). Two things about that are
worth knowing before changing the script:

- **A word is cut in the silence before it, not where the synthesiser says it begins.** A sound that starts
  softly (s, f, sh) is under way up to a tenth of a second earlier than that. "Ship" cut at the given moment was
  heard as "chip".
- **There has to be a silence.** After "The next word is," the voice often runs straight on, and always does
  into "sh". Words that are cut this way are carried by "The next word is that, …" instead, and a take with no
  silence before the word is thrown away.

A word in its beats is the word as it is said, cut between its beats, with a breath put in. The recogniser hears
it before the breaths go in (with them it hears three short words, or none), so `matches` says the right word
was cut up and nothing about where the cuts fall. **Nobody has listened to where they fall.**

## What is checked, and what is not

Each clip is played back to a speech recogniser, and what it heard is written into the manifest beside what was
meant. A sentence is tried up to five times and the first take that is heard word for word is kept. `npm test`
fails if a clip is missing, stale, left over, changed since it was made, or heard differently without being listed
by name in `tests/config/voice.test.ts`.

That catches a wrong word, a cut-off ending, noise. It does not say whether a clip sounds clear, natural or kind to
a small child, and nothing here can. **A person has to listen.** The grown-ups' area has a section for it — "The
voice: listen to every recording" — where each clip can be played and marked. When a clip has been listened to and
passed, set its `reviewed` in `src/voice/manifest.json` to the date (`"2026-11-30"`); the page shows it. Until then
it reads `null`, and the game's documents say the voice has not been reviewed.

## Licences

- The files in `src/assets/voice` are this project's own.
- `piper-tts` is GPL-3.0 software. It is used here as a tool; none of it is in the game.
- `onnx` is Apache-2.0 software, used the same way.
- The voice model comes from the `rhasspy/piper-voices` repository (MIT). Its model card says it was trained on
  LibriVox recordings, which are in the public domain. `docs/ASSETS.md` has the details.
