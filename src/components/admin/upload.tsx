"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { addMediaBatch } from "@/app/admin/actions";
import { IMAGE_TYPES, MAX_UPLOAD_BYTES, UPLOAD_TYPES } from "@/lib/admin/upload-config";

// Uploads go straight from the browser to Vercel Blob (see app/admin/upload/route.ts).
// Photos are resized and converted to WebP first: a 6 MB phone photo becomes ~300 KB,
// which keeps the public pages fast.

type Uploaded = { url: string; width?: number; height?: number; contentType: string };

const SHRINKABLE = ["image/jpeg", "image/png", "image/webp"];

/** Longest side, in pixels, after resizing. Master plans keep more detail. */
const MAX_SIDE = { photo: 2400, plan: 4000 } as const;

async function shrinkImage(file: File, maxSide: number): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  // Keep the original when it is already small and converting would not help.
  if (!blob || (scale === 1 && blob.size >= file.size)) return { blob: file, width, height };
  return { blob, width, height };
}

/** A safe file name: latin letters, digits and dashes (Arabic names become "file"). */
function safeName(name: string, type: string) {
  const base =
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file";
  const ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/avif": "avif", "image/gif": "gif", "image/svg+xml": "svg", "application/pdf": "pdf", "video/mp4": "mp4", "video/webm": "webm" }[type] ?? "bin";
  return `${base}.${ext}`;
}

export function checkFile(file: File): string | null {
  if (/\.(heic|heif)$/i.test(file.name) || file.type === "image/heic") return `${file.name}: صيغة HEIC غير مدعومة في المتصفحات. حوّلها لـ JPG أولًا.`;
  if (!UPLOAD_TYPES.includes(file.type)) return `${file.name}: نوع الملف غير مدعوم (صور، PDF، أو فيديو MP4).`;
  if (file.size > MAX_UPLOAD_BYTES) return `${file.name}: الملف أكبر من ${MAX_UPLOAD_BYTES / 1024 / 1024} ميجا.`;
  return null;
}

export async function uploadFile(
  file: File,
  folder: string,
  opts: { plan?: boolean; onProgress?: (pct: number) => void; handleUploadUrl?: string } = {},
): Promise<Uploaded> {
  const problem = checkFile(file);
  if (problem) throw new Error(problem);

  let body: Blob = file;
  let width: number | undefined;
  let height: number | undefined;
  if (SHRINKABLE.includes(file.type)) {
    try {
      ({ blob: body, width, height } = await shrinkImage(file, opts.plan ? MAX_SIDE.plan : MAX_SIDE.photo));
    } catch {
      // The browser could not decode it; upload the original as is.
    }
  }
  const contentType = body.type || file.type;
  try {
    const result = await upload(`${folder}/${safeName(file.name, contentType)}`, body, {
      access: "public",
      handleUploadUrl: opts.handleUploadUrl ?? "/admin/upload",
      contentType,
      multipart: body.size > 8 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => opts.onProgress?.(percentage),
    });
    return { url: result.url, width, height, contentType };
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/client token|503|غير مفعّل/i.test(message)) throw new Error("رفع الملفات غير مفعّل على هذا السيرفر. الصق رابط الملف بدلًا من ذلك.");
    throw new Error(message || "تعذّر رفع الملف");
  }
}

const isImageUrl = (url: string) => /\.(webp|jpe?g|png|avif|gif|svg)(\?|$)/i.test(url);

/**
 * A URL text box with an "upload from device" button next to it. Uploading fills the box;
 * the surrounding form's Save button stores it. Pasting a link still works.
 */
export function UploadField({
  name,
  label,
  defaultValue,
  folder,
  accept = "image/*",
  plan = false,
  hint,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  folder: string;
  accept?: string;
  plan?: boolean;
  hint?: string;
  required?: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setProgress(0);
    try {
      const { url } = await uploadFile(file, folder, { plan, onProgress: setProgress });
      setValue(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر رفع الملف");
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label htmlFor={id} className="font-medium text-ink">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        {value && isImageUrl(value) && (
          // eslint-disable-next-line @next/next/no-img-element -- small admin preview of any URL
          <img src={value} alt="" className="size-10 shrink-0 rounded-lg border border-line object-cover" />
        )}
        <input
          id={id}
          name={name}
          type="url"
          dir="ltr"
          value={value}
          required={required}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://…"
          className="admin-input min-w-0 flex-1"
        />
        <button type="button" className="admin-btn-ghost shrink-0" disabled={progress !== null} onClick={() => fileRef.current?.click()}>
          {progress === null ? "رفع من الجهاز" : `${Math.round(progress)}%`}
        </button>
        <input ref={fileRef} type="file" accept={accept} hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      {hint && <span className="text-xs text-muted">{hint}</span>}
      {error && <span className="text-xs text-red-700 dark:text-red-300">{error}</span>}
      <span data-error-for={name} className="text-xs text-red-700 empty:hidden dark:text-red-300" />
    </div>
  );
}

type Row = { name: string; pct: number; error?: string; done?: boolean };

/**
 * Pick many files at once (photos of one tab, floor plans, brochures…). Each is uploaded, then
 * all of them are saved as media rows in one go and the page refreshes.
 */
export function BulkMediaUpload({
  projectId,
  folder,
  kinds,
  groups,
}: {
  projectId: string;
  folder: string;
  kinds: { value: string; label: string }[];
  groups: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState("IMAGE");
  const [group, setGroup] = useState(groups[0]?.value ?? "");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setBusy(true);
    setMessage("");
    setRows(files.map((f) => ({ name: f.name, pct: 0, error: checkFile(f) ?? undefined })));
    const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

    const done: { url: string; width?: number; height?: number }[] = [];
    // Three at a time: fast, without saturating a phone connection.
    let next = 0;
    async function worker() {
      while (next < files.length) {
        const i = next++;
        if (checkFile(files[i])) continue;
        try {
          const up = await uploadFile(files[i], folder, { plan: kind === "MASTER_PLAN", onProgress: (pct) => update(i, { pct }) });
          done[i] = up;
          update(i, { pct: 100, done: true });
        } catch (e) {
          update(i, { error: e instanceof Error ? e.message : "تعذّر الرفع" });
        }
      }
    }
    await Promise.all([worker(), worker(), worker()]);

    const items = done.filter(Boolean);
    if (items.length) {
      const res = await addMediaBatch({ projectId, kind, group: kind === "IMAGE" ? group : null, items });
      setMessage(res.message ?? "");
      if (res.ok) router.refresh();
    } else {
      setMessage("لم يُرفع أي ملف.");
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const accept =
    kind === "IMAGE"
      ? IMAGE_TYPES.join(",")
      : kind === "BROCHURE"
        ? "application/pdf"
        : kind === "VIDEO"
          ? "video/mp4,video/webm"
          : `${IMAGE_TYPES.join(",")},application/pdf`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-brand/50 bg-brand/5 p-4">
      <p className="font-medium">رفع عدة ملفات مرة واحدة</p>
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1.5">
          <span className="font-medium">النوع</span>
          <select className="admin-input" value={kind} onChange={(e) => setKind(e.target.value)} disabled={busy}>
            {kinds.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        {kind === "IMAGE" && (
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">التبويب</span>
            <select className="admin-input" value={group} onChange={(e) => setGroup(e.target.value)} disabled={busy}>
              {groups.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="admin-btn" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "جارٍ الرفع…" : "اختر الملفات"}
        </button>
        <input ref={fileRef} type="file" multiple accept={accept} hidden onChange={(e) => onFiles(e.target.files)} />
      </div>
      <p className="text-xs text-muted">الصور تُصغَّر وتتحول لـ WebP تلقائيًا قبل الرفع. يمكنك اختيار عشرات الصور مرة واحدة.</p>
      {rows.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate" dir="ltr">
                {r.name}
              </span>
              {r.error ? (
                <span className="text-red-700 dark:text-red-300">{r.error}</span>
              ) : r.done ? (
                <span className="text-brand">✓</span>
              ) : (
                <span className="text-muted">{Math.round(r.pct)}%</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {message && (
        <p role="status" className="text-sm text-brand">
          {message}
        </p>
      )}
    </div>
  );
}
