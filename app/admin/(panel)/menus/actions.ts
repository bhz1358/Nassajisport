"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { str, withError } from "@/lib/form";
import { parseMenu, saveMenu, type MenuKey } from "@/lib/menus";

const BACK = "/admin/menus/";
const key = (fd: FormData): MenuKey => (str(fd, "menu") === "footer" ? "footer" : "header");

export async function saveMenuAction(fd: FormData) {
  await requireAdmin();
  const k = key(fd);
  let items;
  try {
    items = parseMenu(str(fd, "items"));
  } catch (e) {
    redirect(withError(BACK, (e as Error).message) + `#${k}`);
  }
  saveMenu(k, items);
  redirect(`${BACK}?ok=saved#${k}`);
}

/** Back to the built-in menu. */
export async function resetMenuAction(fd: FormData) {
  await requireAdmin();
  const k = key(fd);
  saveMenu(k, null);
  redirect(`${BACK}?ok=saved#${k}`);
}
