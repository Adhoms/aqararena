import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { PORTAL_COOKIE } from "./cookie";

// A signed cookie holding the account id, an expiry and the account's session version.
// Every request re-reads the account, so disabling it or changing its password signs it out.

const SESSION_DAYS = 14;

function secret(): string | undefined {
  const base = process.env.PORTAL_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  // A separate key from the admin cookie, even when both come from the same setting.
  return base ? `portal:${base}` : undefined;
}

const sign = (value: string, key: string) => createHmac("sha256", key).update(value).digest("base64url");

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function startPortalSession(account: { id: string; sessionVersion: number }) {
  const key = secret();
  if (!key) throw new Error("Set PORTAL_SESSION_SECRET (or ADMIN_PASSWORD) to use the developer portal.");
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const value = `${account.id}.${expires}.${account.sessionVersion}`;
  (await cookies()).set(PORTAL_COOKIE, `${value}.${sign(value, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/portal",
    expires: new Date(expires),
  });
}

export async function endPortalSession() {
  (await cookies()).delete({ name: PORTAL_COOKIE, path: "/portal" });
}

export type PortalAccount = {
  id: string;
  username: string;
  developerId: string;
  mustChangePassword: boolean;
  developer: { id: string; nameAr: string; nameEn: string; slug: string };
};

/** The signed-in, active account with its developer, or null. */
export async function currentAccount(): Promise<PortalAccount | null> {
  await connection();
  const key = secret();
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (!key || !token) return null;
  const [id, expires, version, signature] = token.split(".");
  if (!id || !expires || !version || !signature) return null;
  if (!safeEqual(signature, sign(`${id}.${expires}.${version}`, key)) || Number(expires) < Date.now()) return null;

  const account = await db.developerAccount.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      status: true,
      developerId: true,
      sessionVersion: true,
      mustChangePassword: true,
      developer: { select: { id: true, nameAr: true, nameEn: true, slug: true } },
    },
  });
  if (!account || account.status !== "ACTIVE" || !account.developer || account.sessionVersion !== Number(version)) return null;
  return { ...account, developerId: account.developer.id, developer: account.developer };
}

/**
 * Call at the top of every portal page and action. Sends visitors to sign in, and accounts with a
 * temporary password to the change-password page first.
 */
export async function requireAccount({ allowTemporaryPassword = false } = {}): Promise<PortalAccount> {
  const account = await currentAccount();
  if (!account) redirect("/portal/login");
  if (account.mustChangePassword && !allowTemporaryPassword) redirect("/portal/password");
  return account;
}
