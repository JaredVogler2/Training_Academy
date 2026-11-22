import { playCue } from '@/audio';
import { BrandMark } from '@/ui/art';
import { ToggleButton } from '@/ui/controls';
import { IconGrownUps, IconMotionCalm, IconMotionOn, IconSoundOff, IconSoundOn } from '@/ui/icons';
import { Link } from './navigation';
import type { Route } from './router';
import { settingsStore, useReducedMotion, useSettings } from './settings';
import { ui } from './strings';
import styles from './App.module.css';

/**
 * The bar across the top of every screen: the way home, the two toggles a family is most likely to want, and the
 * door to the grown-ups area (which is itself behind a press-and-hold, and hidden while a child is in an activity).
 */
export function TopBar({ route }: { route: Route }) {
  const settings = useSettings();
  const reducedMotion = useReducedMotion();
  const store = settingsStore();

  return (
    <header className={styles.topbar}>
      <Link
        to={{ name: 'home' }}
        className={styles.brand}
        aria-label={`${ui.appName}: ${ui.home}`}
        aria-current={route.name === 'home' ? 'page' : undefined}
      >
        <BrandMark className={styles.brandMark} />
        <span className={styles.brandName} aria-hidden="true">
          {ui.appName}
        </span>
      </Link>

      <div className={styles.topbarActions}>
        <ToggleButton
          pressed={settings.sound}
          label={ui.sound}
          stateText={settings.sound ? ui.soundOn : ui.soundOff}
          icon={settings.sound ? <IconSoundOn /> : <IconSoundOff />}
          onChange={(on) => {
            store.set({ sound: on });
            // Heard only when sound has just been switched on.
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
        {route.name !== 'play' && route.name !== 'grown-ups' && (
          <Link to={{ name: 'grown-ups' }} className={styles.grownUps} aria-label={ui.grownUps}>
            <IconGrownUps size={24} />
            <span className={styles.grownUpsText} aria-hidden="true">
              {ui.grownUps}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
