import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // React strict mode for better development experience
  reactStrictMode: true,

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // External packages for server components (Neon compatibility)
  serverExternalPackages: ['@neondatabase/serverless'],

  // Recharts uses client-side features
  transpilePackages: ['recharts'],
}

export default nextConfig
