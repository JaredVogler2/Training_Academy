/**
 * Interface text, in one place so it can be reviewed and later translated. Text meant for a child is never the only
 * way to understand a screen: it accompanies a picture, a demonstration or (from Phase 04) a voice.
 */
export const ui = {
  appName: 'Training Academy',
  skipToContent: 'Skip to content',
  home: 'Home',
  backHome: 'Back to the islands',
  chooseWorld: 'Choose a world',
  worlds: 'Worlds',
  sound: 'Sound',
  soundOn: 'Sound is on',
  soundOff: 'Sound is off',
  calmMotion: 'Calm motion',
  motionCalm: 'Motion is calm',
  motionFull: 'Motion is on',
  grownUps: 'Grown-ups',
  notOpenYet: 'Not open yet',
  tryIt: 'Something to try',
  loading: 'Loading…',
  player: 'Player',
  choosePlayer: 'Who is playing?',

  notFoundTitle: 'This page is not on the map',
  notFoundBody: 'The address does not lead anywhere in the academy.',

  troubleTitle: 'Something went wrong',
  troubleBody: 'This part of the game stopped working. Nothing has been lost.',
  troubleOfflineTitle: 'This part could not be loaded',
  troubleOfflineBody:
    'The device may be offline, or the game may have been updated. Loading the page again usually fixes it.',
  tryAgain: 'Try again',
  reload: 'Load the page again',
} as const;

export function pageTitle(section?: string): string {
  return section ? `${section} · ${ui.appName}` : ui.appName;
}
