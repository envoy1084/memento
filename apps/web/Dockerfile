# syntax=docker/dockerfile:1
FROM node:24.18.0-bookworm-slim AS build
ENV LEFTHOOK=0
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /workspace
COPY . .
RUN --mount=type=cache,id=memento-pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

# Only public browser configuration belongs in build arguments.
ARG VITE_API_URL
ARG VITE_PRIVY_APP_ID
RUN test -n "$VITE_API_URL" && test -n "$VITE_PRIVY_APP_ID"
RUN pnpm --filter @memento/web build

FROM nginx:stable-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
