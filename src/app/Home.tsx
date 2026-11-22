import { useEffect, useState, type CSSProperties } from 'react';
import { playCue } from '@/audio';
import { activeProfile, refreshProfiles, useProfiles } from '@/game/profiles';
import { WORLDS, type WorldInfo } from '@/game/worlds';
import { HubStage } from '@/render/HubStage';
import { hotspotFor, labelSize, type Frame, type PlaceId } from '@/render/archipelago';
import { useHubFrame } from '@/render/useHubFrame';
import { AvatarPicture } from '@/ui/art';
import { IconAsleep, IconPlay } from '@/ui/icons';
import { Link } from './navigation';
import { ui } from './strings';
import styles from './Home.module.css';

/**
 * One world on the map: a link laid over its island, covering the island, its landmark and its name, so the whole
 * thing is the button. The picture underneath (3D or not) is decoration; this is what is pressed, focused and read
 * out.
 */
function WorldSpot({
  world,
  frame,
  onLift,
}: {
  world: WorldInfo;
  frame: Frame;
  onLift: (place: PlaceId | null) => void;
}) {
  const open = world.status === 'sample';
  const { box } = hotspotFor(frame, world.id);
  return (
    <Link
      to={{ name: 'world', world: world.id }}
      className={styles.spot}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      data-role={world.role}
      data-world={world.id}
      data-open={open}
      onClick={() => playCue('tap')}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') onLift(world.id);
      }}
      onPointerDown={() => onLift(world.id)}
      onPointerLeave={() => onLift(null)}
      onPointerCancel={() => onLift(null)}
      onFocus={() => onLift(world.id)}
      onBlur={() => onLift(null)}
    >
      <span className={styles.label}>
        <span className={styles.badge}>
          {open ? <IconPlay size={16} /> : <IconAsleep size={16} />}
        </span>
        <span className={styles.name}>{world.name}</span>
      </span>
      <span className="sr-only">. {open ? ui.tryIt : ui.notOpenYet}.</span>
    </Link>
  );
}

/** The hub: the archipelago, and the six ways into it. */
export function Home() {
  const profiles = useProfiles();
  const player = activeProfile(profiles);
  const { stage, free, frame } = useHubFrame();
  const [lifted, setLifted] = useState<PlaceId | null>(null);

  useEffect(() => {
    void refreshProfiles();
  }, []);

  return (
    <div className={styles.hub} ref={stage} data-arrangement={frame?.layout.arrangement}>
      <div className={styles.free} ref={free} />
      <HubStage frame={frame} lifted={lifted} />
      <h1 className="sr-only">{ui.chooseWorld}</h1>
      {player && (
        <p className={styles.player}>
          <AvatarPicture avatar={player.avatar} className={styles.playerPicture} />
          <span className="sr-only">{ui.player}: </span>
          <span className={styles.playerName}>{player.name}</span>
        </p>
      )}
      <nav
        className={styles.worlds}
        aria-label={ui.worlds}
        // Names are sized from the islands, so they fit under them on a small phone held sideways.
        style={{ '--label': `${String(frame ? labelSize(frame.scale) : 15)}px` } as CSSProperties}
      >
        <ul>
          {frame &&
            WORLDS.map((world) => (
              <li key={world.id}>
                <WorldSpot world={world} frame={frame} onLift={setLifted} />
              </li>
            ))}
        </ul>
      </nav>
    </div>
  );
}
