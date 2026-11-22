export const worldText = {
  islands: 'Islands',
  play: 'Play',
  playHeading: 'Play',
  notOpen: 'This world is not open yet.',
  forGrownUps: 'For grown-ups',
  planned: 'Planned for this world',
  firstReady: 'First activity ready',
  later: 'Later',
  sampleNote: 'A first activity to try.',
  lessonNote: (title: string, minutes: number) => `${title} · about ${minutes} minutes`,
  sampleExplain:
    'One activity is ready as an early sample. It needs no reading: the guide shows what to do first. The rest of this world is still to be built.',
  laterExplain:
    'Nothing here can be played yet, and nothing on this page can be tapped by mistake. This world will open in a later update.',
} as const;
