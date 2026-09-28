# Empresa Plana Website

Website redesign of [empresaplana.cat](https://empresaplana.cat) for Empresa Plana
(Costa Daurada / Camp de Tarragona transport company). Public site + admin panel
(intranet/CMS, AI assistant) — bus lines, schedules, stops, ATM fares, airport
transfers and discretionary services. Content is Catalan-first (`ca`, `es`, `en`, `fr`).

## Tech stack

| Layer     | Technology                                                                    |
| --------- | ----------------------------------------------------------------------------- |
| Framework | Nuxt 4 + Nitro 2 (`node_server`), Nuxt UI v4, Tailwind v4                     |
| i18n      | `@nuxtjs/i18n` — `ca` default (root), `es`/`en`/`fr` prefixed                |
| Data      | Prisma 7 (`prisma-client` generator → `generated/prisma/`) + `@prisma/adapter-pg` |
| DB        | InsForge Postgres (`empresaplana.cat`, eu-central) — **DDL via InsForge migrations** |
| Auth      | `jose` HS256 JWT in `ep_session` httpOnly cookie + scrypt, ACL (roles → capabilities) |
| Assistant | `ai` v7 + `@ai-sdk/vue` + OpenRouter (`openrouter/free` by default)          |
| Markdown  | `@comark/nuxt` (changelog/releases)                                           |
| Tooling   | **Bun** (package manager + build), Node `>= 22.12` runtime, Biome, TypeScript strict |

## Prerequisites

- [Bun](https://bun.sh) + Node.js `>= 22.12` (runtime).
- Access to the InsForge project (`DATABASE_URL` in `.env`). No local DB needed.

## Installation

```bash
bun install
cp .env.example .env        # set DATABASE_URL, AUTH_SECRET (and OPENROUTER_API_KEY)
bun run db:generate
bun run db:seed             # demo users: cliente / trabajador / admin (passkey 12345678)
bun run dev                 # http://localhost:{PORT} - 3000 is the PORT by default
```

Schema changes do **not** use Prisma push/migrate (they are forbidden stubs):

```bash
npx -y @insforge/cli db migrations new <name>
# edit migrations/<version>_<name>.sql
npx -y @insforge/cli db migrations up --all
bun run db:diff             # must be empty (DB == schema)
```

## Scripts

| Command                            | Description                                          |
| ---------------------------------- | ---------------------------------------------------- |
| `bun run dev`                      | Dev server at `http://localhost:3000`                |
| `bun run build`                    | Nuxt build → `.output/`                              |
| `bun run build:node`               | Explicit Node build (`NITRO_PRESET=node_server`)     |
| `bun run check` / `lint` / `format`| Biome                                                |
| `bun run typecheck`                | `nuxi typecheck`                                     |
| `bun run db:generate` / `db:diff` / `db:seed` / `db:setup` | Prisma client/seed/drift check |
| `bun run db:create-user`           | Create/update a user (`<user> <pass> <role>`)        |
| `node scripts/seed-transit.mjs`    | Re-seed the canonical transit dataset               |
| `bun run demo:data` / `demo:build` | Export dataset / static demo build                  |
| `bun run deploy:demo`              | Data + build + `wrangler deploy` (Cloudflare Workers) |
| `bun run release:bump --version=x.y.z` | Bump version + CHANGELOG entry                  |

## Environment variables

- `DATABASE_URL` — InsForge Postgres connection string.
- `AUTH_SECRET` — random string for session JWTs.
- `RESEND_API_KEY` / `MAIL_FROM` / `APP_URL` — transactional email (verification).
- `OPENROUTER_API_KEY` / `ASSISTANT_MODEL` — AI assistant (default `openrouter/free`).
- `MCP_SERVERS` — optional JSON list of MCP servers for the assistant.

Never commit `.env` or `.dev.vars`.

## Project structure

```
app/               # pages, components, layouts, middleware, composables
  assets/css/      # main.css — Tailwind v4 @theme tokens (source of truth)
server/            # Nitro API (api/, routes/, middleware/, utils/)
  api/dashboard/   # protected intranet endpoints (requireCapability)
  middleware/      # dashboard-guard.ts (SSR session + email verification)
i18n/locales/      # ca/es/en/fr dictionaries
shared/            # code shared by app + server (ACL, transit search, day types)
migrations/        # InsForge SQL migrations (DB source of truth)
prisma/            # schema.prisma (client-only) + seed
scripts/           # transit ingest, demo export, releases
data/              # gitignored: PDFs, canonical dataset, ATM fares
```

## Deployment

- **App (primary): InsForge compute** — Docker (Bun build + Node runtime), region `fra`.
  `npx -y @insforge/cli compute deploy . --name empresaplana --port 3000 --region fra --memory 512 --env-file .env`
- **Demo (portfolio): Cloudflare Workers Static Assets** — `wrangler deploy`
  (config in `wrangler.jsonc`; custom domain `empresaplana.senseikatana.com` is managed
  by the deploy itself; `NUXT_PUBLIC_STATIC_DEMO=true` for the client-side dataset build).
- Prisma does not run on Cloudflare Workers (prisma/prisma#28657); that's why the app
  runtime is a Node container on InsForge compute.

## License

MIT
