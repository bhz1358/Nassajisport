// Access levels for panel users. Each panel section needs a permission; a role is
// the set of sections it may open. Users saved before roles existed are admins.

export type Section =
  | "posts" // write and edit news (writers: only their own, as drafts)
  | "publish" // publish, feature, delete any post, edit others' posts
  | "categories"
  | "media"
  | "league"
  | "squad"
  | "ads"
  | "menus"
  | "appearance"
  | "settings"
  | "users"
  | "import";

export type Role = "admin" | "editor" | "writer" | "stats";

export const ROLES: { id: Role; label: string; description: string; sections: Section[] }[] = [
  {
    id: "admin",
    label: "مدیر کل",
    description: "دسترسی کامل، از جمله تنظیمات، ظاهر سایت، درون‌ریزی و مدیریت کاربران.",
    sections: ["posts", "publish", "categories", "media", "league", "squad", "ads", "menus", "appearance", "settings", "users", "import"],
  },
  {
    id: "editor",
    label: "سردبیر",
    description: "همه‌ی خبرها (انتشار، ویژه کردن و حذف)، دسته‌ها، رسانه، جدول و بازیکنان، تبلیغات و منوها.",
    sections: ["posts", "publish", "categories", "media", "league", "squad", "ads", "menus"],
  },
  {
    id: "writer",
    label: "خبرنگار",
    description: "نوشتن خبر و ویرایش خبرهای خودش؛ خبرها پیش‌نویس می‌مانند تا سردبیر منتشر کند. بارگذاری عکس.",
    sections: ["posts", "media"],
  },
  {
    id: "stats",
    label: "مسئول جدول و ترکیب",
    description: "جدول لیگ و بازی‌ها، بازیکنان و کادر، ترکیب بازی، و بارگذاری عکس.",
    sections: ["league", "squad", "media"],
  },
];

export const roleOf = (user?: { role?: Role } | null): Role => user?.role ?? "admin";
export const roleInfo = (role: Role) => ROLES.find((r) => r.id === role) ?? ROLES[0];
export const isRole = (v: string): v is Role => ROLES.some((r) => r.id === v);
export const can = (role: Role, section: Section) => roleInfo(role).sections.includes(section);

/** Panel addresses and the permission each needs (longest prefix wins). */
const PATHS: [string, Section][] = [
  ["/admin/posts/", "posts"],
  ["/admin/categories/", "categories"],
  ["/admin/media/", "media"],
  ["/admin/league/", "league"],
  ["/admin/squad/", "squad"],
  ["/admin/ads/", "ads"],
  ["/admin/menus/", "menus"],
  ["/admin/appearance/", "appearance"],
  ["/admin/settings/", "settings"],
  ["/admin/users/", "users"],
  ["/admin/import/", "import"],
  ["/admin/telegram/", "publish"],
  ["/admin/predict/", "users"],
  ["/admin/ratings/", "squad"],
  ["/admin/match-reports/", "squad"],
  ["/admin/backup/", "settings"],
  ["/admin/comments/", "publish"],
  ["/admin/stories/", "publish"],
];

export const sectionOfPath = (href: string): Section | undefined =>
  PATHS.filter(([p]) => href.startsWith(p)).sort((a, b) => b[0].length - a[0].length)[0]?.[1];

/** Writers may edit a post only when they created it and it is not published yet. */
export const canEditPost = (role: Role, username: string, post: { createdBy?: string; status?: string }) =>
  can(role, "publish") || (can(role, "posts") && post.createdBy === username && post.status === "draft");
