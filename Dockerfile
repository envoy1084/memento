FROM node:24.18.0-bookworm-slim AS build
ENV LEFTHOOK=0
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /workspace
COPY . .
RUN --mount=type=cache,id=memento-pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile
# CI checks Solidity and generated ABIs. The runtime image needs only their TypeScript exports.
RUN pnpm --filter @memento/contracts exec tsdown \
    && pnpm -r --filter '@memento/server...' --filter '!@memento/contracts' build
RUN --mount=type=cache,id=memento-pnpm,target=/root/.local/share/pnpm/store pnpm --filter @memento/server deploy --legacy --prod /runtime

FROM node:24.18.0-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /runtime /app
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
