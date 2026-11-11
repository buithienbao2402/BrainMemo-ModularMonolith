# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /workspace

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tools/package.json ./tools/package.json
COPY frontend/package.json ./frontend/package.json

RUN corepack enable \
    && corepack pnpm install --frozen-lockfile --filter frontend...

COPY frontend/ ./frontend/

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_USE_MOCK=false
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_USE_MOCK=${VITE_USE_MOCK}

RUN corepack pnpm --filter frontend build

FROM nginx:1.27-alpine AS runtime

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD ["wget", "-q", "--spider", "http://127.0.0.1:80/healthz"]

