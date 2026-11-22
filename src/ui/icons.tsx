import type { ReactNode, SVGProps } from 'react';

/**
 * Interface icons, drawn for this game: 24-unit grid, round joins, `currentColor`. They are decorative by default
 * (`aria-hidden`); the control that holds one carries the accessible name.
 */

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

function Icon({ size = 28, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

const speaker = (
  <path d="M4 9.5h3l4.2-3.6c.5-.4 1.3-.1 1.3.6v11c0 .7-.8 1-1.3.6L7 14.5H4z" fill="currentColor" />
);

export function IconSoundOn(props: IconProps) {
  return (
    <Icon {...props}>
      {speaker}
      <path d="M16 9.2a4 4 0 0 1 0 5.6" />
      <path d="M18.6 6.6a7.6 7.6 0 0 1 0 10.8" />
    </Icon>
  );
}

export function IconSoundOff(props: IconProps) {
  return (
    <Icon {...props}>
      {speaker}
      <path d="m16.2 9.6 4.8 4.8M21 9.6l-4.8 4.8" />
    </Icon>
  );
}

export function IconMotionOn(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8h9.5a2.5 2.5 0 1 0-2.4-3.2" />
      <path d="M3 12h15a2.6 2.6 0 1 1-2.5 3.3" />
      <path d="M3 16h7.2a2.2 2.2 0 1 1-2.1 2.8" />
    </Icon>
  );
}

export function IconMotionCalm(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8.5h16" />
      <path d="M4 12h16" />
      <path d="M4 15.5h16" />
    </Icon>
  );
}

export function IconGrownUps(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="7.2" r="3" />
      <path d="M3.2 19.5c.4-3.6 2.7-5.8 5.8-5.8 1.4 0 2.6.4 3.6 1.2" />
      <circle cx="17.2" cy="12.6" r="2.2" />
      <path d="M13.4 20c.3-2.4 1.8-3.8 3.8-3.8S20.700 17.600 21 20" />
    </Icon>
  );
}

export function IconHome(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 11.2 12 4l8.5 7.2" />
      <path d="M6 10v9.2h12V10" />
      <path d="M10 19.2v-5h4v5" />
    </Icon>
  );
}

export function IconBack(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19.500 12h-15" />
      <path d="m10.500 5.500-6.500 6.500 6.500 6.500" />
    </Icon>
  );
}

export function IconNext(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.500 12h15" />
      <path d="m13.500 5.500 6.500 6.500-6.500 6.500" />
    </Icon>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M7.5 4.800v14.400c0 .8.9 1.300 1.600.9l11.500-7.200c.6-.4.600-1.300 0-1.700L9.100 3.900c-.7-.4-1.600.1-1.600.9z"
        fill="currentColor"
      />
    </Icon>
  );
}

export function IconHint(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.600 15.200A6 6 0 1 1 15.400 15.200c-.6.5-.9 1.100-.9 1.800v.5h-5V17c0-.7-.3-1.300-.9-1.800z" />
      <path d="M9.800 20.500h4.400" />
    </Icon>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m4.500 12.800 4.700 4.700 10.300-11" />
    </Icon>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}

export function IconReplay(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.500 12a7.500 7.500 0 1 0 2.400-5.500" />
      <path d="M4 4.500v4.200h4.200" />
    </Icon>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v11" />
      <path d="m7.500 10.800 4.500 4.500 4.500-4.500" />
      <path d="M5 19.500h14" />
    </Icon>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 15.300V4.300" />
      <path d="M7.500 8.500 12 4l4.500 4.500" />
      <path d="M5 19.500h14" />
    </Icon>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.500 7h15" />
      <path d="M9.500 7V4.500h5V7" />
      <path d="M6.500 7 7.400 19.500h9.200L17.500 7" />
    </Icon>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m4.500 19.500 1-4.200L15.800 5a1.800 1.800 0 0 1 2.500 0l.7.7a1.800 1.800 0 0 1 0 2.500L8.700 18.500z" />
    </Icon>
  );
}

/** "Not awake yet": marks a world that has not been built. */
export function IconAsleep(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M19 14.500A7.500 7.500 0 0 1 9.500 5a7.500 7.500 0 1 0 9.500 9.500z"
        fill="currentColor"
      />
    </Icon>
  );
}

/** A pointing hand, used by the guide to show where to tap. */
export function IconPointer(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={1.8}>
      <path
        d="M9.200 11.500V4.700a1.700 1.700 0 0 1 3.400 0v5.100l4.700.9c1.400.3 2.300 1.600 2.100 3l-.6 4.100a3.700 3.700 0 0 1-3.700 3.200h-3.300a4 4 0 0 1-3.100-1.500l-3.500-4.300a1.600 1.600 0 0 1 2.300-2.200z"
        fill="#fff"
      />
    </Icon>
  );
}
