import "server-only";
import { SITE_URL } from "@/lib/site";

// Sends email through Resend's HTTP API (no package needed). Until RESEND_API_KEY is set the
// site works the same and simply skips the emails; nothing ever waits on or fails because of email.
//
//   RESEND_API_KEY  the API key from resend.com
//   EMAIL_FROM      sender, e.g. "AqarArena <noreply@aqararena.com>" (the domain must be verified in Resend)
//   ADMIN_EMAIL     where admin notifications go (new messages, account requests, submissions)

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@aqararena.com";

export type Mail = {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
  headers?: Record<string, string>;
  /** Files Resend fetches from a public URL (`path`) and attaches. */
  attachments?: { filename: string; path: string }[];
  /**
   * Only this address becomes a link in the HTML version. For emails that carry text someone else typed
   * (a client's name), so an address written in it stays plain text.
   */
  linkOnly?: string;
};

const FROM = () => process.env.EMAIL_FROM || "AqarArena <noreply@aqararena.com>";

/** Whether emails can be sent at all (RESEND_API_KEY is set). */
export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY);

/** The JSON Resend expects for one email. */
function payload({ to, subject, text, replyTo, headers, attachments, linkOnly }: Mail) {
  return {
    from: FROM(),
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html: toHtml(text, linkOnly),
    ...(replyTo && { reply_to: replyTo }),
    ...(headers && { headers }),
    ...(attachments?.length && { attachments }),
  };
}

export async function sendEmail(mail: Mail): Promise<boolean> {
  const { to } = mail;
  const key = process.env.RESEND_API_KEY;
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!key || recipients.length === 0) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload(mail), to: recipients }),
    });
    if (!res.ok) console.error("[email] Resend refused", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[email] could not send", e);
    return false;
  }
}

/** Sends many separate emails, 100 per request (Resend's batch limit). Returns how many were accepted. */
export async function sendEmails(mails: Mail[]): Promise<number> {
  const key = process.env.RESEND_API_KEY;
  if (!key || mails.length === 0) return 0;
  let sent = 0;
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100);
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk.map(payload)),
      });
      if (res.ok) sent += chunk.length;
      else console.error("[email] Resend refused a batch", res.status, await res.text());
    } catch (e) {
      console.error("[email] could not send a batch", e);
    }
  }
  return sent;
}

/** Emails the site owner; does nothing without ADMIN_EMAIL. */
export function notifyAdmin(subject: string, lines: string[], replyTo?: string) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return Promise.resolve(false);
  return sendEmail({ to, subject, text: [...lines, "", `${SITE_URL}/admin`].join("\n"), replyTo });
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Arabic letters (the Arabic block). The old class, [0600-06FF], matched the characters 0, 6, - and F. */
const ARABIC = new RegExp(`[${String.fromCharCode(0x0600)}-${String.fromCharCode(0x06ff)}]`);

/** A plain HTML version of a text email, right-to-left when it is in Arabic. */
function toHtml(text: string, linkOnly?: string) {
  const dir = ARABIC.test(text) ? "rtl" : "ltr";
  const link = (line: string) => {
    if (linkOnly === undefined) return line.replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>');
    const url = escape(linkOnly);
    return line.split(url).join(`<a href="${url}">${url}</a>`);
  };
  const body = escape(text)
    .split("\n")
    .map((line) => (line.trim() ? `<p style="margin:0 0 10px">${link(line)}</p>` : ""))
    .join("");
  return `<div dir="${dir}" style="font-family:Tahoma,Arial,sans-serif;font-size:15px;line-height:1.7;color:#16302a;max-width:560px">${body}<p style="margin-top:24px;color:#8a958f;font-size:12px">AqarArena · aqararena.com</p></div>`;
}
