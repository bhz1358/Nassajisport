"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { str, withError } from "@/lib/form";
import { deleteMedia, saveUpload } from "@/lib/media";

export async function uploadMedia(fd: FormData) {
  await requireAdmin();
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) redirect(withError("/admin/media/", "فایلی انتخاب نشده."));
  const errors: string[] = [];
  for (const f of files) {
    try {
      await saveUpload(f);
    } catch (e) {
      errors.push(`${f.name}: ${(e as Error).message}`);
    }
  }
  redirect(errors.length ? withError("/admin/media/", errors.join(" — ")) : "/admin/media/?ok=uploaded");
}

export async function removeMedia(fd: FormData) {
  await requireAdmin();
  if (!deleteMedia(str(fd, "url"))) redirect(withError("/admin/media/", "فایل پیدا نشد."));
  redirect("/admin/media/?ok=deleted");
}
