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
  serverExternalPackages: ['@supabase/supabase-js'],
}

module.exports = nextConfig