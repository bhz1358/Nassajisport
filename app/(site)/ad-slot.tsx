import { countImpression, isVideoFile, pickAd, type AdSlotId } from "@/lib/ads";
import { AdMedia } from "./ad-media";

/** Renders one running ad for the slot, or nothing when the slot is empty. */
export function AdSlot({
  slot,
  className = "",
}: {
  slot: AdSlotId;
  className?: string;
}) {
  const ad = pickAd(slot);
  if (!ad) return null;
  countImpression(ad.id);
  const video = isVideoFile(ad.image) || isVideoFile(ad.mobileImage);
  return (
    <aside
      className={`pbox pbox-${slot} ${video ? "pbox-video" : ""} ${ad.mobileImage ? "pbox-mobile" : ""} ${className}`}
      aria-label="تبلیغات"
    >
      <a href={`/go/ad/${ad.id}/`} target="_blank" rel="sponsored noopener">
        {video ? (
          <AdMedia
            image={ad.image}
            mobileImage={ad.mobileImage}
            title={ad.title}
            eager={slot === 1}
          />
        ) : (
          <picture>
            {ad.mobileImage && (
              <source media="(max-width: 720px)" srcSet={ad.mobileImage} />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ad.image}
              alt={ad.title}
              loading={slot === 1 ? "eager" : "lazy"}
              decoding="async"
            />
          </picture>
        )}
      </a>
      <span className="pbox-tag">تبلیغات</span>
    </aside>
  );
}
