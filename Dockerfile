# syntax=docker/dockerfile:1

FROM oven/bun:1.4.2 AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY . .
ENV DATABASE_URL=postgresql://postgres:placeholder@localhost:5432/placeholder
ENV NITRO_PRESET=node_server
RUN bun install --frozen-lockfile
RUN bun run build:node

FROM node:22.12.0-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", "./.output/server/index.mjs"]
