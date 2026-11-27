import { WORLDS } from '@/game/worlds';
import type { WorldId } from '@/engine/schema';
import { ActionButton } from '@/ui/controls';
import styles from './GrownUps.module.css';

interface Guide {
  title: string;
  what: string;
  safety: string;
}

const activities: Partial<Record<WorldId, Guide>> = {
  'reading-cove': {
    title: 'Sound hunt',
    what: 'While sitting together, make a quiet sound with paper or tap a wooden spoon on a table. Ask what made it, then swap roles. Try finding two familiar things that start with the same sound.',
    safety: 'Use familiar household objects. Keep sounds comfortable and away from ears.',
  },
  'number-garden': {
    title: 'Count a picnic for toys',
    what: 'Set out three or four soft toys and one sock for each. Let your child touch each thing as they count it. Move the socks farther apart and ask how many there are now.',
    safety:
      'Use socks or full-size soft toys. Leave out small objects and keep the floor clear when you are done.',
  },
  'robot-ridge': {
    title: 'Be the robot',
    what: 'Use cushions to mark a simple path on a clear floor. Plan a few steps together, then be the robot and follow them. If you end up somewhere unexpected, trace the steps and change one instruction.',
    safety:
      'Walk slowly and stay on the same level. Keep the path away from stairs, doors and furniture edges.',
  },
  'memory-forest': {
    title: 'What is missing?',
    what: 'Put three familiar objects on a table together. Look at them and name them. Cover them with a towel, remove one, and ask what is missing. Swap turns. Try grouping by where each thing was.',
    safety: 'Pick large, light objects and stay together. Keep the towel on the table.',
  },
};

export function Guides() {
  const print = () => {
    const root = document.documentElement;
    root.dataset.printing = 'guides';
    const reset = () => delete root.dataset.printing;
    window.addEventListener('afterprint', reset, { once: true });
    try {
      window.print();
    } catch (error: unknown) {
      window.removeEventListener('afterprint', reset);
      reset();
      throw error;
    }
  };

  return (
    <details className={styles.card} data-testid="offline-guides">
      <summary>Play together away from the screen</summary>
      <div className={styles.guideActions}>
        <ActionButton onClick={print}>Print these activities</ActionButton>
      </div>
      {WORLDS.map((world) => {
        const guide = activities[world.id];
        const entries = world.activities.flatMap(({ title, together }) =>
          together ? [{ title, ...together }] : [],
        );
        if (guide) entries.unshift(guide);
        return (
          <section key={world.id} className={styles.guideWorld} aria-label={world.name}>
            <h3>{world.name}</h3>
            {entries.map(({ title, what, safety }) => (
              <article className={styles.printActivity} key={title}>
                <h4>{title}</h4>
                <p>{what}</p>
                <p>
                  <strong>Stay safe.</strong> {safety}
                </p>
              </article>
            ))}
          </section>
        );
      })}
    </details>
  );
}
