/** @type {import('next').NextConfig} */
const nextConfig = {
  // WordPress permalinks end with "/", keep them identical so old links keep working.
  trailingSlash: true,
  // Don't announce the framework in every response.
  poweredByHeader: false,
  experimental: {
    // Admin uploads: images, videos and the WordPress export file.
    serverActions: { bodySizeLimit: "64mb" },
  },
  async headers() {
    const common = [
      // Browsers must not guess a file's type (an upload can't run as a script).
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Other sites may not show these pages in a frame (clickjacking).
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      // Where pages may load things from. Scripts only from this site (Next's own inline
      // bootstrap needs 'unsafe-inline'); no plugins; frames only from the video sites posts embed;
      // the page may talk only to this site, so injected code couldn't send data elsewhere.
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "media-src 'self' blob: https:",
          "font-src 'self' data:",
          "connect-src 'self'",
          "frame-src https://www.aparat.com https://aparat.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'self'",
        ].join("; "),
      },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      // Once the site runs on HTTPS (SITE_URL https://…), browsers must keep using it.
      ...(process.env.SITE_URL?.startsWith("https://") ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
    ];
    return [
      { source: "/:path*", headers: common },
      // The panel and sign-in pages are never stored by browsers or proxies, nor indexed.
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
