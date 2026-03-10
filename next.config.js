/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Webpack configuration for font files
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(ttf|woff|woff2|eot)$/,
      type: 'asset/resource',
    });
    return config;
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },
  
  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'AI Dashboard',
  },
  
  // Disable x-powered-by header
  poweredByHeader: false,
  
  // Handle external images if needed
  images: {
    domains: [],
    unoptimized: true
  },
  
  // TypeScript strict mode
  typescript: {
    ignoreBuildErrors: false
  },
  
  // Disable tracing to avoid file permission issues
  // Note: trace option removed in Next.js 15
  // experimental: {
  //   trace: false
  // }
};

module.exports = nextConfig;