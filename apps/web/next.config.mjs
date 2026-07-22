/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },
  output: "standalone",
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react"],
  },
};

export default nextConfig;
