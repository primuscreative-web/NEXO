FROM node:26.5.0-bookworm-slim AS build
ARG APP_NAME
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /workspace
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "$APP_NAME"... build

FROM node:26.5.0-bookworm-slim AS runtime
ARG APP_NAME
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV APP_NAME=$APP_NAME
RUN corepack enable
RUN groupadd --system --gid 1001 nexo && useradd --system --uid 1001 --gid nexo nexo
WORKDIR /workspace
COPY --from=build --chown=nexo:nexo /workspace /workspace
USER nexo
CMD ["sh", "-c", "pnpm --filter \"$APP_NAME\" start"]

