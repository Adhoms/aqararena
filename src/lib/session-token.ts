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
