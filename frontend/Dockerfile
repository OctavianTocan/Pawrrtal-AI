# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────
# Next.js production image using Bun
#
# Multi-stage build:
#   deps    — install workspace dependencies with bun
#   builder — compile the Next.js app (output: standalone)
#   runner  — minimal Node runtime image serving server.js
#
# Build-time ARG:
#   NEXT_PUBLIC_API_URL  defaults to http://backend:8000 (Docker internal
#                        network). Override when building for a different
#                        target (e.g. a public domain).
# ─────────────────────────────────────────────────────────────

# ── Deps ────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# Copy workspace manifests so bun install resolves all packages
COPY package.json bun.lock ./
# lib/ contains vendored submodule packages (react-chat-composer, etc.)
COPY lib/ ./lib/

RUN bun install --frozen-lockfile

# ── Builder ─────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# API URL for server-side Next.js calls (RSCs, Server Actions).
# Client-side browser calls go through the Nginx proxy at the same
# origin (/api/*), so NEXT_PUBLIC_ is not needed in the browser.
ARG NEXT_PUBLIC_API_URL=http://backend:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN bun run build

# ── Runner ──────────────────────────────────────────────────
# Use a plain Node image for the runtime — smaller than bun and avoids
# bun runtime quirks with the standalone Next.js server.js entrypoint.
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# next.config.ts sets output: 'standalone' so the build emits a
# self-contained server bundle + trimmed node_modules slice.
COPY --from=builder /app/public                                ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# server.js is the standalone entrypoint emitted by Next.js output: standalone
CMD ["node", "server.js"]
