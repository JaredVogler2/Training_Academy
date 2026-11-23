import { bankOf } from '@/audio/voice';
import seconds from '@/voice/timings/memory-forest.json';
import { wordsVoice } from '@/voice/words';

/** Memory Forest's lines for the voice, with the names of the pictures, which are shared with other worlds. */
const files = import.meta.glob<string>('../../../assets/voice/en/memory-forest/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

const own = bankOf(files, seconds);

export const voice = {
  urls: { ...wordsVoice.urls, ...own.urls },
  seconds: { ...wordsVoice.seconds, ...own.seconds },
};
