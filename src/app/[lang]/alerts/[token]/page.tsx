import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BellRinging, BellSimpleSlash } from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui";
import { db } from "@/lib/db";
import { fill } from "@/lib/format";
import { getDictionary, getLocale } from "../../dictionaries";
import { confirmAlert, unsubscribeAlert } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.alertsPage.title, robots: { index: false, follow: false } };
}

// Links from price-alert emails: confirm the address, or stop the alerts.
export default function Page({ params, searchParams }: PageProps<"/[lang]/alerts/[token]">) {
  return (
    <Container className="flex max-w-xl flex-col pt-16 pb-28">
      <Suspense fallback={<div className="h-56 animate-pulse rounded-3xl bg-divider" />}>
        <AlertBody params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

const button = "inline-flex min-h-12 items-center justify-center rounded-full px-7 font-medium transition-colors";

async function AlertBody({ params, searchParams }: Pick<PageProps<"/[lang]/alerts/[token]">, "params" | "searchParams">) {
  const [{ token }, query, locale, dict] = await Promise.all([params, searchParams, getLocale(), getDictionary()]);
  const a = dict.alertsPage;
  const alert = await db.priceAlert.findUnique({
    where: { token: decodeURIComponent(token) },
    include: { project: { select: { slug: true, nameAr: true, nameEn: true } } },
  });

  const card = (icon: React.ReactNode, title: string, text: string, actions: React.ReactNode) => (
    <div className="flex flex-col items-start gap-5 rounded-3xl border border-line bg-surface p-7 sm:p-9">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">{icon}</span>
      <h1 className="font-display text-3xl font-normal tracking-tight">{title}</h1>
      <p className="leading-relaxed text-body">{text}</p>
      <div className="flex flex-wrap items-center gap-3">{actions}</div>
    </div>
  );
  const browse = (
    <Link href={`/${locale}/projects`} className="font-semibold">
      {a.browse}
    </Link>
  );

  if (!alert) {
    const bye = query.bye === "1";
    return card(<BellSimpleSlash size={24} weight="duotone" aria-hidden="true" />, bye ? a.byeTitle : a.missingTitle, bye ? a.byeText : a.missingText, browse);
  }

  const name = locale === "en" ? alert.project.nameEn : alert.project.nameAr;
  const hidden = (
    <>
      <input type="hidden" name="token" value={alert.token} />
      <input type="hidden" name="locale" value={locale} />
    </>
  );
  const projectLink = (
    <Link href={`/${locale}/projects/${alert.project.slug}`} className="font-semibold">
      {a.project}
    </Link>
  );

  if (query.off === "1") {
    return card(
      <BellSimpleSlash size={24} weight="duotone" aria-hidden="true" />,
      a.offTitle,
      fill(a.offText, { name }),
      <>
        <form action={unsubscribeAlert}>
          {hidden}
          <button type="submit" className={`${button} bg-ink text-ground hover:opacity-90`}>
            {a.off}
          </button>
        </form>
        {projectLink}
      </>,
    );
  }

  if (!alert.confirmedAt) {
    return card(
      <BellRinging size={24} weight="duotone" aria-hidden="true" />,
      a.confirmTitle,
      fill(a.confirmText, { name }),
      <>
        <form action={confirmAlert}>
          {hidden}
          <button type="submit" className={`${button} bg-brand text-white hover:bg-brand-2`}>
            {a.confirm}
          </button>
        </form>
        {projectLink}
      </>,
    );
  }

  return card(
    <BellRinging size={24} weight="duotone" aria-hidden="true" />,
    a.onTitle,
    fill(a.onText, { name, email: alert.email }),
    <>
      <Link href={`/${locale}/projects/${alert.project.slug}`} className={`${button} bg-brand text-white no-underline hover:bg-brand-2 hover:text-white`}>
        {a.project}
      </Link>
      <form action={unsubscribeAlert}>
        {hidden}
        <button type="submit" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
          {a.stop}
        </button>
      </form>
    </>,
  );
}
