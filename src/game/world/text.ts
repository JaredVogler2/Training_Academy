export const worldText = {
  islands: 'Islands',
  play: 'Play',
  playHeading: 'Play',
  notOpen: 'This world is not open yet.',
  forGrownUps: 'For grown-ups',
  activities: 'Everything to play here',
  whatIsHere: 'What this world teaches',
  ready: 'Ready',
  together: 'To try together, away from the screen:',
  later: 'Later',
  done: 'done',
  doneNote: (title: string) => `${title}: done. Tap to play it again.`,
  getting: 'Getting the activities ready…',
  lessonNote: (title: string, minutes: number) => `${title} · about ${minutes} minutes`,
  againNote: 'Every activity here has been finished. Play starts again from the first.',
  /** Something played before, and due again: said plainly, so that a grown-up is not left wondering why. */
  backNote: (title: string, minutes: number) =>
    `${title} · played before, and time to come back to it · about ${minutes} minutes`,
  freeNote: (title: string) =>
    `Every activity here has been finished, and none is due again yet. Play goes to the one played longest ago: ${title}.`,
  openExplain:
    'No activity here needs reading: the guide shows what to do first. Play goes to what the game would offer next: something new, or something played before that it is time to come back to. Grown-ups → “What Play offers next” says why. Any activity can be played at any time from the pictures below.',
  partExplain:
    'The activities marked “Later” have not been built yet. Nothing on this page leads to them.',
  restHeading: 'Time for a rest',
  restNote: (minutes: number) =>
    `About ${minutes} minutes have been played, which is the length a grown-up chose for a sitting. Glim is having a rest. Everything is still here: any activity can be played from the pictures below.`,
  roomHeading: 'A room of its own',
  /** What a grown-up holds to say a thing was tried, and what is written once they have. */
  tried: 'We tried this',
  holdToSay: 'Hold to say you tried this together.',
  triedOn: (day: string) => `Tried on ${day}. That is your word: the game did not see it.`,
  /** The same for a story told back: what a grown-up holds to say so, and what is written once they have. */
  told: 'They told it back',
  holdToSayTold: 'Hold to say your child told a story back in their own words.',
  toldOn: (day: string) => `Told back on ${day}. That is your word: the game did not hear it.`,
  couldNotSave: 'That could not be saved on this device.',
  laterHeading: 'Rooms that have not been built',
  notBuilt: 'Not built',
  laterRooms:
    'These are ideas for this place, and no more than that yet. None of them can be played, and nothing on this page leads to them.',
  laterExplain:
    'Nothing here can be played yet, and nothing on this page can be tapped by mistake. This world will open in a later update.',
} as const;
