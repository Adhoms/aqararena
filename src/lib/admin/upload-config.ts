// What the admin can upload to Vercel Blob. Shared by the upload route (which enforces it)
// and the upload buttons (which check before sending, to fail fast with a clear message).

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml"];
export const DOCUMENT_TYPES = ["application/pdf"];
export const VIDEO_TYPES = ["video/mp4", "video/webm"];
export const UPLOAD_TYPES = [...IMAGE_TYPES, ...DOCUMENT_TYPES, ...VIDEO_TYPES];

/** 100 MB: enough for a long brochure PDF or a short video. Photos are shrunk before upload. */
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

/** Top-level folders in the store. Uploads outside them are refused. */
export const UPLOAD_FOLDERS = ["projects", "developers"] as const;

/** Vercel Blob public URLs end in this host; only these files are deleted from the store. */
export const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";
