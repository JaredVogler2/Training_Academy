import { ActionButton, ActionLink } from '@/ui/controls';
import { IconHome, IconReplay } from '@/ui/icons';
import { ChunkLoadError } from './chunks';
import { ui } from './strings';
import styles from './App.module.css';

/** What a broken screen is replaced with: calm, short, and with a way out. */
export function Trouble({ error, retry }: { error: Error; retry: () => void }) {
  const offline = error instanceof ChunkLoadError;
  return (
    <section className={styles.notice} role="alert">
      <h1>{offline ? ui.troubleOfflineTitle : ui.troubleTitle}</h1>
      <p>{offline ? ui.troubleOfflineBody : ui.troubleBody}</p>
      <div className={styles.noticeActions}>
        {offline ? (
          <ActionButton
            tone="sun"
            big
            icon={<IconReplay />}
            onClick={() => window.location.reload()}
          >
            {ui.reload}
          </ActionButton>
        ) : (
          <ActionButton tone="sun" big icon={<IconReplay />} onClick={retry}>
            {ui.tryAgain}
          </ActionButton>
        )}
        <ActionLink to={{ name: 'home' }} big icon={<IconHome />}>
          {ui.home}
        </ActionLink>
      </div>
    </section>
  );
}

export function NotFound() {
  return (
    <section className={styles.notice}>
      <h1>{ui.notFoundTitle}</h1>
      <p>{ui.notFoundBody}</p>
      <div className={styles.noticeActions}>
        <ActionLink to={{ name: 'home' }} tone="sun" big icon={<IconHome />}>
          {ui.backHome}
        </ActionLink>
      </div>
    </section>
  );
}

export function Loading() {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.loadingDot} />
      <span className={styles.loadingDot} />
      <span className={styles.loadingDot} />
      <span className="sr-only">{ui.loading}</span>
    </div>
  );
}
