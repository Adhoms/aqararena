import "server-only";
import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";

// Developer passwords are stored as scrypt hashes: "scrypt$<salt>$<hash>" (base64url).

const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { N: 16384, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await derive(password, Buffer.from(salt, "base64url"));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/**
 * A well-formed hash that no password matches (random salt and random hash bytes). Checking a password
 * against it costs the same scrypt work as a real one, so unknown usernames answer as slowly as wrong passwords.
 */
export const UNMATCHABLE_HASH = `scrypt$${randomBytes(16).toString("base64url")}$${randomBytes(KEY_LENGTH).toString("base64url")}`;

/** A password the admin can read out or paste: 12 characters without look-alikes (0/O, 1/l). */
export function generatePassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 12 }, () => chars[randomInt(chars.length)]).join("");
}

export const MIN_PASSWORD = 10;

/** Usernames: latin letters, digits, dot, dash and underscore. Stored lower-case. */
export function normalizeUsername(input: string): string | null {
  const u = input.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(u) ? u : null;
}
