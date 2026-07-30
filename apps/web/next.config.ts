import type { NextConfig } from 'next'
import path from 'node:path'

const workspaceRoot = path.resolve(process.cwd(), '../..')
const isProduction = process.env.NODE_ENV === 'production'
const publicApiUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  (isProduction ? '/api' : 'http://localhost:3001')
const backendApiUrl = process.env.NEXO_BACKEND_URL ?? publicApiUrl

if (
  isProduction &&
  (!process.env.NEXO_BACKEND_URL || backendApiUrl.startsWith('/'))
) {
  throw new Error(
    'NEXO_BACKEND_URL must be an absolute HTTP(S) URL in production',
  )
}

const apiOrigin = (() => {
  if (publicApiUrl.startsWith('/')) return null
  try {
    return new URL(publicApiUrl).origin
  } catch {
    return null
  }
})()

const backendApiOrigin = (() => {
  try {
    return new URL(backendApiUrl).origin
  } catch {
    return 'http://localhost:3001'
  }
})()

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}`,
].join('; ')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@nexo/ui'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendApiOrigin}/:path*`,
      },
    ]
  },
  turbopack: {
    root: workspaceRoot,
  },
}

export default nextConfig
