import "server-only";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { BLOB_HOST_SUFFIX } from "./upload-config";

/**
 * Removes files from Vercel Blob once nothing points to them any more: no photo, master plan,
 * logo, or open developer submission. Links to other sites are left alone, and a failure here
 * never undoes anything in the database.
 */
export async function deleteIfUnused(urls: (string | null | undefined)[]) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  for (const url of new Set(urls)) {
    if (!url) continue;
    try {
      if (!new URL(url).hostname.endsWith(BLOB_HOST_SUFFIX)) continue;
      const [media, projects, developers, drafts] = await Promise.all([
        db.media.count({ where: { url } }),
        db.project.count({ where: { masterPlanUrl: url } }),
        db.developer.count({ where: { OR: [{ logoUrl: url }, { coverUrl: url }] } }),
        db.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "Submission" WHERE status IN ('DRAFT', 'PENDING') AND data::text LIKE ${"%" + url + "%"}`,
      ]);
      if (media + projects + developers + Number(drafts[0]?.n ?? 0) > 0) continue;
      await del(url);
    } catch (e) {
      console.error("Could not delete stored file", url, e);
    }
  }
}
