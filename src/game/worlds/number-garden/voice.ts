import { bankOf } from '@/audio/voice';
import seconds from '@/voice/timings/number-garden.json';

/** Number Garden's lines for the voice: the files, and how long each one lasts. */
const files = import.meta.glob<string>('../../../assets/voice/en/number-garden/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const voice = bankOf(files, seconds);
