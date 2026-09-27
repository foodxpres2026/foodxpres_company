import type { NextConfig } from "next";
import { resolve } from 'node:path'

const nextConfig: NextConfig = {
  turbopack: {
    root: resolve(process.cwd(), '../..'),
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
      ...(process.env.NODE_ENV === 'production'
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]
        : []),
    ]
    return [{ source: '/:path*', headers: securityHeaders }]
  },
};

export default nextConfig;
