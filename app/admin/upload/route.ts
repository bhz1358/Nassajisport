import path from "node:path";
import { getPanelUser } from "@/lib/auth";
import { saveUpload, saveUploadAsWebp } from "@/lib/media";
import { can } from "@/lib/roles";

// Pictures and videos dropped into the post editor. Photos are resized (longest side
// 1600px) and saved as WebP; GIFs keep their animation; MP4/WebM videos are kept as they are.
export async function POST(req: Request) {
  const user = await getPanelUser();
  if (!user || !(can(user.role, "posts") || can(user.role, "media"))) {
    return Response.json({ error: "برای بارگذاری باید وارد پنل شوید." }, { status: 401 });
  }
  let file: File | null = null;
  try {
    const fd = await req.formData();
    const f = fd.get("file");
    file = f instanceof File && f.size > 0 ? f : null;
  } catch {
    /* handled below */
  }
  if (!file) return Response.json({ error: "فایلی دریافت نشد." }, { status: 400 });
  const ext = path.extname(file.name).toLowerCase();
  try {
    const kind = [".mp4", ".webm"].includes(ext) ? "video" : "image";
    const url = [".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(ext) ? await saveUploadAsWebp(file, 1600) : await saveUpload(file);
    return Response.json({ url, kind });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
