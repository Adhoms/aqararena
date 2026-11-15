import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { deriveKey, readSessionToken, signToken } from "@/lib/session-token";
import { PORTAL_COOKIE } from "./cookie";

// A signed cookie holding the account id, an expiry and the account's session version.
// Every request re-reads the account, so disabling it or changing its password signs it out.

const SESSION_DAYS = 14;

function secret(): string | undefined {
  const base = process.env.PORTAL_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  // Derived with scrypt so a developer holding a signed cookie can't cheaply guess the setting it came
  // from (it may be the admin password); the salt keeps it apart from the admin and sales keys.
  return base ? deriveKey(base, "aqararena:portal-session") : undefined;
}

export async function startPortalSession(account: { id: string; sessionVersion: number }) {
  const key = secret();
  if (!key) throw new Error("Set PORTAL_SESSION_SECRET (or ADMIN_PASSWORD) to use the developer portal.");
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  (await cookies()).set(PORTAL_COOKIE, signToken([account.id, String(expires), String(account.sessionVersion)], key), {
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
  const session = readSessionToken(token, key);
  if (!session) return null;
  const { id, version } = session;

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
  if (!account || account.status !== "ACTIVE" || !account.developer || account.sessionVersion !== version) return null;
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
