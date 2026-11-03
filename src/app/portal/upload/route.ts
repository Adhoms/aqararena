import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { currentAccount } from "@/lib/portal/session";
import { MAX_UPLOAD_BYTES, UPLOAD_TYPES } from "@/lib/admin/upload-config";

// Same as /admin/upload, for signed-in developers. Each developer can only write under
// portal/<their developer id>/, and nothing they upload is shown on the site until approved.

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "رفع الملفات غير مفعّل حاليًا." }, { status: 503 });
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
        const account = await currentAccount();
        if (!account || account.mustChangePassword) throw new Error("انتهت الجلسة. سجّل الدخول مرة أخرى.");
        if (!pathname.startsWith(`portal/${account.developerId}/`) || pathname.includes("..")) throw new Error("مسار غير مسموح");
        return { allowedContentTypes: UPLOAD_TYPES, maximumSizeInBytes: MAX_UPLOAD_BYTES, addRandomSuffix: true, cacheControlMaxAge: 60 * 60 * 24 * 365 };
      },
    });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "تعذّر بدء الرفع" }, { status: 400 });
  }
}
