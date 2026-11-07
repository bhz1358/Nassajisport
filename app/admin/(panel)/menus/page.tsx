import type { Metadata } from "next";
import { requireAccess } from "@/lib/auth";
import { Flash, PageHead } from "../../ui";
import { SubmitButton } from "../../ui-client";
import { resetMenuAction, saveMenuAction } from "./actions";
import { MenuEditor } from "./editor";
import { getCategories } from "@/lib/content";
import { getMenus, toRows, type MenuItem, type MenuKey } from "@/lib/menus";

export const metadata: Metadata = { title: "منوها" };

const MENUS: { key: MenuKey; title: string; hint: string }[] = [
  { key: "header", title: "منوی بالای سایت", hint: "در نوار بالای همه‌ی صفحه‌ها. ۶ تا ۹ گزینه بهترین است؛ در موبایل این منو با انگشت ورق می‌خورد. با دکمه‌ی «زیرمنو» یک گزینه زیر گزینه‌ی بالایی‌اش می‌رود و در سایت با بردن ماوس (یا زدن روی فلش کنارش در موبایل) باز می‌شود. گزینه‌ی دارای زیرمنو می‌تواند آدرس نداشته باشد." },
  { key: "footer", title: "منوی پایین سایت", hint: "در پایین همه‌ی صفحه‌ها؛ جای بخش‌هایی که در منوی بالا جا نمی‌شوند." },
];

export default async function MenusPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAccess("menus");
  const menus = getMenus();
  const suggestions: MenuItem[] = [
    { label: "خانه", href: "/" },
    { label: "تیم", href: "/team/" },
    { label: "جدول و نتایج", href: "/league/" },
    { label: "ارتباط با ما", href: "/contact/" },
    { label: "جست‌وجو", href: "/search/" },
    ...getCategories().map((c) => ({ label: c.name, href: `/category/${c.slug}/` })),
  ];
  return (
    <>
      <PageHead title="منوها" />
      <Flash searchParams={searchParams} />
      <p className="a-hint">
        عنوان و آدرس هر گزینه را عوض کنید، با ↑ ↓ جابه‌جا کنید، با × حذف کنید و در آخر «ذخیره» را بزنید. آدرس می‌تواند صفحه‌ای از سایت باشد (مثل ‎/league/‎) یا
        آدرس کامل سایت دیگر با https:// که در زبانه‌ی جدید باز می‌شود.
      </p>
      {MENUS.map((m) => (
        <section key={m.key} id={m.key} className="a-card">
          <h2>{m.title}</h2>
          <p className="a-hint">{m.hint}</p>
          <form action={saveMenuAction}>
            <input type="hidden" name="menu" value={m.key} />
            <MenuEditor rows={toRows(menus[m.key])} suggestions={suggestions} listId={`pages-${m.key}`} nested={m.key === "header"} />
            <div className="a-menu-actions">
              <SubmitButton>ذخیره {m.title}</SubmitButton>
            </div>
          </form>
          <form action={resetMenuAction} className="a-menu-reset">
            <input type="hidden" name="menu" value={m.key} />
            <SubmitButton className="a-link" confirm={`${m.title} به حالت پیش‌فرض برگردد؟ تغییرات شما در این منو پاک می‌شود.`} pendingText="…">
              برگرداندن به حالت پیش‌فرض
            </SubmitButton>
          </form>
        </section>
      ))}
    </>
  );
}
