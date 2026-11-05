import type { ReactNode } from "react";
import { Container } from "@/components/ui";
import { PAGES_UPDATED, type InfoPage } from "@/content/pages";

/** A text page (About, Privacy, Terms): title, last update, intro, and numbered sections. */
export function InfoPageView({ page, locale, updatedLabel, after }: { page: InfoPage; locale: "ar" | "en"; updatedLabel: string; after?: ReactNode }) {
  const updated = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { dateStyle: "long" }).format(new Date(PAGES_UPDATED));
  return (
    <Container className="flex max-w-3xl flex-col gap-8 pt-12 pb-24">
      <header className="flex flex-col gap-3 border-b border-line pb-8">
        <h1 className="font-display text-4xl font-light tracking-tight sm:text-5xl">{page.title}</h1>
        <p className="text-sm text-muted">{updatedLabel.replace("{date}", updated)}</p>
        <p className="text-lg leading-relaxed text-body">{page.intro}</p>
      </header>
      {page.sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-normal">{s.heading}</h2>
          {s.paragraphs?.map((p) => (
            <p key={p} className="leading-relaxed text-body">
              {p}
            </p>
          ))}
          {s.bullets && (
            <ul className="flex list-disc flex-col gap-2 ps-5 leading-relaxed text-body marker:text-brass">
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {after}
    </Container>
  );
}
