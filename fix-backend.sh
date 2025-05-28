#!/bin/bash

# Fix the backend Dockerfile to use npm install instead of npm ci
cat > backend/Dockerfile << 'EOF'
# Multi-stage build for Node.js backend

# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production

# Stage 2: Production
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

USER nodejs

EXPOSE 3000

CMD ["node", "src/index.js"]
EOF

echo "✅ Backend Dockerfile fixed!"

# Also, let's create a package-lock.json for better practice
cd backend
npm install --package-lock-only
cd ..

echo "✅ Package-lock.json generated!"