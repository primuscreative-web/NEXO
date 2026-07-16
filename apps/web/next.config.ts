import type { NextConfig } from 'next'
import path from 'node:path'

const workspaceRoot = path.resolve(process.cwd(), '../..')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    root: workspaceRoot,
  },
}

export default nextConfig
