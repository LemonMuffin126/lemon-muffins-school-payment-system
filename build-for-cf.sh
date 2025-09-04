#!/bin/bash

# Build script for Cloudflare Pages deployment
echo "Building for Cloudflare Pages..."

# Clean any existing build
rm -rf .next

# Build the application
npm run build

# Remove cache and large files
echo "Cleaning cache and large files..."
rm -rf .next/cache
find .next -name "*.pack" -type f -delete
find .next -size +20M -type f -delete
find .next -name "webpack" -type d -exec rm -rf {} + 2>/dev/null || true

# List remaining large files for debugging
echo "Files larger than 10MB remaining:"
find .next -size +10M -type f 2>/dev/null || true

echo "Build complete and optimized for Cloudflare Pages!"