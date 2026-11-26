import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Link } from '@/app/navigation';
import type { Route } from '@/app/router';
import styles from './controls.module.css';

/**
 * The shell's controls. Every one is a real button or link, at least 48 px in both directions (56 px for anything a
 * child is meant to press), with a visible keyboard focus ring and a pressed state that does not rely on colour.
 */

const cx = (...names: (string | false | undefined)[]): string => names.filter(Boolean).join(' ');

type Tone = 'plain' | 'sun' | 'quiet' | 'danger';

interface ButtonLook {
  tone?: Tone;
  /** A circle holding only an icon; give it an `aria-label`. */
  round?: boolean;
  big?: boolean;
  icon?: ReactNode;
}

function lookClass({ tone = 'plain', round, big }: ButtonLook, extra?: string): string {
  return cx(styles.button, styles[tone], round && styles.round, big && styles.big, extra);
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonLook;

export function ActionButton({
  tone,
  round,
  big,
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ActionButtonProps) {
  return (
    <button type={type} className={lookClass({ tone, round, big }, className)} {...rest}>
      {icon}
      {children !== undefined && children !== null && <span>{children}</span>}
    </button>
  );
}

interface ActionLinkProps extends ButtonLook {
  to: Route;
  className?: string;
  children?: ReactNode;
  'aria-label'?: string;
  /** Words shown on hover and on keyboard focus, for a button that is only a picture (see base.css). */
  'data-tip'?: string;
  'data-tip-side'?: 'top';
  'data-tip-align'?: 'start' | 'end';
  onPointerEnter?: () => void;
  onFocus?: () => void;
}

export function ActionLink({
  tone,
  round,
  big,
  icon,
  className,
  children,
  ...rest
}: ActionLinkProps) {
  return (
    <Link className={lookClass({ tone, round, big }, className)} {...rest}>
      {icon}
      {children !== undefined && children !== null && <span>{children}</span>}
    </Link>
  );
}

interface ToggleButtonProps {
  pressed: boolean;
  onChange: (pressed: boolean) => void;
  /** What the control is, for assistive technology: "Sound", not "Sound on". The pressed state says the rest. */
  label: string;
  /** The current state in words: the tooltip, for someone with a mouse or a keyboard. */
  stateText: string;
  icon: ReactNode;
}

/** An on/off switch drawn as a round button. The icon changes with the state, so colour is never the only cue. */
export function ToggleButton({ pressed, onChange, label, stateText, icon }: ToggleButtonProps) {
  return (
    <button
      type="button"
      className={cx(styles.button, styles.round, styles.toggle, pressed && styles.pressed)}
      aria-pressed={pressed}
      aria-label={label}
      data-tip={stateText}
      data-tip-align="end"
      onClick={() => onChange(!pressed)}
    >
      {icon}
    </button>
  );
}

interface HoldButtonProps {
  /** How long the button must be held. */
  seconds?: number;
  onComplete: () => void;
  children: ReactNode;
  icon?: ReactNode;
}

/**
 * Holding a button down: what a button needs so that it only acts after being held for `seconds`, with a finger, a
 * mouse, or the Space or Enter key. Letting go, or sliding off, before then does nothing.
 */
function useHold(
  seconds: number,
  onComplete: () => void,
): {
  holding: boolean;
  handlers: Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    | 'onPointerDown'
    | 'onPointerUp'
    | 'onPointerLeave'
    | 'onPointerCancel'
    | 'onContextMenu'
    | 'onKeyDown'
    | 'onKeyUp'
    | 'onBlur'
  >;
} {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  const start = () => {
    if (timer.current !== null) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      completeRef.current();
    }, seconds * 1000);
  };
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const isHoldKey = (key: string) => key === ' ' || key === 'Enter';
  return {
    holding,
    handlers: {
      onPointerDown: (event) => {
        if (event.button === 0) start();
      },
      onPointerUp: stop,
      onPointerLeave: stop,
      onPointerCancel: stop,
      onContextMenu: (event) => event.preventDefault(),
      onKeyDown: (event) => {
        if (isHoldKey(event.key)) {
          event.preventDefault();
          if (!event.repeat) start();
        }
      },
      onKeyUp: (event) => {
        if (isHoldKey(event.key)) stop();
      },
      onBlur: stop,
    },
  };
}

/**
 * A button that only acts after being held down: a small, honest deterrent for small fingers. It is not a lock.
 * Holding works with a finger, a mouse, or the Space or Enter key.
 */
export function HoldButton({ seconds = 2, onComplete, children, icon }: HoldButtonProps) {
  const { holding, handlers } = useHold(seconds, onComplete);
  return (
    <button
      type="button"
      className={cx(styles.button, styles.sun, styles.big, styles.hold, holding && styles.holding)}
      style={{ '--hold-seconds': `${seconds}s` } as CSSProperties}
      {...handlers}
    >
      <span className={styles.holdFill} aria-hidden="true" />
      <span className={styles.holdContent}>
        {icon}
        <span>{children}</span>
      </span>
    </button>
  );
}

interface HoldToggleProps extends ToggleButtonProps {
  /** How long it must be held before it changes. */
  seconds?: number;
}

/**
 * An on/off switch that changes only after being held down, either way: for a switch that is a grown-up's to set,
 * on a screen a child is tapping. A tap does nothing to it. It is not a lock.
 */
export function HoldToggle({
  pressed,
  onChange,
  label,
  stateText,
  icon,
  seconds = 1.2,
}: HoldToggleProps) {
  const { holding, handlers } = useHold(seconds, () => onChange(!pressed));
  return (
    <button
      type="button"
      className={cx(
        styles.button,
        styles.round,
        styles.toggle,
        styles.holdToggle,
        pressed && styles.pressed,
        holding && styles.holding,
      )}
      style={{ '--hold-seconds': `${seconds}s` } as CSSProperties}
      aria-pressed={pressed}
      aria-label={label}
      data-tip={stateText}
      data-tip-align="end"
      data-holding={holding || undefined}
      {...handlers}
    >
      {/* The fill is clipped to the button by a layer of its own, so that the words on hover are not. */}
      <span className={styles.holdClip} aria-hidden="true">
        <span className={styles.holdFill} />
      </span>
      {icon}
    </button>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}

/**
 * A modal dialog on the native <dialog> element: focus is trapped and Escape closes it, for free.
 *
 * A dialog says it has closed a moment after it closes, not as it closes. If it has been opened again by then —
 * "Cancel", and at once the button that opens it — that late word is about the time before, and is not taken
 * as a wish to close this one. (It was, at first: the dialog opened and shut, and whoever had asked for it was
 * left looking at the page.)
 */
export function Modal({ open, onClose, title, children, actions }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.modal}
      aria-label={title}
      onClose={(event) => {
        if (!event.currentTarget.open) onClose();
      }}
      onCancel={onClose}
    >
      {open && (
        <div className={styles.modalBody}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <div className={styles.modalText}>{children}</div>
          <div className={styles.modalActions}>{actions}</div>
        </div>
      )}
    </dialog>
  );
}
