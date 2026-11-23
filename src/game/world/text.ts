export const worldText = {
  islands: 'Islands',
  play: 'Play',
  playHeading: 'Play',
  notOpen: 'This world is not open yet.',
  forGrownUps: 'For grown-ups',
  activities: 'Everything to play here',
  whatIsHere: 'What this world teaches',
  ready: 'Ready',
  later: 'Later',
  done: 'done',
  doneNote: (title: string) => `${title}: done. Tap to play it again.`,
  getting: 'Getting the activities ready…',
  lessonNote: (title: string, minutes: number) => `${title} · about ${minutes} minutes`,
  againNote: 'Every activity here has been finished. Play starts again from the first.',
  openExplain:
    'No activity here needs reading: the guide shows what to do first. Play goes to the first one that has not been finished, and any of them can be played again from the pictures below it.',
  partExplain:
    'The activities marked “Later” have not been built yet. Nothing on this page leads to them.',
  laterExplain:
    'Nothing here can be played yet, and nothing on this page can be tapped by mistake. This world will open in a later update.',
} as const;
