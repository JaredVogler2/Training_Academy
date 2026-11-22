import { useEffect } from 'react';
import { playCue } from '@/audio';
import { activeProfile, refreshProfiles, useProfiles } from '@/game/profiles';
import { WORLDS, type WorldInfo } from '@/game/worlds';
import { HubStage } from '@/render/HubStage';
import { AvatarPicture, WorldEmblem } from '@/ui/art';
import { IconAsleep, IconPlay } from '@/ui/icons';
import { Link } from './navigation';
import { ui } from './strings';
import styles from './Home.module.css';

function WorldTile({ world }: { world: WorldInfo }) {
  const open = world.status === 'sample';
  return (
    <Link
      to={{ name: 'world', world: world.id }}
      className={styles.tile}
      data-role={world.role}
      data-world={world.id}
      onClick={() => playCue('tap')}
    >
      <span className={styles.emblem}>
        <WorldEmblem world={world.id} className={styles.emblemArt} />
        <span className={styles.badge} data-open={open}>
          {open ? <IconPlay size={16} /> : <IconAsleep size={16} />}
        </span>
      </span>
      <span className={styles.tileName}>{world.name}</span>
      <span className="sr-only">. {open ? ui.tryIt : ui.notOpenYet}.</span>
    </Link>
  );
}

/** The hub: Academy Isle, and the six ways out of it. */
export function Home() {
  const profiles = useProfiles();
  const player = activeProfile(profiles);

  useEffect(() => {
    void refreshProfiles();
  }, []);

  return (
    <div className={styles.hub}>
      <HubStage />
      <h1 className="sr-only">{ui.chooseWorld}</h1>
      {player && (
        <p className={styles.player}>
          <AvatarPicture avatar={player.avatar} className={styles.playerPicture} />
          <span className="sr-only">{ui.player}: </span>
          <span className={styles.playerName}>{player.name}</span>
        </p>
      )}
      <nav className={styles.dock} aria-label={ui.worlds}>
        <ul className={styles.tiles}>
          {WORLDS.map((world) => (
            <li key={world.id}>
              <WorldTile world={world} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
