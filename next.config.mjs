/** @type {import('next').NextConfig} */
const nextConfig = {
  // WordPress permalinks end with "/", keep them identical so old links keep working.
  trailingSlash: true,
  experimental: {
    // Admin uploads: images, videos and the WordPress export file.
    serverActions: { bodySizeLimit: "64mb" },
  },
};

export default nextConfig;
