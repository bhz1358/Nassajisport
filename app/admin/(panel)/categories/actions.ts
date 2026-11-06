"use server";

import { redirect } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { getAllPosts, getCategories, saveCategories, savePosts } from "@/lib/content";
import { str, withError } from "@/lib/form";

const BACK = "/admin/categories/";
const slugOk = (s: string) => /^[\p{L}\p{N}-]+$/u.test(s);

export async function saveCategory(fd: FormData) {
  await requireAccess("categories");
  const original = str(fd, "original");
  const name = str(fd, "name");
  const slug = str(fd, "slug").toLowerCase();
  if (!name || !slug) redirect(withError(BACK, "نام و نامک دسته لازم است."));
  if (!slugOk(slug)) redirect(withError(BACK, "نامک فقط حرف، عدد و خط تیره می‌تواند داشته باشد."));

  const cats = getCategories();
  if (cats.some((c) => c.slug === slug && c.slug !== original)) redirect(withError(BACK, `نامک «${slug}» قبلاً استفاده شده.`));
  const entry = { slug, name, ...(str(fd, "parent") ? { parent: str(fd, "parent") } : {}) };

  if (original) {
    saveCategories(cats.map((c) => (c.slug === original ? entry : c.parent === original ? { ...c, parent: slug } : c)));
    // Renaming a slug moves its posts along with it.
    if (original !== slug) {
      savePosts(getAllPosts().map((p) => ({ ...p, categories: p.categories.map((c) => (c === original ? slug : c)) })));
    }
  } else {
    saveCategories([...cats, entry]);
  }
  redirect(`${BACK}?ok=saved`);
}

export async function deleteCategory(fd: FormData) {
  await requireAccess("categories");
  const slug = str(fd, "slug");
  saveCategories(getCategories().filter((c) => c.slug !== slug).map((c) => (c.parent === slug ? { slug: c.slug, name: c.name } : c)));
  savePosts(getAllPosts().map((p) => ({ ...p, categories: p.categories.filter((c) => c !== slug) })));
  redirect(`${BACK}?ok=deleted`);
}
