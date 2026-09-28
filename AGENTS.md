# AGENTS.md — Empresa Plana

Rediseño del sitio de Empresa Plana (transporte público, Costa Daurada) + intranet.
Target: `https://empresaplana.cat`. Repo público: nunca commitear datos sensibles.

## Stack

- **Nuxt 4** (`app/`, `server/`, `i18n/`) + Nitro (`node_server`) + Nuxt UI v4 + Tailwind v4.
- **@nuxtjs/i18n**: locale por defecto `ca` (raíz `/`), `es`/`en`/`fr` con prefijo.
- **@nuxtjs/color-mode**: dark/light (toggle en `SiteHeader`, tokens en `app/assets/css/main.css`).
- **Prisma 7** (`prisma-client` generator → `generated/prisma/`) + `@prisma/adapter-pg` + `pg`.
- **DB: InsForge Postgres** (proyecto `empresaplana.cat`, región eu-central). `DATABASE_URL` en `.env`.
- **Auth**: jose HS256 JWT en cookie `ep_session` + scrypt (`server/utils/passkey.ts`). Roles `client | worker | admin`.
- **ACL**: `shared/acl.ts` + `requireCapability()` (`server/utils/acl.ts`). Nada de `role === "..."` inline.
- **Storage**: Cloudflare R2 (pendiente: credenciales). No usar InsForge storage.
- Package manager: **pnpm**. Node >= 22.12. Formato/lint: **Biome**.

## Commands

```bash
pnpm dev                 # dev server :3000
pnpm build               # build Node (node_server) -> .output/
pnpm check               # biome check
pnpm typecheck           # nuxi typecheck
node scripts/seed-transit.mjs   # seed dataset canónico (lee data/routes + data/fares)
```

## Base de datos (InsForge)

- DDL SIEMPRE por migraciones InsForge: `npx -y @insforge/cli db migrations new <name>` → editar `migrations/*.sql` → `npx -y @insforge/cli db migrations up --all`. No usar `prisma migrate` ni `db push` contra InsForge.
- Migraciones aplicadas: `canonical-transit` (transit_lines/stops/line_stops/trips, atm_zones/atm_fares, payment_systems), `fix-atm-fares-pk`.
- Consultas puntuales: `npx -y @insforge/cli db query "SELECT ..."`.

## Dataset canónico del buscador

- Fuente: crawl del buscador viejo (`POST https://empresaplana.cat/descargas`) + PDFs oficiales.
- `data/` está **gitignored y es confidencial** (PDFs, exports, dataset). No publicar.
- Artefactos locales: `data/routes/lines-v2.json` (118 líneas), `trips-v2.json` (1053 viajes con paradas), `stops-v2.json`, `data/fares/atm-zones.json` + `atm-fares.json` (tarifas ATM 2026).
- Modelo: `id` secuencial interno + `signNumber` (número del cartel del bus) + `legacyIds` del sistema viejo. Líneas con datos: L4 (Costa, legacy 58/59), L11 (Cambrils–Vila-seca–Tarragona, 141/142 + 74-77), etc.
- Pendiente: tipos de día (hoy solo `feiners` del 2026-09-28), urbanos Cambrils L1-L3, nocturnos NT2-NT5, escolares y temporada (PDFs ya extraídos en `data/sources/extracted-lines/`).

## Buscador (API + UI)

- `GET /api/routes/search?from&to&time&date&type` → SQL JSONB (`stops @> ...`) + precios ATM por número de zonas. Sin zona ATM (Barcelona, Tortosa, etc.) → `price: null` + link a ATM.
- `GET /api/routes/localities` → localidades desde `transit_stops`.
- UI: widget en `/` (home) y página de resultados `/rutas-horarios` (auto-búsqueda por query params, paradas en `<details>`, PDF por línea).

## Deploy — InsForge compute (NO Render, NO Cloudflare runtime)

```bash
export PATH="$HOME/.fly/bin:$PATH"   # flyctl requerido (source mode)
npx -y @insforge/cli compute deploy . --name empresaplana --port 3000 --region fra --memory 512 --env-file .env
```

- URL: `https://empresaplana-8929a7b2-3f14-461b-b228-e6f8c8b6573c.fly.dev`
- Plan Free: 1 solo servicio compute y **máximo 512MB por máquina**. Para producción pedir upgrade (la empresa paga).
- Prisma **no corre en Cloudflare Workers** (query compiler WASM, issues #28657/#29660): por eso el runtime es un contenedor Node en InsForge compute. Cloudflare solo para R2.
- `fly.toml` es autogenerado por el CLI (no commitear su `app` id; el archivo se puede regenerar).

## Demo portfolio — Cloudflare Pages (estático)

- Proyecto Pages `empresaplana-demo` → `https://empresaplana-demo.pages.dev` (dominio `empresaplana.senseikatana.com` asociado; falta el CNAME en la zona).
- Modo estático: `NUXT_PUBLIC_STATIC_DEMO=true` → `nuxt generate` con búsqueda 100% cliente sobre `public/data/transit.json` (misma lógica que la API, `shared/utils/transit.ts`).
- Scripts: `pnpm demo:data` (exporta el dataset), `pnpm demo:build`, `pnpm deploy:demo` (data + build + `wrangler pages deploy`).
- `wrangler.jsonc` es la config del proyecto Pages (no es un Worker).

## Releases / Novedades

- Página `/releases` (label localizado: Novetats/Novedades/What's new/Nouveautés) que parsea `CHANGELOG.md` y enlaza cada versión a la GitHub Release.
- `pnpm release:bump --version=x.y.z` inserta `## [x.y.z] - fecha` al tope del CHANGELOG (sin sección `[Unreleased]`) y actualiza `package.json`.
- `.github/workflows/release.yml`: al push de un tag `v*` crea/actualiza la GitHub Release con las notas del CHANGELOG.

## Seguridad

- `.env` (real) y `opencode.json` (contiene la API key de InsForge) están gitignored. No commitear.
- `public/*_export.json` y `database-structure.png` fueron removidos del árbol, pero siguen en el historial de git: pendiente evaluar `git filter-repo` si se exige confidencialidad total.
- Rotar credenciales que hayan pasado por chat/diálogos.

## Gotchas

- El generador Prisma es `prisma-client` (output `../generated/prisma`), no `prisma-client-js`.
- `pg-native` tiene stub (`server/utils/pg-native-stub.ts`) + alias en Nitro; no quitar.
- `prisma.config.ts` vive en la raíz (Prisma 7 no lo detecta dentro de `prisma/`).
- `.dockerignore` debe mantener `data/` excluido (350MB+ de PDFs en el contexto de build).
- El sitio viejo separa una línea en varios `legacyId` por sentido/variante; el dataset los agrupa por nombre de PDF.
- `scripts/seed-transit.mjs` es idempotente (upserts).

## InsForge

El backend/plataforma es InsForge (DB, compute, payments con Stripe). Para infraestructura usar el skill `insforge-cli`; para SDK de app, el skill `insforge`. La documentación general de InsForge está en el AGENTS.md global del usuario.
