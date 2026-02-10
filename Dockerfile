FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS builder

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
ARG NEXT_PUBLIC_CONSENT_VERSION=v1
ARG NEXT_PUBLIC_PRIVACY_VERSION=v1

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_CONSENT_VERSION=$NEXT_PUBLIC_CONSENT_VERSION
ENV NEXT_PUBLIC_PRIVACY_VERSION=$NEXT_PUBLIC_PRIVACY_VERSION

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm -C packages/shared build \
  && pnpm -C apps/api build \
  && pnpm -C apps/web build \
  && pnpm -C apps/worker build

FROM base AS runtime-base

ENV NODE_ENV=production

COPY --from=builder /app /app

RUN groupadd --system app \
  && useradd --system --gid app --create-home --home-dir /home/app app \
  && chown -R app:app /app

USER app

FROM runtime-base AS api

EXPOSE 3001

CMD ["sh", "-c", "node apps/api/node_modules/prisma/build/index.js migrate deploy --schema apps/api/prisma/schema.prisma && node apps/api/dist/src/main.js"]

FROM runtime-base AS web

EXPOSE 3000

CMD ["pnpm", "-C", "apps/web", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]

FROM runtime-base AS worker

CMD ["node", "apps/worker/dist/index.js"]
