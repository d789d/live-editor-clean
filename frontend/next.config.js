/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Hebrew/RTL support
  i18n: {
    locales: ['he', 'en'],
    defaultLocale: 'he',
  },
  
  // API Routes
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
  
  // Environment variables
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3001/api',
  },
  
  // Image domains (if needed)
  images: {
    domains: ['localhost'],
  },
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['react-icons'],
  },
};

module.exports = nextConfig;