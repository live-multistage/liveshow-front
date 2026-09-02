# Production image for live-show-react (Next.js standalone output).
#
# This app is a member of the outer pnpm workspace (lockfile + design-system
# package live one level up), so the build MUST run with the workspace root
# as context:
#
#   docker build -f live-show-react/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api \
#     --build-arg NEXT_PUBLIC_ADS_MANAGER_URL=https://ads.example.com \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://liveshow.app \
#     -t live-show-react .
#
# (run from /Users/ysraelmoreno/Documents/codes/live-show, not from inside
# live-show-react/)

FROM node:20-alpine AS builder
WORKDIR /workspace
# Pin pnpm major to match the workspace's dev toolchain (v10, no
# packageManager field in package.json to read from): plain `corepack
# enable` grabs latest pnpm, which now requires Node 22.13+ and crashes
# on node:20-alpine with ERR_UNKNOWN_BUILTIN_MODULE (node:sqlite).
RUN corepack enable && corepack prepare pnpm@10 --activate

# ponytail: copies the whole workspace instead of a package.json-only cache
# layer — simplest correct thing for a private, single-purpose monorepo.
# Add a deps-only pre-copy stage if build times start to hurt.
COPY . .

RUN pnpm install --frozen-lockfile

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ADS_MANAGER_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_ADS_MANAGER_URL=$NEXT_PUBLIC_ADS_MANAGER_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter ./live-show-react run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /workspace/live-show-react/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/live-show-react/.next/static ./live-show-react/.next/static
COPY --from=builder --chown=nextjs:nodejs /workspace/live-show-react/public ./live-show-react/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

CMD ["node", "live-show-react/server.js"]
