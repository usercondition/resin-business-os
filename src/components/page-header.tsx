import type { ReactNode } from "react";

import type { IconProps } from "@/components/icons";

type Props = {
  title: string;
  icon?: React.ComponentType<IconProps>;
  description?: ReactNode;
  /** Extra row below description (status pills, etc.) */
  children?: ReactNode;
};

export function PageHeader({ title, icon: Icon, description, children }: Props) {
  return (
    <header className="mb-1">
      <div className="flex items-start gap-2.5">
        {Icon ? (
          <span className="mt-0.5 shrink-0 text-[var(--muted-foreground)]" aria-hidden>
            <Icon size={22} />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold leading-tight tracking-tight">{title}</h1>
          {description ? <div className="minimal-muted mt-1 text-sm">{description}</div> : null}
          {children}
        </div>
      </div>
    </header>
  );
}
