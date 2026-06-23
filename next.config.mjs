/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No ESLint config in this project; type-safety is enforced via tsc / next's
  // built-in type checking instead.
  eslint: { ignoreDuringBuilds: true },
  // Tree JSON is large; allow importing it server-side without bundling bloat warnings.
  experimental: {
    largePageDataBytes: 8 * 1024 * 1024,
  },
};

export default nextConfig;
