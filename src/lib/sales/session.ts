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
  const until = Number(expires);
  if (!Number.isFinite(until) || until < Date.now()) return null;
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
