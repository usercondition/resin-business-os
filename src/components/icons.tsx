import type { ReactNode, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & {
  /** Pixel size; default 16 */
  size?: number;
};

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Base({ size = 16, className, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      {...stroke}
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconLayers({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </Base>
  );
}

export function IconLayoutDashboard({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <rect height="9" rx="1" width="7" x="3" y="3" />
      <rect height="5" rx="1" width="7" x="14" y="3" />
      <rect height="9" rx="1" width="7" x="14" y="12" />
      <rect height="5" rx="1" width="7" x="3" y="16" />
    </Base>
  );
}

export function IconGlobe({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </Base>
  );
}

export function IconActivity({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <path d="M22 12h-4l-3 9L9 3 6 12H2" />
    </Base>
  );
}

export function IconPackage({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <path d="M16.5 9.4 7.55 4.24" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" x2="12" y1="22" y2="12" />
    </Base>
  );
}

export function IconInbox({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </Base>
  );
}

export function IconMessageSquare({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Base>
  );
}

export function IconUsers({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Base>
  );
}

/** Shelved stock / inventory */
export function IconArchive({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <rect height="5" rx="1" width="20" x="2" y="3" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <line x1="10" x2="14" y1="12" y2="12" />
    </Base>
  );
}

export function IconBarChart3({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </Base>
  );
}

export function IconUpload({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </Base>
  );
}

export function IconLogOut({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </Base>
  );
}

export function IconSun({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </Base>
  );
}

export function IconMoon({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </Base>
  );
}

export function IconMail({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <rect height="16" rx="2" width="20" x="2" y="4" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </Base>
  );
}

export function IconCopy({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <rect height="14" rx="2" ry="2" width="14" x="8" y="8" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Base>
  );
}

export function IconClipboardList({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <rect height="4" rx="1" ry="1" width="8" x="8" y="2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </Base>
  );
}

export function IconRefreshCw({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </Base>
  );
}

export function IconBell({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Base>
  );
}

export function IconSparkles({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <path d="m12 3-1.9 5.8-6 2.1 6 2.1L12 21l1.9-5.8 6-2.1-6-2.1L12 3Z" />
    </Base>
  );
}

export function IconSearch({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Base>
  );
}

export function IconArrowRight({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </Base>
  );
}

export function IconArrowLeft({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </Base>
  );
}

export function IconExternalLink({ size, className, ...rest }: IconProps) {
  return (
    <Base size={size} className={className} {...rest}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" x2="21" y1="14" y2="3" />
    </Base>
  );
}
