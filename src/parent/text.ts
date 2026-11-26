import { avatarNames } from '@/app/strings';
import type { EvidenceStatus, Observation, Seen, SkillEvidence } from '@/engine';
import type { GraphicsOption, MotionOption } from '@/app/settings';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export const grownUpText = {
  title: 'Grown-ups',
  backToGame: 'Back to the game',
  gateTitle: 'For grown-ups',
  gateBody: 'Players, progress and saved data are in here.',
  gateHold: 'Press and hold',
  gateHonest:
    'Holding the button for two seconds keeps small fingers out by accident. It is not a lock: anyone who can hold a button can come in.',
  privacy:
    'Everything here stays on this device. There is no account, nothing is uploaded, and there is no tracking.',

  players: 'Players',
  noPlayers:
    'No players yet. The first activity creates one called Explorer, or you can add your own.',
  playingNow: 'Playing now',
  switchTo: 'Switch to this player',
  /** What a screen reader says for that button: the visible words first, then whose row it is. */
  switchToNamed: (name: string) => `Switch to this player: ${name}`,
  edit: (name: string) => `Change ${name}`,
  remove: (name: string) => `Remove ${name}`,
  addPlayer: 'Add a player',
  add: 'Add',
  save: 'Save',
  cancel: 'Cancel',
  editTitle: 'Change player',
  nickname: 'Nickname',
  nicknameHelp: 'A nickname is enough. No real name or birthday is needed.',
  nameNeeded: 'Please type a nickname.',
  tooMany: 'This device already has the most players it can hold.',
  couldNotSave: 'That could not be saved. Please try again.',
  picture: 'Picture',
  avatarNames,
  removeTitle: (name: string) => `Remove ${name}?`,
  removeBody:
    'This erases the player and everything recorded about them from this device. It cannot be undone. Save a copy first if you may want it back.',
  removeConfirm: 'Remove',
  notPersistent:
    'This browser is not letting the game save, so progress will be forgotten when the page closes. Private browsing and blocked site data are the usual causes.',

  shown: (name: string) => `What ${name} has shown`,
  shownHelp:
    'Only answers given at the first try, with no hint and no help, count as doing something independently. Watching, hints and second tries never do. These are plain counts, not a test score.',
  status: {
    'not-yet-observed': 'Not yet observed',
    exploring: 'Exploring',
    guided: 'Getting it with the guide',
    practicing: 'Practising',
    'provisionally-independent': 'Independent so far',
    'consistently-independent': 'Independent across days',
  } satisfies Record<EvidenceStatus, string>,

  begin: (name: string) => `Where ${name} begins`,
  beginHelp:
    'You know this child; the game does not yet. If they can already do some of this, the big Play button can begin further on. It is only where Play begins: every activity stays open on its island’s page, and nothing here is counted as something they have shown. That comes only from what they do in the game.',
  seenTitle: 'What you have seen them do',
  seenHelp:
    'Leave anything you are not sure of as “Not yet observed”. To find out, watch them try the activity named beside it.',
  observations: {
    taps: 'Taps the thing they mean to',
    listens: 'Listens to what the voice says',
    'counts-to-five': 'Counts five things, touching each one once',
    'first-sounds': 'Hears the first sound of a word: “sun” begins with sss',
    'letter-shapes': 'Knows some letters by their shape or their name',
    'letter-sounds': 'Knows the sound some letters stand for',
  } satisfies Record<Observation, string>,
  /** The three things a grown-up can say of each. */
  notObserved: 'Not yet observed',
  seen: {
    seen: 'Yes, I have seen this',
    'not-yet': 'Not yet',
  } satisfies Record<Seen, string>,
  watchIn: (activity: string) => `Watch them try: ${activity}`,
  tapsNote:
    'Glim shows how to play at the very start, and can show it again whenever you like. In any activity, the pause button has “A grown-up is helping”: what you help with is then not counted as theirs.',
  listensNote:
    'Everything Glim says is also shown, so most of the game can be played with the sound off. An activity that is about listening needs the sound, and says so when it opens.',
  howToAgain: 'Show how to play',
  suggest: (world: string, activity: string) =>
    `From what you have seen, Play in ${world} could begin at “${activity}”.`,
  beginThere: 'Begin there',
  startsTitle: 'Where Play begins',
  startsHelp:
    'Once everything from there on has been finished, Play goes back to what was passed over.',
  startOf: (world: string) => `${world}: Play begins at`,
  atTheBeginning: 'The beginning',
  beginsAt: (activity: string) => `Play begins at “${activity}”.`,
  partOf: (activity: string, part: number) => `${activity}, part ${part}`,
  beginSaved: 'Saved.',
  togetherTitle: 'Playing together',
  helpingToday: 'I am helping today: do not count answers as theirs alone',
  helpingHelp:
    'It stays on for this visit, and every activity shows it on its pause button, which is also where it is switched off.',

  data: 'Saved data',
  dataBody:
    'Save a copy to keep a backup or move a player to another device. The file is plain, readable JSON.',
  saveCopy: (name: string) => `Save a copy of ${name}`,
  saveCopyNobody: 'Save a copy',
  loadCopy: 'Load a copy',
  saved: (name: string) => `A copy of ${name} has been saved to your downloads.`,
  loaded: (name: string, attempts: number) =>
    `${name} has been loaded (${plural(attempts, 'new answer', 'new answers')} added).`,
  notLoaded: 'That file could not be loaded.',
  eraseAll: 'Erase everything',
  eraseTitle: 'Erase everything on this device?',
  eraseBody:
    'Every player and every record is removed from this device. It cannot be undone. Save a copy of anyone you want to keep first.',
  eraseConfirm: 'Erase everything',

  device: 'This device',
  sound: 'Sound',
  motion: 'Motion',
  motionOptions: {
    system: 'Follow the device setting',
    full: 'Full motion',
    reduced: 'Calm (reduced) motion',
  } satisfies Record<MotionOption, string>,
  graphics: 'Graphics',
  graphicsOptions: {
    auto: 'Automatic',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    pictures: 'Pictures only (no 3D)',
  } satisfies Record<GraphicsOption, string>,

  voice: 'The voice: listen to every recording',
  voiceLoading: 'Fetching the recordings…',
  diagnostics: 'Diagnostics',
  diagnosticsBody:
    'Measured on this device, during this visit, and shown only here. Nothing on this list is sent anywhere.',
} as const;

/** What the record says about one skill, as a sentence a parent can check against what they have seen. */
export function describeEvidence(evidence: SkillEvidence): string {
  if (evidence.totalAttempts === 0) return 'Nothing recorded yet.';
  const parts: string[] = [];
  if (evidence.independentSuccesses > 0) {
    parts.push(
      `${plural(evidence.independentSuccesses, 'independent success', 'independent successes')} in ` +
        `${plural(evidence.distinctVariants, 'kind of question', 'kinds of question')} on ` +
        `${plural(evidence.distinctDays, 'day', 'days')}.`,
    );
  } else {
    parts.push('No independent success yet.');
  }
  if (evidence.independentMisses > 0) {
    parts.push(
      `${plural(evidence.independentMisses, 'first try', 'first tries')} without help ${evidence.independentMisses === 1 ? 'was' : 'were'} not right.`,
    );
  }
  if (evidence.guidedSuccesses > 0) {
    parts.push(`${evidence.guidedSuccesses} right at the first try in practice with the guide.`);
  }
  if (evidence.assistedSuccesses > 0) {
    parts.push(`${evidence.assistedSuccesses} right after a hint, another try or help.`);
  }
  return parts.join(' ');
}
