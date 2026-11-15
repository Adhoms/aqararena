import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

// Slows down password guessing: after too many wrong passwords for the same key (an IP
// address, or a username) within WINDOW_MINUTES, sign-in is refused until the window ends.
// Kept in the database so it holds across server instances.

const MAX_FAILURES = 5;
// Portal and sales sign-in addresses are often a whole office behind one IP, and their counters
// aren't cleared by a good sign-in, so a few typos across a team mustn't lock everyone out.
const SHARED_ADDRESS_FAILURES = 20;
const WINDOW_MINUTES = 15;

const limitFor = (key: string) => (key.startsWith("portal-ip:") || key.startsWith("sales-ip:") ? SHARED_ADDRESS_FAILURES : MAX_FAILURES);

/** The visitor's IP address as Vercel reports it. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** Minutes left before the key may try again, or 0 when it may try now. */
export async function lockedMinutes(keys: string[]): Promise<number> {
  const found = await db.authThrottle.findMany({ where: { key: { in: keys }, failures: { gte: MAX_FAILURES }, resetAt: { gt: new Date() } } });
  const rows = found.filter((r) => r.failures >= limitFor(r.key));
  if (!rows.length) return 0;
  const until = Math.max(...rows.map((r) => r.resetAt.getTime()));
  return Math.max(1, Math.ceil((until - Date.now()) / 60_000));
}

/** Counts one wrong password for each key. */
export async function recordFailure(keys: string[]) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + WINDOW_MINUTES * 60_000);
  for (const key of keys) {
    const row = await db.authThrottle.findUnique({ where: { key } });
    if (!row || row.resetAt <= now) {
      await db.authThrottle.upsert({ where: { key }, create: { key, failures: 1, resetAt }, update: { failures: 1, resetAt } });
    } else {
      await db.authThrottle.update({ where: { key }, data: { failures: { increment: 1 } } });
    }
  }
}

/** Forgets the failures after a successful sign-in. */
export async function clearFailures(keys: string[]) {
  await db.authThrottle.deleteMany({ where: { key: { in: keys } } });
}

export const lockedMessage = (minutes: number) => `محاولات كتير غلط. جرّب تاني بعد ${minutes} دقيقة.`;
