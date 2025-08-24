import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Performance Optimizations
  compress: true,
  poweredByHeader: false,
  
  // Static asset optimization
  async headers() {
    return [
      {
        source: '/data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/:path*\\.(ico|png|jpg|jpeg|gif|webp|svg)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, immutable',
          },
        ],
      },
      {
        source: '/:path*\\.(js|css|woff2|woff)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400, // 1 day
  },

  // Output configuration for dynamic rendering (compatible with headers)
  // output: 'export',  // Disabled due to header incompatibility
  // trailingSlash: true,
  
  // Standard build output
  // distDir: 'out',
  
  // Experimental optimizations (disabled for stability)
  experimental: {
    // optimizePackageImports: ['recharts', 'date-fns'], // Disabled for production stability
  },

  // Environment variables for network optimization
  env: {
    NETWORK_CACHE_TTL: process.env.NETWORK_CACHE_TTL || '300000', // 5 minutes
    NETWORK_RETRY_COUNT: process.env.NETWORK_RETRY_COUNT || '3',
    NETWORK_TIMEOUT: process.env.NETWORK_TIMEOUT || '10000', // 10 seconds
  },
  
  // Bundle analyzer (development only)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config: any) => {
      config.module.rules.push({
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['next/babel'],
          },
        },
      });
      return config;
    },
  }),
};

export default nextConfig;
