/** Words in the lesson frame. They are for the grown-up alongside and for screen readers; the child needs none. */
export const lessonText = {
  loading: 'Getting ready…',
  watch: 'Watch first.',
  myTurn: 'My turn',
  next: 'Next',
  help: 'Help me',
  leave: 'Leave the activity',
  sayAgain: 'Show me again',
  pause: 'Pause',
  paused: 'Paused',
  resume: 'Carry on',
  pausedNote: 'Nothing is lost. The activity waits here.',
  theAnswer: 'The matching group: ',
  thisGroup: 'The group to match: ',
  progress: (step: number, total: number) => `Step ${step} of ${total}`,
  allDone: 'All done!',
  again: 'Again',
  islands: 'Islands',
  report: (independent: number, probes: number) =>
    `For grown-ups: ${independent} of ${probes} matched at the first try, with no help.`,
  notSaved: 'This device is not saving progress right now.',
} as const;
