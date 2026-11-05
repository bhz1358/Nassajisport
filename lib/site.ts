// Menu items point at category slugs. The slugs are placeholders until the
// real WordPress export is imported; then they are matched to the old site.
export const NAV: { label: string; href: string }[] = [
  { label: "خانه", href: "/" },
  { label: "اخبار", href: "/category/news/" },
  { label: "تیم", href: "/team/" },
  { label: "جدول و نتایج", href: "/league/" },
  { label: "چندرسانه‌ای", href: "/category/video/" },
  { label: "تحلیل", href: "/category/review/" },
  { label: "نشست خبری", href: "/category/press-conference/" },
];

/** Footer: every section, including the ones that don't fit in the header. */
export const FOOTER_NAV: { label: string; href: string }[] = [
  ...NAV.slice(1),
  { label: "تیم پایه", href: "/category/youth/" },
  { label: "مقاله", href: "/category/article/" },
  { label: "جام حذفی", href: "/category/hazfi-cup/" },
  { label: "جست‌وجو", href: "/search/" },
];

export const HOME_TEAM = "نساجی مازندران";

// Categories that get their own look on the home page.
export const VIDEO_CATEGORY = "video";
export const OPINION_CATEGORIES = ["review", "article"];
export const PRESS_CATEGORY = "press-conference";
export const YOUTH_CATEGORY = "youth";
