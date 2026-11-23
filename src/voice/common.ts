import { bankOf } from '@/audio/voice';
import seconds from './timings/common.json';

/** The lines every world shares: "watch first", the counting words, the end of an activity. */
const files = import.meta.glob<string>('../assets/voice/en/common/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const commonVoice = bankOf(files, seconds);
