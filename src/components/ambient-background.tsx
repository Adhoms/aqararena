import type { Locale } from "@/i18n/config";
import { EgyptBlueprint } from "./egypt-blueprint";

/**
 * The site-wide backdrop: bone paper with soft pools of amber and sage light that drift
 * slowly, a map of Egypt drawn like an architect's plan, and a fine film grain. Sits behind everything
 * (fixed, -z-10) and is purely decorative. Motion stops for reduced-motion users.
 */
export function AmbientBackground({ locale }: { locale: Locale }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ground print:hidden">
      {/* Light pools */}
      <div className="ambient-blob ambient-a absolute -top-[18vh] -start-[12vw] size-[62vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(226,168,74,0.16),rgba(226,168,74,0)_68%)]" />
      <div className="ambient-blob ambient-b absolute top-[22vh] -end-[18vw] size-[58vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(120,170,150,0.18),rgba(120,170,150,0)_66%)]" />
      <div className="ambient-blob ambient-c absolute -bottom-[26vh] start-[18vw] size-[56vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(29,74,66,0.10),rgba(29,74,66,0)_64%)]" />
      <div className="ambient-blob ambient-d absolute top-[48vh] start-[42vw] size-[34vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(226,168,74,0.08),rgba(226,168,74,0)_70%)]" />

      {/* Egypt drawn as an architect's plan sheet */}
      <EgyptBlueprint
        locale={locale}
        className="absolute top-1/2 left-1/2 h-[min(94vh,140vw)] w-auto -translate-x-1/2 -translate-y-1/2 opacity-20 max-md:opacity-15"
      />

      {/* Film grain */}
      <div className="ambient-grain absolute inset-0 opacity-[0.05] mix-blend-multiply" />
    </div>
  );
}
