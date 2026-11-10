FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build:railway

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production APP_RUNTIME=node NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 DATA_DIR=/data PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY scripts/start-railway.mjs scripts/backup-railway.mjs ./scripts/
EXPOSE 3000
CMD ["node", "scripts/start-railway.mjs"]
