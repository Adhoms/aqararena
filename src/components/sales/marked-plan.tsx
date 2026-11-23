/** A zone's box on the master plan, in percent of the image, measured from its top-left corner. */
export type ZoneBox = { x: number; y: number; w: number; h: number; label: string };

/**
 * The master-plan image with one zone marked. The box is placed over the image itself (not a padded
 * frame), so the admin's percentages land where they were measured. Used by the Sales unit page and
 * the client's offer.
 */
export function MarkedPlan({
  image,
  zone,
  alt,
  className = "relative",
  imgClassName = "block h-auto w-full",
}: {
  image: string;
  zone: ZoneBox | null;
  alt: string;
  /** The frame; it must hug the image (e.g. "relative mx-auto w-fit" with a height-capped image). */
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={className} dir="ltr">
      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded plan of unknown size */}
      <img src={image} alt={alt} decoding="async" className={imgClassName} />
      {zone && (
        <span
          className="absolute rounded-md border-[3px] border-brass-light bg-brass-light/25 shadow-[0_0_0_3px_rgb(255_255_255/0.7)]"
          style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%` }}
        >
          <span className="sr-only">{zone.label}</span>
        </span>
      )}
    </div>
  );
}
