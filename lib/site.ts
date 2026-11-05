// Menu items point at category slugs. The slugs are placeholders until the
// real WordPress export is imported; then they are matched to the old site.
export const NAV: { label: string; href: string; external?: boolean }[] = [
  { label: "خانه", href: "/" },
  { label: "اخبار", href: "/category/news/" },
  { label: "تیم", href: "/team/" },
  { label: "ویدیو", href: "/category/video/" },
  { label: "نقد و بررسی", href: "/category/review/" },
  { label: "تیم پایه", href: "/category/youth/" },
  { label: "مقاله", href: "/category/article/" },
  { label: "جام حذفی", href: "/category/hazfi-cup/" },
  { label: "نشست خبری", href: "/category/press-conference/" },
  { label: "مرکز لیگ", href: "/league/" },
];

// TODO: set the real ticket sales URL.
export const TICKETS_URL = process.env.NEXT_PUBLIC_TICKETS_URL ?? "#";

export const SOCIAL = {
  instagram: "https://instagram.com/",
  telegram: "https://t.me/",
};

export const HOME_TEAM = "نساجی مازندران";

// Categories that get their own look on the home page.
export const VIDEO_CATEGORY = "video";
export const OPINION_CATEGORIES = ["review", "article"];
export const PRESS_CATEGORY = "press-conference";
export const YOUTH_CATEGORY = "youth";
