import { bankOf } from '@/audio/voice';
import seconds from '@/voice/timings/explorer-harbor.json';

/** Explorer Harbor's lines for the voice: the files, and how long each one lasts. */
const files = import.meta.glob<string>('../../../assets/voice/en/explorer-harbor/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const voice = bankOf(files, seconds);
