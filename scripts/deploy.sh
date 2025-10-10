#!/bin/bash

echo "=== Pre-deployment script for Azure Functions ==="
echo "Current directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

echo "=== Installing dependencies ==="
npm install --only=production=false

echo "=== Checking Prisma schema ==="
ls -la prisma/

echo "=== Generating Prisma Client ==="
npx prisma generate --schema=./prisma/schema.prisma

echo "=== Verifying Prisma Client generation ==="
if [ -d "node_modules/@prisma/client" ]; then
    echo "✅ Prisma Client exists at: node_modules/@prisma/client"
    ls -la node_modules/@prisma/client/
else
    echo "❌ Prisma Client not found!"
    exit 1
fi

echo "=== Building TypeScript ==="
npx tsc

echo "=== Deployment preparation completed ==="