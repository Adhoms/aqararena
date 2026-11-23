import { LogoMark } from "@/components/brand-mark";

// A wrong link and an offer still waiting for a team lead's approval look the same on purpose.
export default function OfferNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 py-12 text-center" dir="rtl">
      <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-[14px] bg-brand text-brass-light">
        <LogoMark className="size-10" />
      </span>
      <h1 className="m-0 font-display text-2xl font-light">الرابط ده مش بيفتح عرض</h1>
      <p className="m-0 text-body">ممكن يكون العرض لسه مستني موافقة، أو الرابط ناقص. اسأل مسؤول المبيعات اللي بعتهولك.</p>
      <p lang="en" dir="ltr" className="m-0 text-sm text-muted">
        This link doesn&apos;t open an offer. Please ask your sales contact.
      </p>
    </main>
  );
}
