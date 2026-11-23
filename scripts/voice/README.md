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

What is said comes from the content packs (`src/content/packs/*.json`, every line of `strings.en`) and from
`src/voice/lines.json` (what every world shares, and single words). Nothing else is ever said.

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
- The voice model comes from the `rhasspy/piper-voices` repository (MIT). Its model card says it was trained on
  LibriVox recordings, which are in the public domain. `docs/ASSETS.md` has the details.
