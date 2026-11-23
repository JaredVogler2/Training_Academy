import { useEffect, useRef } from 'react';
import { settingsStore, useReducedMotion, useSettings } from '@/app/settings';
import { ui } from '@/app/strings';
import { playCue } from '@/audio';
import { Guide } from '@/ui/Guide';
import { ActionButton, ActionLink, ToggleButton } from '@/ui/controls';
import {
  IconHome,
  IconMotionCalm,
  IconMotionOn,
  IconPlay,
  IconSoundOff,
  IconSoundOn,
} from '@/ui/icons';
import { lessonText } from './text';
import styles from './Lesson.module.css';

/**
 * The activity, paused: one large button to carry on, the way home, and the two switches a family may want in the
 * middle of an activity (the top bar is not on this screen).
 *
 * It is a modal dialog, so nothing behind it can be tapped or reached by the keyboard, and Escape carries on. It is
 * also what a child comes back to after the phone has been away in another app: the tap that carries on is the
 * touch a phone needs before it will make sound again.
 */
export function PauseSheet({ open, onResume }: { open: boolean; onResume: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const settings = useSettings();
  const reducedMotion = useReducedMotion();
  const store = settingsStore();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.pause}
      aria-labelledby="pause-title"
      data-testid="lesson-paused"
      onClose={onResume}
      onCancel={onResume}
    >
      {open && (
        <div className={styles.pauseBody}>
          <Guide state="idle" className={styles.pauseGuide} />
          <h2 id="pause-title" className={styles.pauseTitle}>
            {lessonText.paused}
          </h2>
          <ActionButton
            tone="sun"
            big
            round
            className={styles.resume}
            icon={<IconPlay size={44} />}
            aria-label={lessonText.resume}
            onClick={() => {
              playCue('step');
              onResume();
            }}
          />
          <p className={styles.pauseNote}>{lessonText.pausedNote}</p>
          <div className={styles.pauseRow}>
            <ActionLink
              to={{ name: 'home' }}
              round
              className={styles.barButton}
              icon={<IconHome />}
              aria-label={lessonText.leave}
            />
            <ToggleButton
              pressed={settings.sound}
              label={ui.sound}
              stateText={settings.sound ? ui.soundOn : ui.soundOff}
              icon={settings.sound ? <IconSoundOn /> : <IconSoundOff />}
              onChange={(on) => {
                store.set({ sound: on });
                playCue('on');
              }}
            />
            <ToggleButton
              pressed={reducedMotion}
              label={ui.calmMotion}
              stateText={reducedMotion ? ui.motionCalm : ui.motionFull}
              icon={reducedMotion ? <IconMotionCalm /> : <IconMotionOn />}
              onChange={() => {
                store.toggleMotion();
                playCue('tap');
              }}
            />
          </div>
        </div>
      )}
    </dialog>
  );
}
