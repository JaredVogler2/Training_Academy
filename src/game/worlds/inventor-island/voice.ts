import { bankOf } from '@/audio/voice';
import seconds from '@/voice/timings/inventor-island.json';

/** Inventor Island's lines for the voice: the files, and how long each one lasts. */
const files = import.meta.glob<string>('../../../assets/voice/en/inventor-island/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const voice = bankOf(files, seconds);
