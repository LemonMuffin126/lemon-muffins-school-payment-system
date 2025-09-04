/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration for Cloudflare Pages deployment
  images: {
    unoptimized: true,
  },
  // Enable experimental features
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  // Environment variables
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
}

module.exports = nextConfig