# InsForge — Empresa Plana Website

Registro de la integración con InsForge: backend, DB y decisiones.

## Contexto

Nuxt 4 full-stack (SSR + Nitro `node_server` + WebSocket). **Prisma 7 es solo
cliente** (`prisma-client` generator + `@prisma/adapter-pg` + `pg`); **el DDL y
las migraciones viven en InsForge**.

## Conexión

- CLI linkeada al proyecto `empresaplana.cat` (`8929a7b2-3f14-461b-b228-e6f8c8b6573c`, `eu-central`).
- Comandos vía `npx -y @insforge/cli …` (el `-y` evita bloqueos). Estado: `current`.
- `.insforge/project.json` se genera al linkear; **no se commitea**.

## Base de datos

| Dato | Valor |
|---|---|
| Host | `k5s4v7js.eu-central.database.insforge.app` |
| DB | `insforge` (PostgreSQL) |
| SSL | `require` (pg avisa que es alias de `verify-full` hasta pg v9) |
| Cliente | Prisma 7 vía `@prisma/adapter-pg`, `DATABASE_URL` en `.env` |
| DDL | **Migraciones InsForge** (`migrations/*.sql`), nunca `prisma db push`/`migrate` |

### Migraciones (autoridad del esquema)

```bash
npx -y @insforge/cli db migrations new <name>   # crea migrations/<version>_<name>.sql
# editar el SQL
npx -y @insforge/cli db migrations up --all
bun run db:diff                                  # debe salir vacío
```

- `db:push` / `db:migrate` son **stubs que fallan a propósito** (`prisma db push`
  dropeaba el dataset: no conoce las tablas de InsForge).
- `prisma.config.ts` declara `tables.external` (transit_*, atm_*, payment_systems):
  Prisma las consulta pero jamás las toca. **No quitar.**
- Ownership: tablas creadas por Prisma → owner `postgres`; las migraciones corren
  como `project_admin`. Antes de alterar una tabla Prisma desde una migración:
  `ALTER TABLE … OWNER TO project_admin;`.
- Aplicadas: `canonical-transit`, `fix-atm-fares-pk`, `assistant-chat`, `cms-tables`,
  `align-assistant-tables`, `drop-legacy-demo-tables`, `profile-avatar`,
  `better-auth-sessions`, `better-auth-user-columns`, `better-auth-user-defaults`,
  `better-auth-user-email-unique`, `resync-id-sequences`.

### Seeds

- `bun run db:seed` (`prisma/seed.ts` + `prisma/seed-data/`, idempotente): usuarios demo
  `cliente`/`trabajador`/`admin` (passkey `12345678`, `emailVerified: true`), flota demo,
  budgets, notificaciones.
- `node scripts/seed-transit.mjs`: dataset canónico (líneas, paradas, viajes por tipo de
  día, tarifas ATM). Lee `data/routes/` + `data/fares/`.

## Secrets

- `AUTH_SECRET`, `DATABASE_URL`, `APP_URL`, `OPENROUTER_API_KEY`, `RESEND_API_KEY`…
  solo en `.env` (gitignored) y como envs del compute. **Nunca commitear.**
  `APP_URL` es **obligatoria en producción** (Better Auth la usa como `baseURL`
  y `trustedOrigins`; sin ella el logout del navegador falla con 403).
- Rotar cualquier credencial que haya pasado por chat.

## Deploy (InsForge Compute)

- Servicio `empresaplana` → `https://empresaplana-8929a7b2-3f14-461b-b228-e6f8c8b6573c.fly.dev`
- Dockerfile multi-stage: **build con `oven/bun`** (`bun install --frozen-lockfile` +
  `bun run build:node`) y **runtime `node:22.12-bookworm-slim`** (`node .output/server/index.mjs`).
- Región `fra`, `shared-1x`, 512 MB. Health: `/api/health`.

### Gotchas de deploy (aprendidos)

- **Bun necesita `trustedDependencies`** (`@prisma/engines`, `esbuild`, `prisma`,
  `vue-demi`, `workerd`) o los postinstall no corren y `prisma generate`/esbuild fallan.
- `COPY . .` antes de `bun install`: el `postinstall` de Prisma necesita el schema presente.
- `prisma.config.ts` lee `env('DATABASE_URL')` al cargar → el build stage usa un
  `DATABASE_URL` placeholder (solo genera código, no conecta).
- El stage de build necesita `openssl` para los engines de Prisma.
- `.dockerignore` excluye `*.md` pero re-incluye `CHANGELOG.md` (`!CHANGELOG.md`):
  sin eso el build rompe en `/dashboard/novedades`. También debe mantener `data/` excluido.

## Pendiente

1. Dominio `empresaplana.cat` para el compute (`domains` + SSL).
2. R2 para PDFs/media (credenciales).
3. Rotar credenciales expuestas en chat.
