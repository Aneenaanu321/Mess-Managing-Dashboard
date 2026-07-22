/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },
  output: "standalone",
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react"],
  },
  async redirects() {
    return [
      { source: "/leads/:path*", destination: "/new-inquiries/:path*", permanent: true },
      { source: "/opportunities/:path*", destination: "/active-deals/:path*", permanent: true },
      { source: "/pipeline/:path*", destination: "/deal-board/:path*", permanent: true },
      { source: "/quotations/:path*", destination: "/orders/:path*", permanent: true },
      { source: "/approvals/:path*", destination: "/pending-approvals/:path*", permanent: true },
      { source: "/sales-orders/:path*", destination: "/order-completed/:path*", permanent: true },
      { source: "/inventory/:path*", destination: "/products-stock/:path*", permanent: true },
      { source: "/warehouse/:path*", destination: "/stock-locations/:path*", permanent: true },
      { source: "/procurement/:path*", destination: "/purchase-orders/:path*", permanent: true },
      { source: "/projects/:path*", destination: "/customer-projects/:path*", permanent: true },
      { source: "/installations/:path*", destination: "/site-installations/:path*", permanent: true },
      { source: "/devices/:path*", destination: "/installed-equipment/:path*", permanent: true },
      { source: "/tasks/:path*", destination: "/team-tasks/:path*", permanent: true },
      { source: "/finance/:path*", destination: "/invoices-payments/:path*", permanent: true },
      { source: "/ai-assistant/:path*", destination: "/sales-assistant/:path*", permanent: true },
      { source: "/support/:path*", destination: "/customer-support/:path*", permanent: true },
      { source: "/amc/:path*", destination: "/service-contracts/:path*", permanent: true },
      {
        source: "/purchase-orders/:path*",
        destination: "/customer-orders/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
