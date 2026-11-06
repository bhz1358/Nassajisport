import { countImpression, pickAd, type AdSlotId } from "@/lib/ads";

/** Renders one running ad for the slot, or nothing when the slot is empty. */
export function AdSlot({ slot, className = "" }: { slot: AdSlotId; className?: string }) {
  const ad = pickAd(slot);
  if (!ad) return null;
  countImpression(ad.id);
  return (
    <aside className={`ad ad-slot-${slot} ${className}`} aria-label="تبلیغات">
      <a href={`/go/ad/${ad.id}/`} target="_blank" rel="sponsored noopener">
        <picture>
          {ad.mobileImage && <source media="(max-width: 720px)" srcSet={ad.mobileImage} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ad.image} alt={ad.title} loading={slot === 1 ? "eager" : "lazy"} decoding="async" />
        </picture>
      </a>
      <span className="ad-label">تبلیغات</span>
    </aside>
  );
}
