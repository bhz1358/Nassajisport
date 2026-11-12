import Link from "next/link";
import { bannerUrl, getSettings } from "@/lib/settings";

/** Wide banner between the menu and the home slider (set in the admin's settings). */
export function HomeBanner() {
  const s = getSettings();
  if (s.homeBanner?.hidden) return null;
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={bannerUrl(s)} alt="هواداران نساجی مازندران" width={2000} height={181} fetchPriority="high" />;
  const link = s.homeBanner?.link;
  return (
    <div className="home-banner">
      {link ? (
        <Link href={link} target={link.startsWith("http") ? "_blank" : undefined} rel={link.startsWith("http") ? "noopener" : undefined}>
          {img}
        </Link>
      ) : (
        img
      )}
    </div>
  );
}
