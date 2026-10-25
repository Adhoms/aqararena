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
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="flex flex-col gap-2">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Tag className={`font-display font-light tracking-[-0.015em] ${Tag === "h1" ? "text-4xl sm:text-[46px]" : "text-[32px] sm:text-[42px]"}`}>
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

/** Placeholder shaped like the project cards while results load; `label` is read to screen readers. */
export function CardGridSkeleton({ label, count = 6 }: { label: string; count?: number }) {
  return (
    <div role="status" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-6">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" className="overflow-hidden rounded-[22px] border border-line bg-surface">
          <div className="h-52 animate-pulse bg-white/5" />
          <div className="flex flex-col gap-3 p-4.5">
            <div className="h-5 w-2/3 animate-pulse rounded-md bg-white/8" />
            <div className="h-3.5 w-1/2 animate-pulse rounded-md bg-white/6" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="h-8 animate-pulse rounded-md bg-white/5" />
              <div className="h-8 animate-pulse rounded-md bg-white/5" />
              <div className="h-8 animate-pulse rounded-md bg-white/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
