import {
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type SyntheticEvent,
} from 'react';
import { lazyView } from '@/app/chunks';
import { audio, voice } from '@/audio';
import { getDiagnostics, subscribeDiagnostics } from '@/app/diagnostics';
import {
  GRAPHICS_OPTIONS,
  MOTION_OPTIONS,
  settingsStore,
  useSettings,
  type GraphicsOption,
  type MotionOption,
} from '@/app/settings';
import { hasPack, loadPack } from '@/content';
import {
  AVATAR_IDS,
  WORLD_IDS,
  getSkillEvidence,
  type Attempt,
  type AvatarId,
  type Profile,
  type Skill,
  type WorldId,
} from '@/engine';
import { worldById } from '@/game/worlds';
import {
  activeProfile,
  createProfile,
  deleteProfile,
  importProfile,
  refreshProfiles,
  resetEverything,
  setActiveProfile,
  updateProfile,
  useProfiles,
} from '@/game/profiles';
import { getRepository } from '@/game/services';
import { MAX_PROFILES, StorageError } from '@/storage';
import { AvatarPicture } from '@/ui/art';
import { ActionButton, ActionLink, HoldButton, Modal } from '@/ui/controls';
import {
  IconCheck,
  IconDownload,
  IconGrownUps,
  IconHome,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUpload,
} from '@/ui/icons';
import { Select } from './Select';
import { WhereToBegin } from './WhereToBegin';
import { describeEvidence, grownUpText as text } from './text';
import styles from './GrownUps.module.css';

/**
 * The grown-ups area: who plays on this device, what each player has shown, and full control of the data.
 *
 * It sits behind a press-and-hold. That keeps small fingers out by accident; it is not a lock and is not described as
 * one. Everything here stays on the device — there is no account and nothing is uploaded.
 */

/** Unlocked for as long as the page stays open; a reload asks again. */
let unlocked = false;

function Gate({ onOpen }: { onOpen: () => void }) {
  return (
    <section className={styles.gate} aria-labelledby="gate-title" data-selectable>
      <IconGrownUps size={44} />
      <h1 id="gate-title">{text.gateTitle}</h1>
      <p>{text.gateBody}</p>
      <HoldButton seconds={2} onComplete={onOpen} icon={<IconCheck />}>
        {text.gateHold}
      </HoldButton>
      <p className={styles.small}>{text.gateHonest}</p>
      <ActionLink to={{ name: 'home' }} icon={<IconHome />}>
        {text.backToGame}
      </ActionLink>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------------------------------------------------

function PlayerForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: { name: string; avatar: AvatarId };
  submitLabel: string;
  onSubmit: (value: { name: string; avatar: AvatarId }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [avatar, setAvatar] = useState<AvatarId>(initial.avatar);
  const [problem, setProblem] = useState<string | null>(null);
  const nameId = useId();
  const helpId = useId();

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    if (name.trim() === '') {
      setProblem(text.nameNeeded);
      return;
    }
    onSubmit({ name, avatar }).catch((error: unknown) => {
      setProblem(
        error instanceof StorageError && error.code === 'limit' ? text.tooMany : text.couldNotSave,
      );
    });
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <label htmlFor={nameId}>{text.nickname}</label>
      <input
        id={nameId}
        className={styles.input}
        value={name}
        maxLength={24}
        autoComplete="off"
        aria-describedby={helpId}
        aria-invalid={problem !== null}
        onChange={(event) => {
          setName(event.target.value);
          setProblem(null);
        }}
      />
      <p id={helpId} className={styles.small}>
        {problem ?? text.nicknameHelp}
      </p>
      <fieldset className={styles.avatars}>
        <legend>{text.picture}</legend>
        {AVATAR_IDS.map((id) => (
          <label key={id} className={styles.avatarChoice} data-chosen={avatar === id}>
            <input
              type="radio"
              className="sr-only"
              name="avatar"
              value={id}
              checked={avatar === id}
              onChange={() => setAvatar(id)}
            />
            <AvatarPicture avatar={id} size={52} />
            <span className="sr-only">{text.avatarNames[id]}</span>
          </label>
        ))}
      </fieldset>
      <div className={styles.formActions}>
        <ActionButton tone="quiet" onClick={onCancel}>
          {text.cancel}
        </ActionButton>
        <ActionButton type="submit" tone="sun">
          {submitLabel}
        </ActionButton>
      </div>
    </form>
  );
}

type Dialog =
  | { kind: 'add' }
  | { kind: 'edit'; profile: Profile }
  | { kind: 'delete'; profile: Profile }
  | { kind: 'reset' }
  | null;

function Players({ onDialog }: { onDialog: (dialog: Dialog) => void }) {
  const state = useProfiles();
  const playing = activeProfile(state);
  return (
    <section className={styles.card} aria-labelledby="players-title">
      <h2 id="players-title">{text.players}</h2>
      {state.profiles.length === 0 ? (
        <p>{text.noPlayers}</p>
      ) : (
        <ul className={styles.players}>
          {state.profiles.map((profile) => (
            <li key={profile.id} className={styles.player} data-testid="player">
              <AvatarPicture avatar={profile.avatar} size={48} />
              <div className={styles.playerName}>
                <strong>{profile.name}</strong>
                {playing?.id === profile.id ? (
                  <span className={styles.playingNow}>{text.playingNow}</span>
                ) : (
                  <button
                    type="button"
                    className={styles.linkButton}
                    aria-label={text.switchToNamed(profile.name)}
                    onClick={() => void setActiveProfile(profile.id)}
                  >
                    {text.switchTo}
                  </button>
                )}
              </div>
              <ActionButton
                round
                tone="quiet"
                icon={<IconPencil size={22} />}
                aria-label={text.edit(profile.name)}
                onClick={() => onDialog({ kind: 'edit', profile })}
              />
              <ActionButton
                round
                tone="quiet"
                icon={<IconTrash size={22} />}
                aria-label={text.remove(profile.name)}
                onClick={() => onDialog({ kind: 'delete', profile })}
              />
            </li>
          ))}
        </ul>
      )}
      <ActionButton
        icon={<IconPlus size={22} />}
        disabled={state.profiles.length >= MAX_PROFILES}
        onClick={() => onDialog({ kind: 'add' })}
      >
        {text.addPlayer}
      </ActionButton>
      {state.backend && !state.backend.persistent && (
        <p className={styles.warning} role="status">
          {text.notPersistent}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// What the player has shown
// ---------------------------------------------------------------------------------------------------------------------

/** What each world with content teaches, world by world, in the order the worlds are met. */
function useSkills(): { world: WorldId; skills: Skill[] }[] {
  const [skills, setSkills] = useState<{ world: WorldId; skills: Skill[] }[]>([]);
  useEffect(() => {
    let current = true;
    void Promise.all(WORLD_IDS.filter(hasPack).map((world) => loadPack(world))).then(
      (packs) => {
        if (current) setSkills(packs.map((pack) => ({ world: pack.world, skills: pack.skills })));
      },
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, []);
  return skills;
}

function Evidence({ profile }: { profile: Profile | null }) {
  const skills = useSkills();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const profileId = profile?.id ?? null;

  useEffect(() => {
    let current = true;
    if (profileId === null) return;
    void getRepository()
      .then((repository) => repository.listAttempts(profileId))
      .then(
        (list) => {
          if (current) setAttempts(list);
        },
        () => undefined,
      );
    return () => {
      current = false;
    };
  }, [profileId]);

  if (!profile) return null;
  return (
    <section className={styles.card} aria-labelledby="evidence-title">
      <h2 id="evidence-title">{text.shown(profile.name)}</h2>
      <p className={styles.small}>{text.shownHelp}</p>
      {skills.map((group) => (
        <div key={group.world} className={styles.world} data-world={group.world}>
          <h3>{worldById(group.world).name}</h3>
          <ul className={styles.skills}>
            {group.skills.map((skill) => {
              const evidence = getSkillEvidence(attempts, skill.id);
              return (
                <li
                  key={skill.id}
                  className={styles.skill}
                  data-testid="skill"
                  data-skill={skill.id}
                  data-status={evidence.status}
                >
                  <div>
                    <strong>{skill.title}</strong>
                    <p className={styles.small}>{skill.objective}</p>
                  </div>
                  <p className={styles.status}>{text.status[evidence.status]}</p>
                  <p className={styles.evidence}>{describeEvidence(evidence)}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------------------------------------------------

function Data({
  profile,
  onDialog,
}: {
  profile: Profile | null;
  onDialog: (dialog: Dialog) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (!profile) return;
    const repository = await getRepository();
    const bundle = await repository.exportProfile(profile.id);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `training-academy-${profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'player'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(text.saved(profile.name));
  };

  const load = async (chosen: File) => {
    const result = await importProfile(await chosen.text());
    setMessage(
      result.ok
        ? text.loaded(result.profile.name, result.added.attempts)
        : `${text.notLoaded} ${result.detail}`,
    );
  };

  return (
    <section className={styles.card} aria-labelledby="data-title">
      <h2 id="data-title">{text.data}</h2>
      <p>{text.dataBody}</p>
      <div className={styles.row}>
        <ActionButton
          icon={<IconDownload size={22} />}
          disabled={!profile}
          onClick={() => void save()}
        >
          {profile ? text.saveCopy(profile.name) : text.saveCopyNobody}
        </ActionButton>
        <ActionButton icon={<IconUpload size={22} />} onClick={() => file.current?.click()}>
          {text.loadCopy}
        </ActionButton>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          // The button beside it is the control people use; this input is only the browser's file picker.
          tabIndex={-1}
          aria-hidden="true"
          data-testid="import-file"
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            event.target.value = '';
            if (chosen) void load(chosen);
          }}
        />
      </div>
      <p className={styles.message} role="status" aria-live="polite">
        {message}
      </p>
      <ActionButton
        tone="danger"
        icon={<IconTrash size={22} />}
        onClick={() => onDialog({ kind: 'reset' })}
      >
        {text.eraseAll}
      </ActionButton>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Device settings and diagnostics
// ---------------------------------------------------------------------------------------------------------------------

function DeviceSettings() {
  const settings = useSettings();
  const store = settingsStore();
  const motionId = useId();
  const graphicsId = useId();
  return (
    <section className={styles.card} aria-labelledby="device-title">
      <h2 id="device-title">{text.device}</h2>
      <label className={styles.check}>
        <input type="checkbox" checked={settings.sound} onChange={() => store.toggleSound()} />
        <span>{text.sound}</span>
      </label>
      <div className={styles.field}>
        <label htmlFor={motionId}>{text.motion}</label>
        <Select
          id={motionId}
          value={settings.motion}
          onChange={(event) => store.set({ motion: event.target.value as MotionOption })}
        >
          {MOTION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {text.motionOptions[option]}
            </option>
          ))}
        </Select>
      </div>
      <div className={styles.field}>
        <label htmlFor={graphicsId}>{text.graphics}</label>
        <Select
          id={graphicsId}
          value={settings.graphics}
          onChange={(event) => store.set({ graphics: event.target.value as GraphicsOption })}
        >
          {GRAPHICS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {text.graphicsOptions[option]}
            </option>
          ))}
        </Select>
      </div>
    </section>
  );
}

function Diagnostics() {
  const diagnostics = useSyncExternalStore(subscribeDiagnostics, getDiagnostics);
  const profiles = useProfiles();
  const { hub, vitals } = diagnostics;
  const rows: [string, string][] = [
    ['Version', `${__APP_VERSION__} (${__BUILD_LABEL__})`],
    [
      'Progress is kept in',
      profiles.backend
        ? `${profiles.backend.kind}${profiles.backend.persistent ? '' : ' (not saved after the page closes)'}`
        : '…',
    ],
    ['Storage notes', profiles.backend?.notes.join(', ') || 'none'],
    ['Hub picture', hub.mode + (hub.reason ? ` (${hub.reason})` : '')],
    ['Graphics tier', hub.tier ?? '—'],
    ['Renderer', hub.renderer ?? '—'],
    [
      'Frames',
      hub.frames
        ? `${hub.frames.fps} per second, 95% under ${hub.frames.p95Ms} ms, pixel ratio ${hub.pixelRatio ?? '?'}`
        : 'not measured',
    ],
    [
      'Scene',
      hub.drawCalls === null
        ? '—'
        : `${hub.drawCalls} draw calls, ${hub.triangles ?? 0} triangles` +
          (hub.geometries === null
            ? ''
            : `; holding ${hub.geometries} geometries, ${hub.textures ?? 0} textures, ${hub.programs ?? 0} shader programs`),
    ],
    [
      'First paint',
      vitals.firstContentfulPaintMs === null ? '—' : `${vitals.firstContentfulPaintMs} ms`,
    ],
    [
      'Largest paint',
      vitals.largestContentfulPaintMs === null ? '—' : `${vitals.largestContentfulPaintMs} ms`,
    ],
    [
      'Layout shift',
      vitals.cumulativeLayoutShift === null ? '—' : String(vitals.cumulativeLayoutShift),
    ],
    ['Long tasks', `${vitals.longTasks} (longest ${vitals.longestTaskMs} ms)`],
    ...Object.entries(diagnostics.marks).map(([name, ms]): [string, string] => [
      `Mark: ${name}`,
      `${ms} ms`,
    ]),
    ...diagnostics.chunks.map((chunk): [string, string] => [
      `Loaded: ${chunk.name}`,
      chunk.ok ? `${chunk.ms} ms` : `failed after ${chunk.ms} ms`,
    ]),
    [
      'Voice',
      `${voice().stats.said} lines said, ${voice().stats.unheard} not heard, this visit` +
        (audio().canPlayClips ? '' : ' (recordings cannot be played right now)'),
    ],
    ['Errors this visit', String(diagnostics.errors.length)],
  ];
  return (
    <details className={styles.card} data-testid="diagnostics">
      <summary>{text.diagnostics}</summary>
      <p className={styles.small}>{text.diagnosticsBody}</p>
      <dl className={styles.facts}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {diagnostics.errors.length > 0 && (
        <ul className={styles.small}>
          {diagnostics.errors.map((error, index) => (
            <li key={index}>
              {error.source}: {error.message}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

/** The recordings of the voice, to listen to. Fetched only when the section is opened: it is a long list. */
const VoiceCheck = lazyView('voice-check', () => import('./VoiceCheck'));

function Voice() {
  const [opened, setOpened] = useState(false);
  return (
    <details
      className={styles.card}
      data-testid="voice"
      onToggle={(event) => {
        if (event.currentTarget.open) setOpened(true);
      }}
    >
      <summary>{text.voice}</summary>
      {opened && (
        <Suspense fallback={<p className={styles.small}>{text.voiceLoading}</p>}>
          <VoiceCheck />
        </Suspense>
      )}
    </details>
  );
}

// ---------------------------------------------------------------------------------------------------------------------

function Area() {
  const state = useProfiles();
  const playing = activeProfile(state);
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  useEffect(() => {
    void refreshProfiles();
  }, []);

  return (
    <div className={styles.area} data-selectable>
      <header className={styles.header}>
        <h1>{text.title}</h1>
        <ActionLink to={{ name: 'home' }} icon={<IconHome />}>
          {text.backToGame}
        </ActionLink>
      </header>
      <p className={styles.lead}>{text.privacy}</p>

      <Players onDialog={setDialog} />
      <WhereToBegin key={`begin-${playing?.id ?? 'nobody'}`} profile={playing} />
      <Evidence key={playing?.id ?? 'nobody'} profile={playing} />
      <Data profile={playing} onDialog={setDialog} />
      <DeviceSettings />
      <Voice />
      <Diagnostics />

      <Modal
        open={dialog?.kind === 'add' || dialog?.kind === 'edit'}
        onClose={close}
        title={dialog?.kind === 'edit' ? text.editTitle : text.addPlayer}
        actions={null}
      >
        {dialog?.kind === 'add' && (
          <PlayerForm
            initial={{ name: '', avatar: 'sun' }}
            submitLabel={text.add}
            onCancel={close}
            onSubmit={async (value) => {
              const created = await createProfile(value);
              await setActiveProfile(created.id);
              close();
            }}
          />
        )}
        {dialog?.kind === 'edit' && (
          <PlayerForm
            initial={dialog.profile}
            submitLabel={text.save}
            onCancel={close}
            onSubmit={async (value) => {
              await updateProfile(dialog.profile.id, value);
              close();
            }}
          />
        )}
      </Modal>

      <Modal
        open={dialog?.kind === 'delete'}
        onClose={close}
        title={dialog?.kind === 'delete' ? text.removeTitle(dialog.profile.name) : ''}
        actions={
          <>
            <ActionButton tone="quiet" onClick={close}>
              {text.cancel}
            </ActionButton>
            <ActionButton
              tone="danger"
              onClick={() => {
                if (dialog?.kind === 'delete') void deleteProfile(dialog.profile.id).then(close);
              }}
            >
              {text.removeConfirm}
            </ActionButton>
          </>
        }
      >
        <p>{text.removeBody}</p>
      </Modal>

      <Modal
        open={dialog?.kind === 'reset'}
        onClose={close}
        title={text.eraseTitle}
        actions={
          <>
            <ActionButton tone="quiet" onClick={close}>
              {text.cancel}
            </ActionButton>
            <ActionButton tone="danger" onClick={() => void resetEverything().then(close)}>
              {text.eraseConfirm}
            </ActionButton>
          </>
        }
      >
        <p>{text.eraseBody}</p>
      </Modal>
    </div>
  );
}

export default function GrownUps() {
  const [open, setOpen] = useState(unlocked);
  if (!open) {
    return (
      <Gate
        onOpen={() => {
          unlocked = true;
          setOpen(true);
        }}
      />
    );
  }
  return <Area />;
}
