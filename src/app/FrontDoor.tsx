import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { playCue } from '@/audio';
import { AVATAR_IDS, type AvatarId } from '@/engine/schema';
import type { Profile } from '@/engine/schema';
import {
  createProfile,
  isNewToTheGame,
  setActiveProfile,
  type ProfilesState,
} from '@/game/profiles';
import { Guide } from '@/ui/Guide';
import { AvatarPicture } from '@/ui/art';
import { recordError } from './diagnostics';
import { begin } from './journey';
import { navigate } from './navigation';
import { avatarNames, ui } from './strings';
import styles from './FrontDoor.module.css';

/** How long the door takes to open; if the browser never reports the end of that, the game goes on anyway. */
const OPENING_MS = 700;

/**
 * The front door: what a visit opens on. Glim says hello and the child says who is playing by tapping a picture —
 * their own, if they have played here before, or one to be theirs if nobody has.
 *
 * It is one tap, on a picture, with nothing to read. That tap is also the first touch the browser needs before it
 * will make any sound, so the game is heard from here on. Adding more players, renaming and removing them belong to
 * the grown-ups' area, behind its press-and-hold.
 *
 * Someone who has never played goes from here to "how to play", once; everyone else, to the islands.
 */
export function FrontDoor({ profiles }: { profiles: ProfilesState }) {
  const [opening, setOpening] = useState(false);
  const chosen = useRef(false);

  // Whatever happens to the animation (switched off, never run in a hidden tab), the door does open.
  useEffect(() => {
    if (!opening) return;
    const timer = window.setTimeout(begin, OPENING_MS);
    return () => window.clearTimeout(timer);
  }, [opening]);

  const choose = (save: () => Promise<Profile>) => {
    // One choice: a second finger, or a second tap while the first is being saved, changes nothing.
    if (chosen.current) return;
    chosen.current = true;
    playCue('hello');
    void save()
      .then(isNewToTheGame)
      // A device that cannot save still plays; the grown-ups' area says plainly that it is not saving.
      .catch((error: unknown) => {
        recordError('storage', error);
        return false;
      })
      .then((fresh) => {
        if (!fresh) {
          setOpening(true);
          return;
        }
        // Someone who has not played before: Glim shows them how, before the islands.
        begin();
        navigate({ name: 'how-to' });
      });
  };

  const ready = profiles.status === 'ready';
  const players = profiles.profiles;
  const firstVisit = ready && players.length === 0;

  return (
    <section
      className={styles.door}
      aria-labelledby="front-door-title"
      data-testid="front-door"
      data-opening={opening}
      onAnimationEnd={(event) => {
        if (opening && event.target === event.currentTarget) begin();
      }}
    >
      <div className={styles.card} data-first={firstVisit}>
        <Guide state="wave" aim={90} className={styles.guide} />
        <h1 id="front-door-title" className={styles.title}>
          {firstVisit ? ui.choosePicture : ui.choosePlayer}
        </h1>
        {ready && (
          <ul className={styles.players}>
            {firstVisit
              ? AVATAR_IDS.map((avatar: AvatarId, index) => (
                  <li key={avatar}>
                    <button
                      type="button"
                      className={styles.player}
                      style={{ '--order': index } as CSSProperties}
                      aria-label={ui.pickPicture(avatarNames[avatar])}
                      data-avatar={avatar}
                      onClick={() =>
                        choose(() => createProfile({ name: avatarNames[avatar], avatar }))
                      }
                    >
                      <span className={styles.face}>
                        <AvatarPicture avatar={avatar} />
                      </span>
                    </button>
                  </li>
                ))
              : players.map((player, index) => (
                  <li key={player.id}>
                    <button
                      type="button"
                      className={styles.player}
                      style={{ '--order': index } as CSSProperties}
                      aria-label={ui.playAs(player.name)}
                      data-avatar={player.avatar}
                      onClick={() => choose(() => setActiveProfile(player.id).then(() => player))}
                    >
                      <span className={styles.face}>
                        <AvatarPicture avatar={player.avatar} />
                      </span>
                      <span className={styles.name} aria-hidden="true">
                        {player.name}
                      </span>
                    </button>
                  </li>
                ))}
          </ul>
        )}
      </div>
    </section>
  );
}
