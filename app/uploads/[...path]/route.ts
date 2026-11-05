import fs from "node:fs";
import path from "node:path";
import { MEDIA_TYPES, resolveUpload } from "@/lib/media";

// Serves files from DATA_DIR/uploads: media uploaded in the admin panel and the
// old WordPress uploads folder (copied there during migration).
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params;
  const full = resolveUpload(parts.map((p) => decodeURIComponent(p)).join("/"));
  const type = full && MEDIA_TYPES[path.extname(full).toLowerCase()];
  if (!full || !type) return new Response("Not found", { status: 404 });
  let stat: fs.Stats;
  try {
    stat = fs.statSync(full);
    if (!stat.isFile()) throw new Error();
  } catch {
    return new Response("Not found", { status: 404 });
  }
  return new Response(fs.readFileSync(full), {
    headers: {
      "Content-Type": type,
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
