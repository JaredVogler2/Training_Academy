/** Words in the lesson frame. They are for the grown-up alongside and for screen readers; the child needs none. */
export const lessonText = {
  loading: 'Getting ready…',
  watch: 'Watch first.',
  myTurn: 'My turn',
  next: 'Next',
  done: 'Done',
  ready: 'Ready',
  help: 'Help me',
  leave: 'Leave the activity',
  sayAgain: 'Show me again',
  pause: 'Pause',
  paused: 'Paused',
  resume: 'Carry on',
  pausedNote: 'Nothing is lost. The activity waits here.',
  covered: 'Covered up, for now',
  turnedOver: 'a card, face down',
  place: (position: number) => `Place ${position}`,
  empty: 'empty',
  needsSound: 'This activity is for listening. Turn the sound on to play it.',
  soundOn: 'Turn the sound on',
  progress: (step: number, total: number) => `Step ${step} of ${total}`,
  allDone: 'All done!',
  again: 'Again',
  islands: 'Islands',
  report: (independent: number, probes: number) =>
    `For grown-ups: ${independent} of ${probes} right at the first try, with no help.`,
  notSaved: 'This device is not saving progress right now.',
  /** When a sitting of the length a grown-up chose has been played: said once, at the end of an activity. */
  rest: (minutes: number) =>
    `For grown-ups: about ${minutes} minutes have been played, which is the length you chose for a sitting. A good moment to stop. Nothing is closed.`,
  /** What is said, and written, when taps have been landing on nothing: the same words as the recordings. */
  nudge: {
    answers: 'Tap one of these.',
    done: 'Have you finished? Tap the tick.',
    next: 'Tap the arrow to go on.',
    'my-turn': 'Tap the arrow, and then it is your turn.',
    wait: 'Watch and listen first.',
  },
  helping: 'A grown-up is helping',
  helpingOn: 'On: what is answered now is not counted as done alone. Hold to switch off.',
  helpingOff: 'Off. Hold to switch on.',
  helpingNote: 'A grown-up is helping: this is not counted as done alone.',
} as const;
