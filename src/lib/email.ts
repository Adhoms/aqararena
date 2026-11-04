import "server-only";
import { SITE_URL } from "@/lib/site";

// Sends email through Resend's HTTP API (no package needed). Until RESEND_API_KEY is set the
// site works the same and simply skips the emails; nothing ever waits on or fails because of email.
//
//   RESEND_API_KEY  the API key from resend.com
//   EMAIL_FROM      sender, e.g. "AqarArena <noreply@aqararena.com>" (the domain must be verified in Resend)
//   ADMIN_EMAIL     where admin notifications go (new messages, account requests, submissions)

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@aqararena.com";

type Mail = { to: string | string[]; subject: string; text: string; replyTo?: string };

export async function sendEmail({ to, subject, text, replyTo }: Mail): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!key || recipients.length === 0) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "AqarArena <noreply@aqararena.com>",
        to: recipients,
        subject,
        text,
        html: toHtml(text),
        ...(replyTo && { reply_to: replyTo }),
      }),
    });
    if (!res.ok) console.error("[email] Resend refused", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[email] could not send", e);
    return false;
  }
}

/** Emails the site owner; does nothing without ADMIN_EMAIL. */
export function notifyAdmin(subject: string, lines: string[], replyTo?: string) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return Promise.resolve(false);
  return sendEmail({ to, subject, text: [...lines, "", `${SITE_URL}/admin`].join("\n"), replyTo });
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A plain, right-to-left HTML version of a text email. */
function toHtml(text: string) {
  const body = escape(text)
    .split("\n")
    .map((line) => (line.trim() ? `<p style="margin:0 0 10px">${line.replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>')}</p>` : ""))
    .join("");
  return `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.7;color:#16302a;max-width:560px">${body}<p style="margin-top:24px;color:#8a958f;font-size:12px">AqarArena · aqararena.com</p></div>`;
}
