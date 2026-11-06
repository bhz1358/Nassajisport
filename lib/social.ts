// Social networks the admin can link to (Settings). Shown as icons in the header,
// the footer and the contact page; a network without a link is not shown.
export const SOCIAL_NETWORKS = [
  { key: "instagram", label: "اینستاگرام", placeholder: "https://instagram.com/..." },
  { key: "telegram", label: "تلگرام", placeholder: "https://t.me/..." },
  { key: "whatsapp", label: "واتس‌اپ", placeholder: "https://wa.me/98..." },
  { key: "youtube", label: "یوتیوب", placeholder: "https://youtube.com/@..." },
  { key: "aparat", label: "آپارات", placeholder: "https://aparat.com/..." },
  { key: "x", label: "ایکس (توییتر)", placeholder: "https://x.com/..." },
  { key: "rubika", label: "روبیکا", placeholder: "https://rubika.ir/..." },
  { key: "eitaa", label: "ایتا", placeholder: "https://eitaa.com/..." },
  { key: "bale", label: "بله", placeholder: "https://ble.ir/..." },
] as const;

export type SocialKey = (typeof SOCIAL_NETWORKS)[number]["key"];
export type SocialLinks = Partial<Record<SocialKey, string>>;

/** Networks that have a link, in display order. */
export const socialList = (links: SocialLinks = {}) =>
  SOCIAL_NETWORKS.filter((n) => links[n.key]?.trim()).map((n) => ({ ...n, url: links[n.key]!.trim() }));
