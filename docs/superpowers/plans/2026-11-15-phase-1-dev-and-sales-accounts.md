# Phase 1: `/dev` landing and AqarArena Sales accounts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give developers a `/dev` landing page that presents the portal and AqarArena Sales, let a developer's portal account create and manage sales-team accounts, and give each salesperson a signed-in `/sales` area (projects overview, profile, password).

**Architecture:** Same Next.js app and database (spec: `docs/superpowers/specs/2026-11-15-aqararena-three-products-design.md`, sections 3, 8 and 10.1). Sales accounts are a new `SalesAccount` table owned by a developer. `/sales` is its own root layout (Arabic, RTL) with its own signed cookie scoped to `/sales`, mirroring how `/portal` works. `/dev` replaces `/[lang]/for-developers` (permanent redirect) and lives under `[lang]` like every public page.

**Tech Stack:** Next.js 16 (App Router, Cache Components, `proxy.ts`), React 19, TypeScript, Tailwind CSS 4, Prisma 7 on PostgreSQL, Node's built-in test runner via `tsx`.

**Base branch:** `claude/aqararena-sales` (stacked on PR #19). Read `AGENTS.md`: this Next.js has breaking changes; check `node_modules/next/dist/docs/` before using an API you are unsure of.

**Local testing:** never use the main checkout's `.env` (it is the live database). Follow the memory note "Local testing": a throwaway `npx prisma dev --detach --name aqararena-p1-test`, a worktree `.env` built from `.env.example`, `npx prisma migrate deploy`, `npm run db:seed`. Remove it at the end.

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/lib/session-token.ts` (new) | Pure signing and reading of `a.b.c.signature` tokens. No Next.js imports, so it is unit-tested. |
| `src/lib/session-token.test.ts` (new) | Tests for the above. |
| `prisma/schema.prisma` (modify) | `SalesRole` enum and `SalesAccount` model; relation on `Developer`. |
| `prisma/migrations/<timestamp>_sales_accounts/migration.sql` (new, generated) | The additive migration. |
| `src/lib/sales/cookie.ts` (new) | Cookie name and public paths (imported by the proxy, so no heavy imports). |
| `src/lib/sales/session.ts` (new) | Start/end session, `currentSalesAccount`, `requireSales`. |
| `src/lib/sales/fields.ts` (new) | Reads and checks a salesperson's details from a form (shared by the portal and `/sales`). |
| `src/lib/sales/fields.test.ts` (new) | Tests for the above. |
| `src/proxy.ts` (modify) | Keep `/sales` out of the locale redirect; send signed-out visitors to `/sales/login`. |
| `src/app/sales/layout.tsx` (new) | Root layout for `/sales`: Arabic, RTL, fonts, site tokens and form styles. |
| `src/app/sales/actions.ts` (new) | Sign in/out, change password, update own profile. |
| `src/components/sales/sales-shell.tsx` (new) | Signed-in frame (header, nav, sign-out) and the centred card for sign-in pages. |
| `src/app/sales/login/page.tsx` (new) | Sign-in page. |
| `src/app/sales/password/page.tsx` (new) | Change password (forced on first sign-in). |
| `src/app/sales/page.tsx` (new) | Home: the company's published projects with unit availability. |
| `src/app/sales/me/page.tsx` (new) | Own profile: details shown on offers. |
| `src/app/portal/team-actions.ts` (new) | Portal: create, edit, enable/disable, reset password of sales accounts. |
| `src/app/portal/team/page.tsx` (new) | Portal: «فريق المبيعات» page. |
| `src/components/portal/portal-shell.tsx` (modify) | Add «فريق المبيعات» to the portal menu. |
| `src/app/[lang]/dev/page.tsx` (new, replaces `for-developers/page.tsx`) | Developer landing: portal + Sales. |
| `src/app/[lang]/for-developers/` (delete) | Replaced by a redirect. |
| `next.config.ts` (modify) | `/:lang/for-developers` → `/:lang/dev` (308). |
| `src/app/[lang]/dictionaries/ar.json`, `en.json` (modify) | New `/dev` texts. |
| `src/components/site-header.tsx`, `site-footer.tsx`, `src/app/[lang]/contact/page.tsx`, `src/app/[lang]/developers/page.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts` (modify) | Links to `/dev`; `/sales` kept out of search engines. |
| `README.md`, `docs/ROADMAP.md` (modify) | Document the new routes. |

---

### Task 1: Signed session tokens

**Files:**
- Create: `src/lib/session-token.ts`
- Test: `src/lib/session-token.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/session-token.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { readToken, signToken } from "./session-token";

const KEY = "test-key";

test("a signed token reads back its parts", () => {
  const token = signToken(["acc1", "1900000000000", "3"], KEY);
  assert.deepEqual(readToken(token, KEY, 3), ["acc1", "1900000000000", "3"]);
});

test("a token signed with another key, or changed, is refused", () => {
  const token = signToken(["acc1", "1900000000000", "3"], KEY);
  assert.equal(readToken(token, "other-key", 3), null);
  assert.equal(readToken(token.replace("acc1", "acc2"), KEY, 3), null);
});

test("the wrong number of parts is refused", () => {
  const token = signToken(["acc1", "1900000000000"], KEY);
  assert.equal(readToken(token, KEY, 3), null);
  assert.equal(readToken("", KEY, 3), null);
});

test("parts may not contain the separator", () => {
  assert.throws(() => signToken(["a.b", "1"], KEY));
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npm test`
Expected: FAIL, `Cannot find module './session-token'`.

- [ ] **Step 3: Implement**

```ts
// src/lib/session-token.ts
import { createHmac, timingSafeEqual } from "node:crypto";

// Session cookies hold a few values joined by dots plus an HMAC signature: "a.b.c.signature".
// Pure functions (no Next.js imports) so they can be tested and shared by every sign-in area.

const mac = (value: string, key: string) => createHmac("sha256", key).update(value).digest("base64url");

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function signToken(parts: string[], key: string): string {
  if (parts.some((p) => p.includes("."))) throw new Error("Token parts may not contain '.'");
  const value = parts.join(".");
  return `${value}.${mac(value, key)}`;
}

/** The token's parts when the signature matches and there are exactly `count` of them, otherwise null. */
export function readToken(token: string, key: string, count: number): string[] | null {
  const parts = token.split(".");
  if (parts.length !== count + 1) return null;
  const signature = parts.pop()!;
  return safeEqual(signature, mac(parts.join("."), key)) ? parts : null;
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: all pass (the 22 existing tests plus 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/session-token.ts src/lib/session-token.test.ts
git commit -m "Signed session tokens shared by sign-in areas"
```

---

### Task 2: `SalesAccount` in the database

**Files:**
- Modify: `prisma/schema.prisma`
- Create (generated): `prisma/migrations/<timestamp>_sales_accounts/migration.sql`

- [ ] **Step 1: Add the model**

In `model Developer`, after `submissions Submission[]`, add:

```prisma
  salesAccounts SalesAccount[]
```

At the end of the file, add:

```prisma
// ─── AqarArena Sales ────────────────────────────────────────────────────

/// AGENT: sees their own clients and work. LEAD: also sees the whole team's.
enum SalesRole {
  AGENT
  LEAD
}

/// A member of a developer's sales team, created from the developer portal. Signs in at /sales.
/// The name and numbers here are the ones printed on that person's offers.
model SalesAccount {
  id                 String        @id @default(cuid())
  developerId        String
  developer          Developer     @relation(fields: [developerId], references: [id], onDelete: Cascade)
  username           String        @unique
  /// scrypt hash, see src/lib/portal/password.ts
  passwordHash       String
  role               SalesRole     @default(AGENT)
  /// ACTIVE or DISABLED (PENDING is not used for sales accounts).
  status             AccountStatus @default(ACTIVE)
  nameAr             String
  nameEn             String?
  phone              String
  whatsapp           String?
  email              String?
  mustChangePassword Boolean       @default(true)
  /// Raised to sign the account out everywhere (password change, disable).
  sessionVersion     Int           @default(0)
  lastLoginAt        DateTime?
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  @@index([developerId, status])
}
```

- [ ] **Step 2: Generate the migration (needs the throwaway database from the header)**

Run: `npx prisma migrate dev --create-only --name sales_accounts`
Expected: a new folder `prisma/migrations/<timestamp>_sales_accounts/` whose SQL only creates the `SalesRole` type, the `SalesAccount` table, its unique index on `username`, its index and its foreign key. Nothing is dropped or altered.

Then restore the lock file, which Prisma rewrites with different line endings:

Run: `git checkout -- prisma/migrations/migration_lock.toml`

- [ ] **Step 3: Apply it and regenerate the client**

Run: `npx prisma migrate deploy && npx prisma generate`
Expected: "All migrations have been successfully applied." and "Generated Prisma Client".

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "SalesAccount table for developer sales teams"
```

---

### Task 3: Reading a salesperson's details from a form

> **Done, then changed after code review (commit `0c9672d`).** `src/lib/sales/fields.ts` is the source of truth: phones are normalised (`normalizePhone`: Arabic-Indic and Persian digits, brackets and dots) and must match `telHref`'s pattern with 8 to 15 digits; `readSalesPerson` no longer returns a role; the role is read with `readSalesRole(f)`, used only by the portal. The code below is the original plan text.

**Files:**
- Create: `src/lib/sales/fields.ts`
- Test: `src/lib/sales/fields.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sales/fields.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { FormReader } from "@/lib/admin/form";
import { readSalesPerson } from "./fields";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return new FormReader(data);
};

test("a complete form reads cleanly", () => {
  const f = form({ nameAr: "أحمد علي", nameEn: "Ahmed Ali", phone: "+20 100 123 4567", whatsapp: "", email: "ahmed@example.com", role: "LEAD" });
  const v = readSalesPerson(f);
  assert.equal(f.ok, true);
  assert.deepEqual(v, { nameAr: "أحمد علي", nameEn: "Ahmed Ali", phone: "+20 100 123 4567", whatsapp: null, email: "ahmed@example.com", role: "LEAD" });
});

test("name and phone are required, the phone needs enough digits, the email must look like one", () => {
  const f = form({ nameAr: "", phone: "12", email: "not-an-email" });
  readSalesPerson(f);
  assert.equal(f.errors.nameAr, "هذا الحقل مطلوب");
  assert.match(f.errors.phone, /رقم موبايل/);
  assert.match(f.errors.email, /بريد/);
});

test("an unknown role falls back to AGENT", () => {
  const f = form({ nameAr: "منى", phone: "01001234567", role: "BOSS" });
  assert.equal(readSalesPerson(f).role, "AGENT");
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npm test`
Expected: FAIL, `Cannot find module './fields'`.

- [ ] **Step 3: Implement**

```ts
// src/lib/sales/fields.ts
import type { FormReader } from "@/lib/admin/form";

// A salesperson's details as typed in the portal ("فريق المبيعات") or on their own profile page.
// The names and numbers here are printed on their offers, so the phone must be dialable.

export const SALES_ROLES = ["AGENT", "LEAD"] as const;
export type SalesRoleValue = (typeof SALES_ROLES)[number];

const digits = (s: string | null) => (s ?? "").replace(/\D/g, "").length;

export function readSalesPerson(f: FormReader) {
  const phone = f.text("phone", { required: true, max: 40 });
  if (phone && digits(phone) < 8) f.errors.phone = "اكتب رقم موبايل كامل";
  const whatsapp = f.text("whatsapp", { max: 40 });
  if (whatsapp && digits(whatsapp) < 8) f.errors.whatsapp = "اكتب رقم واتساب كامل";
  const email = f.text("email", { max: 200 });
  if (email && !/^\S+@\S+\.\S+$/.test(email)) f.errors.email = "بريد إلكتروني غير صالح";
  return {
    nameAr: f.requiredText("nameAr", 100),
    nameEn: f.text("nameEn", { max: 100 }),
    phone: phone ?? "",
    whatsapp,
    email,
    role: (SALES_ROLES as readonly string[]).includes(String(f.text("role") ?? "")) ? (f.text("role") as SalesRoleValue) : "AGENT",
  };
}

export const ROLE_LABELS: Record<SalesRoleValue, string> = { AGENT: "سيلز", LEAD: "قائد فريق" };
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sales/fields.ts src/lib/sales/fields.test.ts
git commit -m "Read and check a salesperson's details"
```

---

### Task 4: Sales session and the proxy

**Files:**
- Create: `src/lib/sales/cookie.ts`
- Create: `src/lib/sales/session.ts`
- Modify: `src/proxy.ts`

- [ ] **Step 1: Cookie name and public paths**

```ts
// src/lib/sales/cookie.ts
/** Name of the AqarArena Sales session cookie. Kept apart from ./session.ts so the proxy can import it cheaply. */
export const SALES_COOKIE = "aqar_sales";

/** /sales pages anyone can open without signing in. */
export const SALES_PUBLIC_PATHS = ["/sales/login"];
```

- [ ] **Step 2: The session**

```ts
// src/lib/sales/session.ts
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { readToken, signToken } from "@/lib/session-token";
import { SALES_COOKIE } from "./cookie";

// A signed cookie holding the account id, an expiry and the account's session version.
// Every request re-reads the account, so disabling it or changing its password signs it out.

const SESSION_DAYS = 14;

function secret(): string | undefined {
  const base = process.env.SALES_SESSION_SECRET || process.env.PORTAL_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  // A separate key from the admin and portal cookies, even when they come from the same setting.
  return base ? `sales:${base}` : undefined;
}

export async function startSalesSession(account: { id: string; sessionVersion: number }) {
  const key = secret();
  if (!key) throw new Error("Set SALES_SESSION_SECRET (or ADMIN_PASSWORD) to use AqarArena Sales.");
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  (await cookies()).set(SALES_COOKIE, signToken([account.id, String(expires), String(account.sessionVersion)], key), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/sales",
    expires: new Date(expires),
  });
}

export async function endSalesSession() {
  (await cookies()).delete({ name: SALES_COOKIE, path: "/sales" });
}

export type SalesUser = {
  id: string;
  username: string;
  role: "AGENT" | "LEAD";
  nameAr: string;
  nameEn: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  mustChangePassword: boolean;
  developer: { id: string; nameAr: string; nameEn: string; slug: string };
};

/** The signed-in, active salesperson with their developer, or null. */
export async function currentSalesAccount(): Promise<SalesUser | null> {
  await connection();
  const key = secret();
  const token = (await cookies()).get(SALES_COOKIE)?.value;
  if (!key || !token) return null;
  const parts = readToken(token, key, 3);
  if (!parts) return null;
  const [id, expires, version] = parts;
  if (Number(expires) < Date.now()) return null;
  const account = await db.salesAccount.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      sessionVersion: true,
      nameAr: true,
      nameEn: true,
      phone: true,
      whatsapp: true,
      email: true,
      mustChangePassword: true,
      developer: { select: { id: true, nameAr: true, nameEn: true, slug: true } },
    },
  });
  if (!account || account.status !== "ACTIVE" || account.sessionVersion !== Number(version)) return null;
  const { status: _s, sessionVersion: _v, ...user } = account;
  void _s;
  void _v;
  return user;
}

/** Call at the top of every /sales page and action. Temporary passwords must be changed first. */
export async function requireSales({ allowTemporaryPassword = false } = {}): Promise<SalesUser> {
  const user = await currentSalesAccount();
  if (!user) redirect("/sales/login");
  if (user.mustChangePassword && !allowTemporaryPassword) redirect("/sales/password");
  return user;
}
```

- [ ] **Step 3: The proxy**

In `src/proxy.ts`, add the import:

```ts
import { SALES_COOKIE, SALES_PUBLIC_PATHS } from "@/lib/sales/cookie";
```

and, right after the `if (firstSegment === "portal") { … }` block, add:

```ts
  // AqarArena Sales works the same way with its own cookie.
  if (firstSegment === "sales") {
    if (!SALES_PUBLIC_PATHS.includes(pathname) && !request.cookies.has(SALES_COOKIE)) {
      return NextResponse.redirect(new URL("/sales/login", request.url));
    }
    return;
  }
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sales/cookie.ts src/lib/sales/session.ts src/proxy.ts
git commit -m "Sales sign-in session, kept out of the locale redirect"
```

---

### Task 5: Sales actions

**Files:**
- Create: `src/app/sales/actions.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/sales/actions.ts
"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { FormReader, type FormState } from "@/lib/admin/form";
import { MIN_PASSWORD, hashPassword, normalizeUsername, verifyPassword } from "@/lib/portal/password";
import { readSalesPerson } from "@/lib/sales/fields";
import { endSalesSession, requireSales, startSalesSession } from "@/lib/sales/session";
import { clearFailures, clientIp, lockedMessage, lockedMinutes, recordFailure } from "@/lib/throttle";

const slow = () => new Promise((r) => setTimeout(r, 800));

export async function salesLogin(_: FormState, data: FormData): Promise<FormState> {
  const username = normalizeUsername(String(data.get("username") ?? ""));
  const password = String(data.get("password") ?? "");
  // Limit wrong tries both per address and per account.
  const keys = [`sales-ip:${await clientIp()}`, ...(username ? [`sales-user:${username}`] : [])];
  const wait = await lockedMinutes(keys);
  if (wait) return { ok: false, message: lockedMessage(wait) };
  const account = username ? await db.salesAccount.findUnique({ where: { username } }) : null;
  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    await slow();
    await recordFailure(keys);
    return { ok: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" };
  }
  await clearFailures(keys);
  if (account.status !== "ACTIVE") return { ok: false, message: "الحساب ده موقوف. كلّم مدير الحساب في شركتك." };
  await db.salesAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
  await startSalesSession(account);
  redirect(account.mustChangePassword ? "/sales/password" : "/sales");
}

export async function salesLogout() {
  await endSalesSession();
  redirect("/sales/login");
}

export async function changeSalesPassword(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales({ allowTemporaryPassword: true });
  const account = await db.salesAccount.findUniqueOrThrow({ where: { id: me.id } });
  const current = String(data.get("current") ?? "");
  const next = String(data.get("password") ?? "");
  const errors: Record<string, string> = {};
  if (!(await verifyPassword(current, account.passwordHash))) errors.current = "كلمة المرور الحالية غير صحيحة";
  if (next.length < MIN_PASSWORD) errors.password = `${MIN_PASSWORD} حروف على الأقل`;
  else if (next === current) errors.password = "اختار كلمة مرور جديدة";
  if (next !== String(data.get("confirm") ?? "")) errors.confirm = "كلمتين المرور مش زي بعض";
  if (Object.keys(errors).length) {
    if (errors.current) await slow();
    return { ok: false, message: "راجع الحقول المظللة", errors };
  }
  const updated = await db.salesAccount.update({
    where: { id: account.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false, sessionVersion: { increment: 1 } },
  });
  await startSalesSession(updated);
  redirect("/sales?password=1");
}

/** A salesperson keeps their own name and numbers current; these go on their offers. The role is not theirs to change. */
export async function updateSalesProfile(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales();
  const f = new FormReader(data);
  // readSalesPerson has no role: only the company's portal account sets roles (readSalesRole).
  const values = readSalesPerson(f);
  if (!f.ok) return f.result();
  await db.salesAccount.update({ where: { id: me.id }, data: values });
  return { ok: true, message: "اتحفظ ✓ البيانات دي هتظهر على عروضك" };
}
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/sales/actions.ts
git commit -m "Sales sign-in, password and profile actions"
```

---

### Task 6: `/sales` layout, shell, sign-in and password pages

**Files:**
- Create: `src/app/sales/layout.tsx`
- Create: `src/components/sales/sales-shell.tsx`
- Create: `src/app/sales/login/page.tsx`
- Create: `src/app/sales/password/page.tsx`

Before writing the markup, load the `design-taste-frontend` skill and follow it for spacing, type scale and states; keep the site's existing tokens from `src/app/globals.css` (no new colours or fonts).

- [ ] **Step 1: Layout**

```tsx
// src/app/sales/layout.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { Alexandria, IBM_Plex_Sans_Arabic } from "next/font/google";
import "../globals.css";
import "../admin/admin.css";

const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic", "latin"], weight: ["400", "500", "600"] });
const alexandria = Alexandria({ variable: "--font-alexandria", subsets: ["arabic", "latin"], weight: ["300", "400", "500"] });

// Every /sales page checks the salesperson's session per request.
export const instant = false;

export const metadata: Metadata = {
  title: "AqarArena Sales",
  robots: { index: false, follow: false },
};

// AqarArena Sales is its own root layout: Arabic, right-to-left, no public header or footer.
export default function SalesLayout({ children }: LayoutProps<"/sales">) {
  return (
    <html lang="ar" dir="rtl" className={`${plexArabic.variable} ${alexandria.variable} h-full antialiased`}>
      <body className="min-h-full bg-ground font-sans leading-relaxed text-ink">
        <Suspense fallback={<p className="p-8 text-muted">جارٍ التحميل…</p>}>{children}</Suspense>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Shell**

```tsx
// src/components/sales/sales-shell.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import { salesLogout } from "@/app/sales/actions";
import { ROLE_LABELS } from "@/lib/sales/fields";
import type { SalesUser } from "@/lib/sales/session";

const brand = (
  <span dir="ltr" className="font-display text-lg tracking-[0.18em] text-ink">
    AQAR <span className="font-light text-brass">ARENA</span>
    <span className="ms-2 rounded-full bg-brand px-2 py-0.5 align-middle font-sans text-[11px] font-medium tracking-normal text-white">Sales</span>
  </span>
);

/** Header and frame for every signed-in /sales page. */
export function SalesShell({ me, title, children, actions }: { me: SalesUser; title: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-ground/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link href="/sales" className="no-underline">
            {brand}
          </Link>
          <span className="admin-badge">{me.developer.nameAr}</span>
          <nav aria-label="AqarArena Sales" className="flex flex-wrap gap-4 text-sm">
            <Link href="/sales">المشروعات</Link>
            <Link href="/sales/me">ملفي</Link>
          </nav>
          <div className="ms-auto flex items-center gap-3 text-sm">
            <span className="text-muted">
              {me.nameAr} · {ROLE_LABELS[me.role]}
            </span>
            <form action={salesLogout}>
              <button type="submit" className="admin-btn-ghost">
                خروج
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-light">{title}</h1>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}

/** The centred card used by the sign-in and password pages. */
export function SalesCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="admin-panel flex w-full max-w-sm flex-col gap-5">
        <div className="flex flex-col gap-2">
          {brand}
          <h1 className="font-display text-2xl font-light">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Sign-in page**

```tsx
// src/app/sales/login/page.tsx
import { redirect } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/fields";
import { SalesCard } from "@/components/sales/sales-shell";
import { currentSalesAccount } from "@/lib/sales/session";
import { salesLogin } from "../actions";

export default async function SalesLoginPage() {
  if (await currentSalesAccount()) redirect("/sales");
  return (
    <SalesCard title="دخول فريق المبيعات" subtitle="ادخل باسم المستخدم وكلمة المرور اللي اداهملك مدير الحساب في شركتك.">
      <AdminForm action={salesLogin} submitLabel="دخول">
        <TextField name="username" label="اسم المستخدم" dir="ltr" required />
        <TextField name="password" type="password" label="كلمة المرور" required />
      </AdminForm>
      <p className="border-t border-divider pt-4 text-sm text-muted">نسيت كلمة المرور؟ مدير الحساب في شركتك يقدر يعملك كلمة مرور جديدة من بوابة المطورين.</p>
    </SalesCard>
  );
}
```

- [ ] **Step 4: Password page**

```tsx
// src/app/sales/password/page.tsx
import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/fields";
import { SalesCard } from "@/components/sales/sales-shell";
import { requireSales } from "@/lib/sales/session";
import { changeSalesPassword } from "../actions";

export default async function SalesPasswordPage() {
  const me = await requireSales({ allowTemporaryPassword: true });
  return (
    <SalesCard
      title={me.mustChangePassword ? "اختار كلمة مرور جديدة" : "تغيير كلمة المرور"}
      subtitle={me.mustChangePassword ? "كلمة المرور اللي معاك مؤقتة. اختار كلمة مرور خاصة بيك قبل ما تكمّل." : `الحساب: ${me.username}`}
    >
      <AdminForm action={changeSalesPassword} submitLabel="حفظ">
        <TextField name="current" type="password" label="كلمة المرور الحالية" />
        <TextField name="password" type="password" label="كلمة المرور الجديدة" hint="10 حروف على الأقل" />
        <TextField name="confirm" type="password" label="تأكيد كلمة المرور الجديدة" />
      </AdminForm>
      {!me.mustChangePassword && (
        <Link href="/sales/me" className="text-sm">
          → رجوع
        </Link>
      )}
    </SalesCard>
  );
}
```

- [ ] **Step 5: Type-check, lint, commit**

Run: `npx next typegen && npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add src/app/sales/layout.tsx src/components/sales/sales-shell.tsx src/app/sales/login src/app/sales/password
git commit -m "AqarArena Sales: layout, sign-in and password pages"
```

---

### Task 7: `/sales` home and profile

**Files:**
- Create: `src/app/sales/page.tsx`
- Create: `src/app/sales/me/page.tsx`

- [ ] **Step 1: Home: the company's published projects**

```tsx
// src/app/sales/page.tsx
import { db } from "@/lib/db";
import { requireSales } from "@/lib/sales/session";
import { SalesShell } from "@/components/sales/sales-shell";

const num = (n: number) => n.toLocaleString("ar-EG");

// The company's published projects with how many units are available, as the starting point
// for a salesperson. Search, holds and offers build on this in the next phases.
export default async function SalesHome({ searchParams }: PageProps<"/sales">) {
  const me = await requireSales();
  const { password } = await searchParams;
  const projects = await db.project.findMany({
    where: { developerId: me.developer.id, published: true },
    orderBy: { nameAr: "asc" },
    select: { id: true, nameAr: true, slug: true, deliveryDate: true, _count: { select: { typologies: true } } },
  });
  const units = await db.unit.groupBy({
    by: ["availability", "typologyId"],
    where: { typology: { projectId: { in: projects.map((p) => p.id) } } },
    _count: { _all: true },
  });
  const types = await db.typology.findMany({ where: { projectId: { in: projects.map((p) => p.id) } }, select: { id: true, projectId: true } });
  const projectOf = new Map(types.map((t) => [t.id, t.projectId]));
  const count = (projectId: string, availability?: string) =>
    units.filter((u) => projectOf.get(u.typologyId) === projectId && (!availability || u.availability === availability)).reduce((n, u) => n + u._count._all, 0);

  return (
    <SalesShell me={me} title={`أهلًا ${me.nameAr}`}>
      {password && <p className="admin-panel text-brand">تم تغيير كلمة المرور ✓</p>}
      <section className="admin-panel overflow-x-auto">
        <h2 className="mb-3 font-display text-xl">مشروعات {me.developer.nameAr}</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted">لسه مفيش مشروعات منشورة لشركتك على AqarArena.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>المشروع</th>
                <th>التسليم</th>
                <th>النماذج</th>
                <th>متاحة</th>
                <th>كل الوحدات</th>
                <th>
                  <span className="sr-only">صفحة المشروع</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.nameAr}</td>
                  <td>{p.deliveryDate.getUTCFullYear()}</td>
                  <td>{num(p._count.typologies)}</td>
                  <td className="font-semibold text-brand">{num(count(p.id, "AVAILABLE"))}</td>
                  <td>{num(count(p.id))}</td>
                  <td>
                    <a href={`/ar/projects/${p.slug}`} target="_blank" rel="noreferrer">
                      صفحة المشروع ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </SalesShell>
  );
}
```

- [ ] **Step 2: Profile**

```tsx
// src/app/sales/me/page.tsx
import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { Panel, Row, TextField } from "@/components/admin/fields";
import { SalesShell } from "@/components/sales/sales-shell";
import { ROLE_LABELS } from "@/lib/sales/fields";
import { requireSales } from "@/lib/sales/session";
import { updateSalesProfile } from "../actions";

export default async function SalesMePage() {
  const me = await requireSales();
  return (
    <SalesShell me={me} title="ملفي">
      <Panel title="بياناتك على العروض">
        <p className="mb-4 text-sm text-muted">الاسم والأرقام دي هي اللي العميل هيشوفها على عروض الأسعار اللي هتبعتها.</p>
        <AdminForm action={updateSalesProfile}>
          <Row>
            <TextField name="nameAr" label="الاسم بالعربي *" defaultValue={me.nameAr} />
            <TextField name="nameEn" label="الاسم بالإنجليزي" defaultValue={me.nameEn} dir="ltr" hint="بيظهر على العروض الإنجليزي" />
          </Row>
          <Row cols={3}>
            <TextField name="phone" label="الموبايل *" defaultValue={me.phone} dir="ltr" />
            <TextField name="whatsapp" label="واتساب" defaultValue={me.whatsapp} dir="ltr" hint="فاضي = نفس الموبايل" />
            <TextField name="email" label="البريد الإلكتروني" defaultValue={me.email} dir="ltr" />
          </Row>
        </AdminForm>
      </Panel>
      <Panel title="الحساب">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted">اسم المستخدم</dt>
          <dd dir="ltr" className="text-end">
            {me.username}
          </dd>
          <dt className="text-muted">الدور</dt>
          <dd>{ROLE_LABELS[me.role]}</dd>
          <dt className="text-muted">الشركة</dt>
          <dd>{me.developer.nameAr}</dd>
        </dl>
        <Link href="/sales/password" className="admin-btn-ghost mt-4">
          تغيير كلمة المرور
        </Link>
      </Panel>
    </SalesShell>
  );
}
```

- [ ] **Step 3: Type-check, lint, commit**

Run: `npx next typegen && npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add src/app/sales/page.tsx src/app/sales/me
git commit -m "AqarArena Sales: projects overview and profile"
```

---

### Task 8: «فريق المبيعات» in the developer portal

**Files:**
- Create: `src/app/portal/team-actions.ts`
- Create: `src/app/portal/team/page.tsx`
- Modify: `src/components/portal/portal-shell.tsx`

- [ ] **Step 1: Actions**

```ts
// src/app/portal/team-actions.ts
"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { FormReader, type FormState } from "@/lib/admin/form";
import { generatePassword, hashPassword, normalizeUsername } from "@/lib/portal/password";
import { requireAccount } from "@/lib/portal/session";
import { readSalesPerson, readSalesRole } from "@/lib/sales/fields";

// The developer's portal account manages its own sales team. Temporary passwords are shown once,
// to be handed to the salesperson, who must choose their own at first sign-in.

/** A sales account that belongs to the signed-in developer, or null. */
async function ownMember(developerId: string, id: string | null) {
  return id ? db.salesAccount.findFirst({ where: { id, developerId }, select: { id: true, username: true } }) : null;
}

export async function createSalesAccount(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireAccount();
  const f = new FormReader(data);
  const values = { ...readSalesPerson(f), role: readSalesRole(f) };
  const username = normalizeUsername(String(data.get("username") ?? ""));
  if (!username) f.errors.username = "حروف إنجليزية صغيرة وأرقام و . _ - (3 لـ 32)";
  if (!f.ok || !username) return f.result();
  if (await db.salesAccount.findUnique({ where: { username }, select: { id: true } })) {
    return { ok: false, message: "اسم المستخدم مستخدم", errors: { username: "اختار اسم تاني" } };
  }
  const password = generatePassword();
  await db.salesAccount.create({ data: { ...values, username, developerId: me.developerId, passwordHash: await hashPassword(password) } });
  return {
    ok: true,
    message: `اتعمل الحساب ✓ اسم المستخدم: ${username} · كلمة المرور المؤقتة: ${password} (انسخها دلوقتي، مش هتظهر تاني). الدخول من aqararena.com/sales`,
  };
}

export async function updateSalesAccount(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireAccount();
  const f = new FormReader(data);
  const member = await ownMember(me.developerId, f.id("id"));
  if (!member) return { ok: false, message: "الحساب ده مش في فريقك" };
  const values = { ...readSalesPerson(f), role: readSalesRole(f) };
  if (!f.ok) return f.result();
  await db.salesAccount.update({ where: { id: member.id }, data: values });
  return { ok: true, message: "اتحفظ ✓" };
}

export async function resetSalesPassword(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireAccount();
  const member = await ownMember(me.developerId, new FormReader(data).id("id"));
  if (!member) return { ok: false, message: "الحساب ده مش في فريقك" };
  const password = generatePassword();
  await db.salesAccount.update({
    where: { id: member.id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true, sessionVersion: { increment: 1 } },
  });
  return { ok: true, message: `كلمة المرور المؤقتة لـ ${member.username}: ${password} (انسخها دلوقتي)` };
}

export async function setSalesStatus(data: FormData) {
  const me = await requireAccount();
  const member = await ownMember(me.developerId, new FormReader(data).id("id"));
  if (member) {
    const status = data.get("status") === "ACTIVE" ? "ACTIVE" : "DISABLED";
    await db.salesAccount.update({ where: { id: member.id }, data: { status, sessionVersion: { increment: 1 } } });
  }
  redirect("/portal/team");
}
```

- [ ] **Step 2: Page**

```tsx
// src/app/portal/team/page.tsx
import { db } from "@/lib/db";
import { requireAccount } from "@/lib/portal/session";
import { ROLE_LABELS, SALES_ROLES } from "@/lib/sales/fields";
import { PortalShell } from "@/components/portal/portal-shell";
import { AdminForm } from "@/components/admin/admin-form";
import { Panel, Row, Select, TextField } from "@/components/admin/fields";
import { createSalesAccount, resetSalesPassword, setSalesStatus, updateSalesAccount } from "../team-actions";

const when = (d: Date | null) => (d ? d.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" }) : "لسه ماخدش");
const roleOptions = SALES_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }));

type Member = { nameAr?: string | null; nameEn?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null; role?: string };

function PersonFields({ m }: { m?: Member }) {
  return (
    <>
      <Row cols={3}>
        <TextField name="nameAr" label="الاسم بالعربي *" defaultValue={m?.nameAr} />
        <TextField name="nameEn" label="الاسم بالإنجليزي" defaultValue={m?.nameEn} dir="ltr" />
        <Select name="role" label="الدور *" defaultValue={m?.role ?? "AGENT"} options={roleOptions} />
      </Row>
      <Row cols={3}>
        <TextField name="phone" label="الموبايل *" defaultValue={m?.phone} dir="ltr" />
        <TextField name="whatsapp" label="واتساب" defaultValue={m?.whatsapp} dir="ltr" />
        <TextField name="email" label="البريد الإلكتروني" defaultValue={m?.email} dir="ltr" />
      </Row>
    </>
  );
}

export default async function PortalTeamPage() {
  const me = await requireAccount();
  const team = await db.salesAccount.findMany({ where: { developerId: me.developerId }, orderBy: [{ status: "asc" }, { nameAr: "asc" }] });

  return (
    <PortalShell company={me.developer.nameAr} title="فريق المبيعات" back>
      <section className="admin-panel flex flex-col gap-2 text-sm">
        <p className="font-medium">AqarArena Sales</p>
        <p className="text-muted">
          كل سيلز بيدخل من <span dir="ltr">aqararena.com/sales</span> باسم مستخدم وكلمة مرور خاصين بيه، وبيشوف مشروعات شركتك بس. «قائد الفريق» بيشوف شغل الفريق كله. الاسم والأرقام هنا بتظهر على عروض الأسعار اللي السيلز بيبعتها.
        </p>
      </section>

      <Panel title={`الفريق (${team.length.toLocaleString("ar-EG")})`}>
        <div className="flex flex-col gap-3">
          {team.length === 0 && <p className="text-sm text-muted">لسه مفيش حد. ضيف أول عضو تحت.</p>}
          {team.map((m) => (
            <details key={m.id} className="admin-item">
              <summary>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <strong>{m.nameAr}</strong>
                  <span dir="ltr" className="text-muted">
                    {m.username}
                  </span>
                  <span className="admin-badge">{ROLE_LABELS[m.role]}</span>
                  {m.status !== "ACTIVE" && <span className="admin-badge-off">موقوف</span>}
                  {m.mustChangePassword && <span className="text-xs text-muted">(كلمة مرور مؤقتة)</span>}
                  <span className="text-xs text-muted">آخر دخول: {when(m.lastLoginAt)}</span>
                </span>
                <span className="text-xs text-link">تعديل ▾</span>
              </summary>
              <AdminForm action={updateSalesAccount}>
                <input type="hidden" name="id" value={m.id} />
                <PersonFields m={m} />
              </AdminForm>
              <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-divider pt-4">
                <AdminForm action={resetSalesPassword} submitLabel="كلمة مرور مؤقتة جديدة">
                  <input type="hidden" name="id" value={m.id} />
                </AdminForm>
                <form action={setSalesStatus}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="status" value={m.status === "ACTIVE" ? "DISABLED" : "ACTIVE"} />
                  <button type="submit" className={m.status === "ACTIVE" ? "admin-btn-danger" : "admin-btn-ghost"}>
                    {m.status === "ACTIVE" ? "إيقاف الحساب" : "تفعيل الحساب"}
                  </button>
                </form>
              </div>
            </details>
          ))}
          <details className="admin-item border-dashed" open={team.length === 0}>
            <summary>
              <span className="font-medium text-link">+ إضافة عضو للفريق</span>
            </summary>
            <AdminForm action={createSalesAccount} submitLabel="إضافة" resetOnSuccess>
              <TextField name="username" label="اسم المستخدم *" dir="ltr" hint="حروف إنجليزية صغيرة وأرقام، مثلًا ahmed.ali" />
              <PersonFields />
              <p className="text-xs text-muted">هتظهرلك كلمة مرور مؤقتة مرة واحدة. ابعتها للسيلز، وهو هيختار كلمة مرور جديدة أول ما يدخل.</p>
            </AdminForm>
          </details>
        </div>
      </Panel>
    </PortalShell>
  );
}
```

- [ ] **Step 3: Menu link**

In `src/components/portal/portal-shell.tsx`, in the `<nav>`, after `<Link href="/portal">مشروعاتي</Link>`, add:

```tsx
            <Link href="/portal/team">فريق المبيعات</Link>
```

- [ ] **Step 4: Type-check, lint, commit**

Run: `npx next typegen && npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add src/app/portal/team-actions.ts src/app/portal/team src/components/portal/portal-shell.tsx
git commit -m "Portal: manage the sales team"
```

---

### Task 9: `/dev` landing page

**Files:**
- Create: `src/app/[lang]/dev/page.tsx`
- Delete: `src/app/[lang]/for-developers/page.tsx`
- Modify: `next.config.ts`, `src/app/[lang]/dictionaries/ar.json`, `src/app/[lang]/dictionaries/en.json`, `src/components/site-header.tsx`, `src/components/site-footer.tsx`, `src/app/[lang]/contact/page.tsx`, `src/app/[lang]/developers/page.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`

Load the `design-taste-frontend` skill before writing the page and keep the existing section rhythm of the old page.

- [ ] **Step 1: Dictionary texts**

Add these keys inside `"forDevelopersPage"` in `ar.json` (keep the existing keys):

```json
  "productsTitle": "منتجين لشركتك",
  "portalCard": {
    "title": "بوابة المطورين",
    "badge": "مجانًا",
    "text": "اعرض مشروعاتك على AqarArena: البيانات، الأسعار، أنظمة السداد، الصور، الماستر بلان، والوحدات وحالتها. وتابع زوار كل مشروع.",
    "cta": "اطلب حساب لشركتك"
  },
  "salesCard": {
    "title": "AqarArena Sales",
    "badge": "لفريق المبيعات",
    "text": "أداة لفريق مبيعاتك: كل سيلز بحساب خاص بيه، يدوّر في المخزون، يحجز وحدة مؤقتًا، ويطلّع عرض سعر PDF باسمه ويبعته على واتساب أو تليجرام أو الإيميل.",
    "cta": "اطلب عرض",
    "login": "دخول السيلز"
  },
  "salesTitle": "AqarArena Sales: فريقك يبيع من نفس البيانات",
  "salesSub": "نفس الأسعار والوحدات اللي على الموقع، في إيد فريق مبيعاتك. كل تحديث بيوصل للكل في نفس اللحظة.",
  "salesFeatures": [
    { "title": "حساب لكل سيلز", "text": "اسم مستخدم وكلمة مرور لكل شخص، وإنت بتضيف وتوقف من البوابة." },
    { "title": "بحث في المخزون", "text": "بالميزانية والغرف والدور والإطلالة، والمتاح بس هو اللي يظهر." },
    { "title": "حجز مؤقت", "text": "الوحدة بتتحجز لسيلز واحد لمدة محددة، ولو ماتأكدتش بترجع متاحة لوحدها." },
    { "title": "عرض سعر PDF", "text": "بجدول السداد قسط بقسط، واسم السيلز وأرقامه، وبيتبعت على واتساب أو تليجرام أو الإيميل." },
    { "title": "العملاء والمتابعة", "text": "كل عميل بعروضه وحجوزاته ومواعيد متابعته، وقائد الفريق شايف الكل." }
  ],
```

Add the same keys to `en.json`:

```json
  "productsTitle": "Two products for your company",
  "portalCard": {
    "title": "Developer portal",
    "badge": "Free",
    "text": "Show your projects on AqarArena: details, prices, payment plans, photos, master plan, and units with their status. And see each project's visitors.",
    "cta": "Request an account"
  },
  "salesCard": {
    "title": "AqarArena Sales",
    "badge": "For sales teams",
    "text": "A tool for your sales team: every salesperson has their own account, searches your inventory, holds a unit for a while, and sends a PDF offer in their name by WhatsApp, Telegram or email.",
    "cta": "Ask for a quote",
    "login": "Sales sign-in"
  },
  "salesTitle": "AqarArena Sales: your team sells from the same data",
  "salesSub": "The same prices and units as the site, in your sales team's hands. Every update reaches everyone at once.",
  "salesFeatures": [
    { "title": "An account per salesperson", "text": "Each person has their own username and password; you add and disable them from the portal." },
    { "title": "Inventory search", "text": "By budget, bedrooms, floor and view, with only available units shown first." },
    { "title": "Temporary holds", "text": "A unit is held for one salesperson for a set time, and is released by itself if not confirmed." },
    { "title": "PDF offers", "text": "With the payment schedule instalment by instalment and the salesperson's name and numbers, sent by WhatsApp, Telegram or email." },
    { "title": "Clients and follow-ups", "text": "Every client with their offers, holds and follow-up dates, and the team lead sees them all." }
  ],
```

Also change, in both files, `"metaTitle"` and `"metaDescription"` of `forDevelopersPage`:

- ar: `"metaTitle": "AqarArena للمطورين: البوابة وAqarArena Sales"`, `"metaDescription": "اعرض مشروعاتك وأسعارك ووحداتك على AqarArena مجانًا، وادّي فريق مبيعاتك أداة للبحث والحجز وعروض الأسعار من نفس البيانات."`
- en: `"metaTitle": "AqarArena for developers: the portal and AqarArena Sales"`, `"metaDescription": "Show your projects, prices and units on AqarArena for free, and give your sales team a tool to search, hold units and send offers from the same data."`

Write both files back with 2-space JSON and CRLF line endings, as the existing files use.

- [ ] **Step 2: The page**

Move the old page so its history follows it:

Run: `mkdir -p "src/app/[lang]/dev" && git mv "src/app/[lang]/for-developers/page.tsx" "src/app/[lang]/dev/page.tsx"`

Then make these changes in `src/app/[lang]/dev/page.tsx`:

1. In `generateMetadata`, change `pageAlternates(locale, "/for-developers")` to `pageAlternates(locale, "/dev")`.
2. Add `import { ChartLineUp, Buildings, UsersThree } from "@phosphor-icons/react/ssr";` next to the `CheckCircle` import.
3. Right after the hero `</section>`, insert the two-products section:

```tsx
      <Container className="flex flex-col gap-9 pt-20 sm:pt-24">
        <SectionHeading title={t.productsTitle} />
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-7 sm:p-9">
            <span className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Buildings size={22} weight="duotone" aria-hidden="true" />
              </span>
              <span className="font-display text-2xl font-medium">{t.portalCard.title}</span>
              <span className="rounded-full bg-brass-soft px-3 py-0.5 text-xs font-semibold text-brass-dark">{t.portalCard.badge}</span>
            </span>
            <p className="leading-relaxed text-body">{t.portalCard.text}</p>
            <Link
              href="/portal/register"
              className="mt-auto inline-flex min-h-12 items-center self-start rounded-full bg-brass px-6 font-medium text-white no-underline hover:bg-brass-dark hover:text-white"
            >
              {t.portalCard.cta}
            </Link>
          </article>
          <article className="flex flex-col gap-4 rounded-3xl bg-brand p-7 text-white sm:p-9">
            <span className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-white/10 text-brass-light">
                <UsersThree size={22} weight="duotone" aria-hidden="true" />
              </span>
              <span dir="ltr" className="font-display text-2xl font-medium">
                {t.salesCard.title}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold text-brass-light">{t.salesCard.badge}</span>
            </span>
            <p className="leading-relaxed text-on-dark">{t.salesCard.text}</p>
            <div className="mt-auto flex flex-wrap gap-3">
              <Link
                href={`/${locale}/contact`}
                className="inline-flex min-h-12 items-center rounded-full bg-brass-light px-6 font-medium text-deep no-underline hover:bg-[#d8bc86] hover:text-deep"
              >
                {t.salesCard.cta}
              </Link>
              <a href="/sales/login" className="inline-flex min-h-12 items-center rounded-full border border-white/40 px-6 font-medium text-white no-underline hover:border-white hover:text-white">
                {t.salesCard.login}
              </a>
            </div>
          </article>
        </div>
      </Container>
```

4. Before the closing `<Container className="pt-20 pb-24 sm:pt-24">` section, insert the Sales features section:

```tsx
      <Container className="flex flex-col gap-9 pt-20 sm:pt-24">
        <div className="flex max-w-3xl flex-col gap-3">
          <SectionHeading title={t.salesTitle} />
          <p className="text-lg leading-relaxed text-body">{t.salesSub}</p>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {t.salesFeatures.map((f) => (
            <li key={f.title} className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-6">
              <ChartLineUp size={22} weight="duotone" className="text-brass" aria-hidden="true" />
              <span className="font-display text-xl font-medium text-ink">{f.title}</span>
              <p className="text-sm leading-relaxed text-body">{f.text}</p>
            </li>
          ))}
        </ul>
      </Container>
```

5. `ForDevelopersPage` now needs the locale: change its first line to `const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);` and rename the function to `DevPage`.

The `for-developers` folder is now empty; check with `ls "src/app/[lang]/for-developers" 2>&1` (expected: "No such file or directory" or an empty listing) and remove it if it remains: `rmdir "src/app/[lang]/for-developers"`.

- [ ] **Step 3: Permanent redirect**

In `next.config.ts`, inside `nextConfig`, next to `async headers()`, add:

```ts
  async redirects() {
    // The developers' landing page moved; old links and search results keep working.
    return [{ source: "/:lang(ar|en)/for-developers", destination: "/:lang/dev", permanent: true }];
  },
```

- [ ] **Step 4: Links**

- `src/components/site-footer.tsx`: change `href={`/${locale}/for-developers`}` to `href={`/${locale}/dev`}`.
- `src/app/[lang]/contact/page.tsx`: same change.
- `src/app/[lang]/developers/page.tsx`: same change.
- `src/components/site-header.tsx`: in the `links` array, after the `newLaunches` entry, add `{ href: `/${locale}/dev`, label: dict.footer.forDevelopers },`.
- `src/app/sitemap.ts`: change `...entry("/for-developers", 0.5),` to `...entry("/dev", 0.5),`.
- `src/app/robots.ts`: change the `disallow` list to `["/api/", "/admin", "/portal", "/sales"]` and the comment to "The admin, developer portal and AqarArena Sales are private; their pages also say noindex."

Check nothing else points at the old path:

Run: `grep -rn "for-developers" src --include=*.ts --include=*.tsx`
Expected: only `next.config.ts` is not under `src`, so no output.

- [ ] **Step 5: Type-check, lint, commit**

Run: `npx next typegen && npx tsc --noEmit && npm run lint`
Expected: no errors.

```bash
git add -A "src/app/[lang]" next.config.ts src/components/site-header.tsx src/components/site-footer.tsx src/app/sitemap.ts src/app/robots.ts
git commit -m "/dev landing page for developers: the portal and AqarArena Sales"
```

---

### Task 10: Docs, full check and hand-off

**Files:**
- Modify: `README.md`, `docs/ROADMAP.md`

- [ ] **Step 1: README pages table**

Replace the `/ar/for-developers` row with:

```markdown
| `/ar/dev` | Developers' landing page: the portal and AqarArena Sales (`/ar/for-developers` redirects here) |
```

After the `/portal/projects/[id]/units` row, add:

```markdown
| `/portal/team` | Developer portal: the company's sales team (accounts, roles, temporary passwords) |
| `/sales` | AqarArena Sales (Arabic): a developer's salespeople sign in with their own accounts; projects overview and profile so far |
```

- [ ] **Step 2: Roadmap**

Add under "Phase 2: Developer portal and revenue":

```markdown
- [x] `/dev` landing page presenting the portal and AqarArena Sales
- [x] AqarArena Sales, step 1: sales accounts managed from the portal, `/sales` sign-in, projects overview and profile (spec: `docs/superpowers/specs/2026-11-15-aqararena-three-products-design.md`)
- [ ] AqarArena Sales, step 2: inventory search and temporary holds
- [ ] AqarArena Sales, step 3: custom payment schedules, project currency, PDF offers shared by WhatsApp, Telegram and email
- [ ] AqarArena Sales, step 4: comparisons, clients and follow-ups, team page
```

- [ ] **Step 2b: Commit docs**

```bash
git add README.md docs/ROADMAP.md
git commit -m "Docs: /dev and AqarArena Sales accounts"
```

- [ ] **Step 3: Automated checks**

Run: `npm run lint && npm test && npm run build`
Expected: lint clean; all tests pass; the build lists `/[lang]/dev`, `/portal/team`, `/sales`, `/sales/login`, `/sales/me`, `/sales/password` and no errors.

- [ ] **Step 4: Browser checks on `next start` (throwaway database)**

Add a temporary `web-prod` entry to `.claude/launch.json` (`npm run start -- -p 3001`, port 3001), start it, call `show_pane` preview before each browser batch, and check:

1. `/dev` → redirects to `/ar/dev`; `/ar/for-developers` and `/en/for-developers` → 308 to `/ar/dev` and `/en/dev`. Both languages render, no horizontal scroll at 375 px, dark mode readable, header shows «للمطورين».
2. `/sales` and `/sales/me` while signed out → `/sales/login`. `/sales` is not redirected to `/ar/sales`.
3. Portal (use a throwaway developer account as in the memory note): «فريق المبيعات» → add a member; the temporary password is shown once; a duplicate username is refused; a short phone is refused.
4. `/sales/login` with that member → forced to `/sales/password`; after changing it, `/sales` lists only that developer's published projects with available/total unit counts matching the database.
5. `/sales/me`: change the phone, save, reload → kept. A bad email is refused.
6. Portal: «كلمة مرور مؤقتة جديدة» signs the member out (their next `/sales` request goes to sign-in); «إيقاف الحساب» refuses sign-in with the disabled message; «تفعيل الحساب» lets them back.
7. Five wrong passwords on `/sales/login` → the lockout message.
8. A member of developer X cannot see developer Y's projects; a portal account of developer Y cannot edit X's members (post the update form with X's member id → "الحساب ده مش في فريقك").

- [ ] **Step 5: Clean up**

Stop the server, restore `.claude/launch.json` (`git checkout -- .claude/launch.json`), delete any `tmp-*` scripts and the worktree `.env`, and remove the database: `npx prisma dev stop aqararena-p1-test` then `npx prisma dev rm aqararena-p1-test`.

- [ ] **Step 6: Code review**

Run the `code-review` skill on the branch diff against `claude/portal-inventory-and-stats` and fix what it confirms.

- [ ] **Step 7: Hand-off**

Report what was built and checked. Pushing and opening the PR (base: `claude/portal-inventory-and-stats`) happens when the user asks.
