import type { Metadata } from "next";
import Link from "next/link";
import { Envelope } from "@phosphor-icons/react/ssr";
import { ContactForm } from "@/components/contact-form";
import { Container } from "@/components/ui";
import { SUPPORT_EMAIL } from "@/lib/email";
import { pageAlternates } from "@/lib/site";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return { title: dict.contactPage.title, description: dict.contactPage.intro, alternates: pageAlternates(locale, "/contact") };
}

export default async function ContactPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const c = dict.contactPage;
  return (
    <Container className="grid gap-10 pt-12 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="flex flex-col gap-5">
        <h1 className="font-display text-4xl font-light tracking-tight sm:text-5xl">{c.title}</h1>
        <p className="text-lg leading-relaxed text-body">{c.intro}</p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex w-fit items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 text-ink no-underline hover:border-brand hover:text-ink"
        >
          <Envelope size={24} weight="duotone" className="text-brass" aria-hidden="true" />
          <span className="flex flex-col">
            <span className="text-[13px] text-muted">{c.emailLabel}</span>
            <span dir="ltr" className="font-medium">
              {SUPPORT_EMAIL}
            </span>
          </span>
        </a>
        <ul className="flex flex-col gap-2 text-sm text-body">
          <li>{c.responseTime}</li>
          <li>{c.notBroker}</li>
          <li>
            {c.developersNote} <Link href={`/${locale}/dev`}>{dict.footer.listProject}</Link>
          </li>
        </ul>
      </div>
      <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <ContactForm
          locale={locale}
          labels={{
            kind: c.kind,
            kinds: c.kinds,
            name: c.name,
            email: c.email,
            phone: c.phone,
            message: c.message,
            messageHint: c.messageHint,
            send: c.send,
            sending: c.sending,
            privacy: c.privacy,
          }}
        />
      </div>
    </Container>
  );
}
