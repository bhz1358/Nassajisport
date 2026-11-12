import { getLeague } from "@/lib/league";
import { fixtureKey } from "@/lib/predict-score";
import { cachedStoryCard } from "@/lib/story-card";

export const dynamic = "force-dynamic";

/** /story/?m=<fixture key>[&download=1]: the 1080×1920 story picture of that match. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("m") ?? "";
  const f = getLeague().fixtures.find((x) => fixtureKey(x) === key);
  if (!f) return new Response("Not found", { status: 404 });
  const img = await cachedStoryCard(f);
  const name = `nassajisport-${f.round ? `week${f.round}-` : ""}${f.date.slice(0, 10)}.jpg`;
  return new Response(new Uint8Array(img), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `${url.searchParams.has("download") ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "public, max-age=60",
    },
  });
}
