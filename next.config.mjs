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
    ];
    return [
      { source: "/:path*", headers: common },
      // The panel and sign-in pages are never stored by browsers or proxies, nor indexed.
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
