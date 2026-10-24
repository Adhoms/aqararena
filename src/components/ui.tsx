import type { ReactNode } from "react";

/** Page-width wrapper used by every section. */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-310 px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Eyebrow({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <span className={`text-[13px] font-medium tracking-[0.08em] ltr:uppercase ltr:tracking-[0.14em] ${onDark ? "text-brass-light" : "text-brass"}`}>
      {children}
    </span>
  );
}

/** Eyebrow + heading on one side, an optional link on the other. */
export function SectionHeading({
  eyebrow,
  title,
  action,
  as: Tag = "h2",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1.5">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Tag className={`font-display font-normal tracking-tight ${Tag === "h1" ? "text-4xl sm:text-[40px]" : "text-3xl sm:text-[34px]"}`}>
          {title}
        </Tag>
      </div>
      {action}
    </div>
  );
}

/** Stand-in for a real photo until media is uploaded to R2. */
export function PhotoPlaceholder({
  label,
  className = "",
  tone = "light",
  children,
}: {
  label?: string;
  className?: string;
  tone?: "light" | "deep" | "dark";
  children?: ReactNode;
}) {
  const tones = {
    light: "bg-photo text-muted",
    deep: "bg-photo-deep text-body",
    dark: "bg-brand-3 text-on-dark",
  };
  return (
    <div role={label ? "img" : undefined} aria-label={label} className={`relative flex items-end p-4 text-[13px] ${tones[tone]} ${className}`}>
      {label && <span aria-hidden="true">{label}</span>}
      {children}
    </div>
  );
}

export function Pill({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" | "brass" | "outline" }) {
  const tones = {
    light: "bg-surface text-ink",
    dark: "bg-brand text-white",
    brass: "bg-brass-soft text-brass-dark",
    outline: "border border-line-strong bg-surface text-ink",
  };
  return <span className={`inline-flex rounded-full px-3 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

/** Small label/value pair used on cards. */
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-[15px] font-semibold">{value}</span>
    </div>
  );
}
