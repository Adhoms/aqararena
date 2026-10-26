import type { Locale } from "@/i18n/config";
import { EgyptBlueprint } from "./egypt-blueprint";

/**
 * The site-wide backdrop: the page colour with soft pools of accent light that drift
 * slowly, a map of Egypt drawn like an architect's plan, and a fine film grain. Sits behind everything
 * (fixed, -z-10) and is purely decorative. Motion stops for reduced-motion users.
 */
export function AmbientBackground({ locale }: { locale: Locale }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ground print:hidden">
      {/* Light pools */}
      <div className="ambient-blob ambient-a absolute -top-[18vh] -start-[12vw] size-[62vmax] rounded-full bg-[radial-gradient(circle_at_center,var(--blob-a),transparent_68%)]" />
      <div className="ambient-blob ambient-b absolute top-[22vh] -end-[18vw] size-[58vmax] rounded-full bg-[radial-gradient(circle_at_center,var(--blob-b),transparent_66%)]" />
      <div className="ambient-blob ambient-c absolute -bottom-[26vh] start-[18vw] size-[56vmax] rounded-full bg-[radial-gradient(circle_at_center,var(--blob-c),transparent_64%)]" />
      <div className="ambient-blob ambient-d absolute top-[48vh] start-[42vw] size-[34vmax] rounded-full bg-[radial-gradient(circle_at_center,var(--blob-a),transparent_70%)]" />

      {/* Egypt drawn as an architect's plan sheet, spanning the full width (on phones it is
          widened past the screen so the country itself stays readable). */}
      <EgyptBlueprint
        locale={locale}
        wide
        className="absolute inset-y-0 left-1/2 h-full w-full -translate-x-1/2 opacity-(--bp-opacity) max-md:w-[225vw] max-md:opacity-[calc(var(--bp-opacity)*0.7)]"
      />

      {/* Film grain */}
      <div className="ambient-grain absolute inset-0 opacity-(--grain-opacity) [mix-blend-mode:var(--grain-blend)]" />
    </div>
  );
}
