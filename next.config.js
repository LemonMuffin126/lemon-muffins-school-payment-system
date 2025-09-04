/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration for Cloudflare Pages deployment
  images: {
    unoptimized: true,
  },
  // Environment variables
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },
  // Optimize for Cloudflare Pages
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
}

module.exports = nextConfig