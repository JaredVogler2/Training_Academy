import type { AvatarId, EvidenceStatus, SkillEvidence } from '@/engine';
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
  switchTo: (name: string) => `Switch to ${name}`,
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
  avatarNames: {
    sun: 'Sun',
    moon: 'Moon',
    leaf: 'Leaf',
    shell: 'Shell',
    star: 'Star',
    drop: 'Drop',
  } satisfies Record<AvatarId, string>,
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
