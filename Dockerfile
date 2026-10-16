# Multi-stage lightweight Node.js Dockerfile for QR Studio
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy application files
COPY . .

# Ensure uploads directory exists and permissions are set for non-root node user
RUN mkdir -p /app/public/uploads && chown -R node:node /app

# Use non-root user for enhanced security
USER node

# Expose production port
EXPOSE 5001

# Container healthcheck
HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5001/health || exit 1

# Start server
CMD ["node", "server.js"]
