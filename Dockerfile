# DayMark — multi-stage build for the standalone Next.js server.
# Build:      docker build -t daymark .
# Run:        docker run --rm -p 3000:3000 --env-file .env.local daymark

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 daymark \
  && adduser --system --uid 1001 daymark
USER daymark

COPY --from=builder --chown=daymark:daymark /app/public ./public
COPY --from=builder --chown=daymark:daymark /app/.next/standalone ./
COPY --from=builder --chown=daymark:daymark /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]