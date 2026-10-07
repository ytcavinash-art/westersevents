#!/bin/bash
# ======================================================
# Westers Event Booking System — cPanel / VPS Deployer
# ======================================================

set -e

echo "🚀 Starting deployment for Westers Event Booking System..."

# 1. Check Node version
NODE_VER=$(node -v)
echo "📦 Detected Node.js version: $NODE_VER"

# 2. Install production dependencies
echo "📥 Installing production dependencies..."
npm ci --only=production

# 3. Create required directories
echo "📁 Ensuring storage directory exists..."
mkdir -p data
mkdir -p public/assets

# 4. Set permissions for SQLite database
chmod 755 data

# 5. Check environment file
if [ ! -f .env ]; then
  echo "⚠️ Warning: .env file missing! Creating from .env.example..."
  cp .env.example .env
  echo "👉 Please edit .env with your real JWT_SECRET, ADMIN_PASSWORD, Twilio & Resend keys."
fi

# 6. Syntax check backend files
echo "🔍 Validating syntax..."
node --check src/server.js public/app.js public/admin.js

echo "✅ Deployment setup completed successfully!"
echo "👉 Restart your cPanel Node.js Application or PM2 daemon to apply changes."
