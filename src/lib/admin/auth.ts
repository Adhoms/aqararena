import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SESSION_COOKIE } from "./cookie";

// One admin, one password (ADMIN_PASSWORD). Signing in sets an httpOnly cookie holding an
// expiry time and an HMAC of it. Changing ADMIN_PASSWORD (or ADMIN_SESSION_SECRET) signs
// everyone out.

const SESSION_DAYS = 7;

function secret(): string | undefined {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || undefined;
}

const sign = (value: string, key: string) => createHmac("sha256", key).update(value).digest("base64url");

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** True when the admin area can be used at all (a password is configured). */
export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Compare HMACs so the comparison takes the same time whatever the input length.
  return safeEqual(sign(input, "pw"), sign(expected, "pw"));
}

export async function startSession() {
  const key = secret();
  if (!key) throw new Error("ADMIN_PASSWORD is not set.");
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const token = `${expires}.${sign(String(expires), key)}`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    expires: new Date(expires),
  });
}

export async function endSession() {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/admin" });
}

export async function isAdmin(): Promise<boolean> {
  // Checking the expiry reads the clock, so this must always run per request.
  await connection();
  const key = secret();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!key || !token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !safeEqual(signature, sign(expires, key))) return false;
  return Number(expires) > Date.now();
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
