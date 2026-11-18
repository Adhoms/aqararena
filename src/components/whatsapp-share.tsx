import { WhatsappLogo } from "@phosphor-icons/react/ssr";

/**
 * Opens WhatsApp with a ready message: a few lines that read on their own, then the link.
 * The visitor picks who to send it to; nothing is sent from the site.
 */
export function WhatsAppShare({
  text,
  url,
  label,
  className = "",
  track,
}: {
  text: string;
  url: string;
  label: string;
  className?: string;
  /** A `data-track` value, to count the share in a project's statistics. */
  track?: string;
}) {
  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
      target="_blank"
      rel="noopener noreferrer"
      data-track={track}
      className={`inline-flex items-center gap-2 no-underline ${className}`}
    >
      <WhatsappLogo size={20} weight="fill" aria-hidden="true" />
      {label}
    </a>
  );
}
