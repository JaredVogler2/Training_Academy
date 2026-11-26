import type { SelectHTMLAttributes } from 'react';
import styles from './GrownUps.module.css';

/**
 * A choice from a list, as the browser draws it, in a box of its own.
 *
 * The box is there because of Safari. A select's own words are laid out at their full length, however narrow the
 * control is: Chromium cuts them off at the control's edge, and Safari lets them run on beneath it, so that a page
 * with a long name in a select is as wide as the name, and slides sideways under a finger. (In CI: 440 pixels wide
 * on an iPhone's 390, from "The beginning: Listening for sounds all around, part 1".) So the edge that is seen is
 * drawn round the control, and whatever runs past it is cut off there.
 *
 * What is cut off is said in full somewhere else: a control that hides the end of what was chosen may not be the
 * only place that says it.
 */
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={styles.select}>
      <select {...props} />
    </span>
  );
}
