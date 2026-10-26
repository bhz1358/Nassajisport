/** @type {import('next').NextConfig} */
const nextConfig = {
  // WordPress permalinks end with "/", keep them identical so old links keep working.
  trailingSlash: true,
};

export default nextConfig;
