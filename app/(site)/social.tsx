import { socialList, type SocialKey, type SocialLinks } from "@/lib/social";

// Simple 24×24 glyphs.
function Glyph({ k }: { k: SocialKey }) {
  switch (k) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="12" cy="12" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
        </svg>
      );
    case "telegram":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M21.4 3.6 2.9 10.7c-1.2.5-1.2 1.4-.2 1.7l4.7 1.5 1.8 5.5c.2.6.4.8.9.8.4 0 .6-.2.9-.4l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.4-1.6zM8.6 13.6l9.6-6c.5-.3.9-.1.5.2l-8 7.3-.3 3.4z" />
        </svg>
      );
  }
}

/** Icons for the networks that have a link; nothing when none is set. */
export function SocialIcons({ links, className = "", max }: { links?: SocialLinks; className?: string; max?: number }) {
  const list = socialList(links).slice(0, max);
  if (!list.length) return null;
  return (
    <ul className={`social ${className}`} aria-label="شبکه‌های اجتماعی">
      {list.map((n) => (
        <li key={n.key}>
          <a href={n.url} target="_blank" rel="noopener" aria-label={n.label} title={n.label} className={`social-${n.key}`}>
            <Glyph k={n.key} />
          </a>
        </li>
      ))}
    </ul>
  );
}
