// Menu items point at category slugs. The slugs are placeholders until the
// real WordPress export is imported; then they are matched to the old site.
export const NAV: { label: string; href: string; external?: boolean }[] = [
  { label: "خانه", href: "/" },
  { label: "اخبار", href: "/category/news/" },
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
