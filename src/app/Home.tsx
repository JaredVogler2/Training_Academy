import { useEffect, useState, type CSSProperties } from 'react';
import { playCue } from '@/audio';
import { activeProfile, refreshProfiles, useProfiles } from '@/game/profiles';
import { nextWorld, useFinishedLessons } from '@/game/progress';
import { WORLDS, isOpen, type WorldInfo } from '@/game/worlds';
import { HubStage } from '@/render/HubStage';
import {
  COMPACT_LABELS_BELOW,
  guideBox,
  hotspotFor,
  labelSize,
  labelWidth,
  type Frame,
  type PlaceId,
} from '@/render/archipelago';
import { useHubFrame } from '@/render/useHubFrame';
import { Guide } from '@/ui/Guide';
import { AvatarPicture } from '@/ui/art';
import { IconAsleep, IconPlay } from '@/ui/icons';
import { FrontDoor } from './FrontDoor';
import { useBegun } from './journey';
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
  next,
  onLift,
}: {
  world: WorldInfo;
  frame: Frame;
  /** This is the world Glim is pointing at: where the next unfinished thing is. */
  next: boolean;
  onLift: (place: PlaceId | null) => void;
}) {
  const open = isOpen(world);
  const { box } = hotspotFor(frame, world.id);
  return (
    <Link
      to={{ name: 'world', world: world.id }}
      className={styles.spot}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      data-role={world.role}
      data-world={world.id}
      data-open={open}
      data-next={next || undefined}
      onClick={() => playCue(open ? 'sail' : 'tap')}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') onLift(world.id);
      }}
      onPointerDown={() => onLift(world.id)}
      onPointerLeave={() => onLift(null)}
      onPointerCancel={() => onLift(null)}
      onFocus={() => onLift(world.id)}
      onBlur={() => onLift(null)}
    >
      <span
        className={styles.label}
        style={{ maxWidth: labelWidth(frame, world.id) }}
        data-compact={frame.scale < COMPACT_LABELS_BELOW || undefined}
      >
        <span className={styles.badge}>
          {open ? <IconPlay size={16} /> : <IconAsleep size={16} />}
        </span>
        <span className={styles.name} data-name>
          {world.name}
        </span>
      </span>
      <span className="sr-only">. {open ? ui.tryIt : ui.notOpenYet}.</span>
    </Link>
  );
}

/**
 * Glim, afloat between the islands, pointing at the world that has something to play. A tap says hello, and so
 * does arriving from the front door.
 */
function HubGuide({
  frame,
  arriving,
  open,
}: {
  frame: Frame;
  arriving: boolean;
  /** The world to point at, if there is one. */
  open: WorldInfo | null;
}) {
  const [greeting, setGreeting] = useState(arriving);
  useEffect(() => {
    if (!greeting) return;
    const timer = window.setTimeout(() => setGreeting(false), 1800);
    return () => window.clearTimeout(timer);
  }, [greeting]);

  const box = guideBox(frame);
  // Point from the guide's shoulder to the island: screen y runs downwards, angles run upwards.
  const from = { x: box.left + box.width / 2, y: box.top + box.height * 0.45 };
  const to = open ? hotspotFor(frame, open.id).anchor : null;
  const aim = to ? (Math.atan2(from.y - to.y, to.x - from.x) * 180) / Math.PI : 90;

  return (
    <button
      type="button"
      className={styles.guide}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      aria-label={ui.guideHello}
      onClick={() => {
        playCue('hello');
        setGreeting(true);
      }}
    >
      <Guide state={greeting ? 'wave' : open ? 'point' : 'idle'} aim={aim} afloat />
    </button>
  );
}

/**
 * The hub: the archipelago, and the six ways into it. A visit begins at the front door, in front of the map; the
 * map is already there behind it, and comes alive once the child has said who is playing.
 */
export function Home() {
  const profiles = useProfiles();
  const player = activeProfile(profiles);
  const { stage, free, frame } = useHubFrame();
  const [lifted, setLifted] = useState<PlaceId | null>(null);
  const begun = useBegun();
  // Where the next unfinished thing is: the island Glim points at.
  const next = nextWorld(useFinishedLessons());
  // Whether this page opened on the front door: if so, Glim greets the child on the map as well.
  const [openedAtDoor] = useState(!begun);

  useEffect(() => {
    void refreshProfiles();
  }, []);

  return (
    <div className={styles.hub} ref={stage} data-arrangement={frame?.layout.arrangement}>
      <div className={styles.free} ref={free} />
      <HubStage frame={frame} lifted={lifted} waiting={!begun} />
      {!begun && <FrontDoor profiles={profiles} />}
      <div className={styles.map} inert={!begun}>
        <h1 className="sr-only">{ui.chooseWorld}</h1>
        {/* Who is playing — once the child has said so. Before that, the front door is asking. */}
        {player && begun && (
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
                  <WorldSpot
                    world={world}
                    frame={frame}
                    next={world.id === next?.id}
                    onLift={setLifted}
                  />
                </li>
              ))}
          </ul>
        </nav>
        {/* After the worlds, so the keyboard and a screen reader reach the islands first. */}
        {frame && begun && <HubGuide frame={frame} arriving={openedAtDoor} open={next} />}
      </div>
    </div>
  );
}
