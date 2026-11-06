import { countClick, getAds, safeAdUrl } from "@/lib/ads";

// Ad clicks go through here so they can be counted, then on to the advertiser.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ad = getAds().find((a) => a.id === id);
  if (!ad || !safeAdUrl(ad.url)) return new Response("Not found", { status: 404 });
  countClick(ad.id);
  return new Response(null, { status: 302, headers: { Location: ad.url, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
