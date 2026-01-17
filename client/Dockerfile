# Build stage
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Set production environment
ENV NODE_ENV=production

# Accept VITE_API_URL as build argument
ARG VITE_API_URL=http://localhost:5001/api
ENV VITE_API_URL=${VITE_API_URL}

# Build application
RUN npm run build:docker

# Production stage - serve with Node.js
FROM node:20-alpine

WORKDIR /app

# Install serve package globally
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 appuser && \
    adduser -S -u 1001 -G appuser appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173/ || exit 1

# Serve static files
CMD ["serve", "-s", "dist", "-l", "5173"]
