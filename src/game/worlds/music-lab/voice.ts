import { bankOf } from '@/audio/voice';
import seconds from '@/voice/timings/music-lab.json';

/** The Music Lab's lines for the voice. Its music is not here: that is made as it is played (src/audio). */
const files = import.meta.glob<string>('../../../assets/voice/en/music-lab/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const voice = bankOf(files, seconds);
