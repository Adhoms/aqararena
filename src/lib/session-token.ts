import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

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

const derived = new Map<string, string>();

/**
 * A signing key derived from a setting with scrypt, so someone holding a signed cookie can't cheaply
 * guess the setting it came from (it may be the admin password). Each area passes its own salt, which
 * keeps their keys apart even when they share a setting. Computed once per process.
 */
export function deriveKey(base: string, salt: string): string {
  const id = `${salt}\n${base}`;
  let key = derived.get(id);
  if (!key) {
    key = scryptSync(base, salt, 32, { N: 16384, r: 8, p: 1 }).toString("base64url");
    derived.set(id, key);
  }
  return key;
}

/** An "id.expires.version" session token: the account id and session version while it is signed and unexpired. */
export function readSessionToken(token: string, key: string, now = Date.now()): { id: string; version: number } | null {
  const parts = readToken(token, key, 3);
  if (!parts) return null;
  const [id, expires, version] = parts;
  if (!id || !/^\d{1,16}$/.test(expires) || !/^\d{1,10}$/.test(version)) return null;
  if (Number(expires) < now) return null;
  return { id, version: Number(version) };
}
