/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@trading-platform/core', '@trading-platform/charting'],
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8080',
  },
};

module.exports = nextConfig;
