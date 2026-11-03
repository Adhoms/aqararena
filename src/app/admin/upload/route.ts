import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdmin } from "@/lib/admin/auth";
import { MAX_UPLOAD_BYTES, UPLOAD_FOLDERS, UPLOAD_TYPES } from "@/lib/admin/upload-config";

// Hands the admin's browser a short-lived token to upload one file straight to Vercel Blob,
// so large photos and PDFs never pass through this server. Lives under /admin so the session
// cookie (path=/admin) is sent with the request.

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "رفع الملفات غير مفعّل على هذا السيرفر. الصق رابط الملف بدلًا من ذلك." }, { status: 503 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await isAdmin())) throw new Error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
        const folder = pathname.split("/")[0];
        if (!(UPLOAD_FOLDERS as readonly string[]).includes(folder) || pathname.includes("..")) {
          throw new Error("مسار غير مسموح");
        }
        return {
          allowedContentTypes: UPLOAD_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          // Files never change once uploaded (each gets a unique name), so browsers can keep them.
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        };
      },
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "تعذّر بدء الرفع" }, { status: 400 });
  }
}
