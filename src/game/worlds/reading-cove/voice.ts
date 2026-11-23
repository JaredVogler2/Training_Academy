import { bankOf } from '@/audio/voice';
import seconds from '@/voice/timings/reading-cove.json';
import { wordsVoice } from '@/voice/words';

/** Reading Cove's lines, words and sounds for the voice: the files, and how long each one lasts. */
const files = import.meta.glob<string>('../../../assets/voice/en/reading-cove/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

const own = bankOf(files, seconds);

/** With the names of the pictures, which are shared with other worlds. */
export const voice = {
  urls: { ...wordsVoice.urls, ...own.urls },
  seconds: { ...wordsVoice.seconds, ...own.seconds },
};
