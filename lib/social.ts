// Social networks the admin can link to (Settings). Shown as icons in the header,
// the footer and the contact page; a network without a link is not shown.
export const SOCIAL_NETWORKS = [
  { key: "instagram", label: "اینستاگرام", placeholder: "https://instagram.com/..." },
  { key: "telegram", label: "تلگرام", placeholder: "https://t.me/..." },
] as const;

export type SocialKey = (typeof SOCIAL_NETWORKS)[number]["key"];
export type SocialLinks = Partial<Record<SocialKey, string>>;

/** Networks that have a link, in display order. */
export const socialList = (links: SocialLinks = {}) =>
  SOCIAL_NETWORKS.filter((n) => links[n.key]?.trim()).map((n) => ({ ...n, url: links[n.key]!.trim() }));
