# ==============================================================================
# Stage 1: Build stage (Node.js + TypeScript compiler)
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions and TypeScript configuration
COPY package*.json tsconfig.json ./

# Install all dependencies including build-time devDependencies
RUN npm ci

# Copy application source
COPY src ./src

# Compile TypeScript to JavaScript in /dist
RUN npm run build

# Prune devDependencies to keep the production runtime lean
RUN npm prune --production

# ==============================================================================
# Stage 2: Lean Production Runtime
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user for container security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production dependencies and compiled artifacts from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/migrations ./dist/db/migrations
COPY --from=builder /app/src/db/migrations ./src/db/migrations

# Assign ownership to non-root user
USER appuser

EXPOSE 3000

# Launch server with automatic migrations on startup
CMD ["node", "dist/server.js"]

