import { bankOf } from '@/audio/voice';
import seconds from './timings/words.json';

/** The names of pictures, said plainly: shared by every world that names a picture. */
const files = import.meta.glob<string>('../assets/voice/en/words/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const wordsVoice = bankOf(files, seconds);
