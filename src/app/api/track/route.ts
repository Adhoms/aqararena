import type { NextRequest } from "next/server";
import { BOT_PATTERN, isRecordedEvent } from "@/lib/stats-events";

// Visitor actions on a project, sent by the browser once per session:
//   POST /api/track  {"slug": "project-a", "event": "VIEW"}
// Always answers 204, so a page never waits on it or shows an error.

const done = () => new Response(null, { status: 204 });

export async function POST(request: NextRequest) {
  if (!process.env.DATABASE_URL) return done();
  if (BOT_PATTERN.test(request.headers.get("user-agent") ?? "")) return done();
  // Small JSON only; anything else is ignored.
  const text = await request.text().catch(() => "");
  if (!text || text.length > 300) return done();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return done();
  }
  const { slug, event } = (body ?? {}) as { slug?: unknown; event?: unknown };
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(slug) || !isRecordedEvent(event)) return done();
  try {
    const { countEvent } = await import("@/lib/stats");
    await countEvent(slug, event);
  } catch (error) {
    console.error("track", error);
  }
  return done();
}
