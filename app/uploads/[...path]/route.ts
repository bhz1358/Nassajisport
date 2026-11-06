import fs from "node:fs";
import path from "node:path";
import { MEDIA_TYPES, resolveUpload } from "@/lib/media";

/** Reads bytes start..end (inclusive) of a file. */
function readRange(full: string, start: number, end: number): Buffer {
  const buf = Buffer.alloc(end - start + 1);
  const fd = fs.openSync(full, "r");
  try {
    fs.readSync(fd, buf, 0, buf.length, start);
  } finally {
    fs.closeSync(fd);
  }
  return buf;
}

// Serves files from DATA_DIR/uploads: media uploaded in the admin panel and the
// old WordPress uploads folder (copied there during migration).
// Byte ranges are supported because browsers (Safari above all) fetch videos in parts.
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
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
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };

  const range = req.headers.get("range");
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (range && stat.size > 0) {
    let start = m && m[1] ? Number(m[1]) : NaN;
    let end = m && m[2] ? Number(m[2]) : stat.size - 1;
    if (m && !m[1] && m[2]) {
      // "bytes=-500": the last 500 bytes.
      start = Math.max(0, stat.size - Number(m[2]));
      end = stat.size - 1;
    }
    end = Math.min(end, stat.size - 1);
    if (!m || Number.isNaN(start) || start > end) {
      return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${stat.size}` } });
    }
    return new Response(new Uint8Array(readRange(full, start, end)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1) },
    });
  }

  return new Response(new Uint8Array(fs.readFileSync(full)), {
    headers: { ...headers, "Content-Length": String(stat.size) },
  });
}
