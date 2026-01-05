/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/autocityPro/:path*',
        destination: '/autocityPro/:path*',
      },
    ];
  },
};

export default nextConfig;
