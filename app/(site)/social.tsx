import { socialList, type SocialKey, type SocialLinks } from "@/lib/social";

// Simple 24×24 glyphs. Iranian networks get a monogram in their usual colour family.
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
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" fillRule="evenodd" d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.6 2.6 0 0 0-1.8 1.8A27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3z" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z" />
        </svg>
      );
    case "aparat":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" />
          {[
            [6.2, 3.6],
            [20.4, 6.2],
            [17.8, 20.4],
            [3.6, 17.8],
          ].map(([cx, cy]) => (
            <circle key={cx} cx={cx} cy={cy} r="2.2" fill="currentColor" />
          ))}
        </svg>
      );
    default: {
      const letter = { rubika: "ر", eitaa: "ا", bale: "ب" }[k as "rubika" | "eitaa" | "bale"];
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="6" fill="none" stroke="currentColor" strokeWidth="1.9" />
          <text x="12" y="16.4" textAnchor="middle" fontSize="11" fontWeight="900" fill="currentColor" fontFamily="inherit">
            {letter}
          </text>
        </svg>
      );
    }
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
