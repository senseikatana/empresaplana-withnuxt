# AGENTS.md — Empresa Plana

Rediseño del sitio de Empresa Plana (transporte público, Costa Daurada) + intranet.
Target: `https://empresaplana.cat`. Repo público: nunca commitear datos sensibles.

## Stack

- **Nuxt 4** (`app/`, `server/`, `i18n/`) + Nitro (`node_server`) + Nuxt UI v4 + Tailwind v4.
- **@nuxtjs/i18n** (default `ca` en `/`; `es`/`en`/`fr` con prefijo) + **@nuxtjs/color-mode** (tokens dark en `app/assets/css/main.css`).
- **@comark/nuxt** para markdown (`app/components/AppMarkdown.ts`), **ai v7 + @ai-sdk/vue + @ai-sdk/openai-compatible** para el asistente.
- **Prisma 7** (`prisma-client` generator → `generated/prisma/`) + `@prisma/adapter-pg` + `pg`. **Prisma es SOLO cliente: el DDL vive en migraciones InsForge.**
- **DB: InsForge Postgres** (proyecto `empresaplana.cat`, eu-central). `DATABASE_URL` en `.env`.
- **Auth**: **Better Auth** (`server/auth.ts`) — sesiones en la tabla `Session` (revocables), credenciales en `Account.password`. Login por `username` + contraseña (scrypt, mismo formato `salt:hash` que antes). Roles `client | worker | admin`.
- **ACL**: `shared/acl.ts` + `requireCapability()` (`server/utils/acl.ts`). Nada de `role === "..."` inline.
- **Package manager + build: Bun** (`bun.lock`; `trustedDependencies` en `package.json` para los postinstall de Prisma/esbuild/workerd). Runtime de producción: **Node >= 22.12**. Formato/lint: **Biome**.

## Commands

```bash
bun run dev              # dev server :3000
bun run build:node       # build Node (node_server) -> .output/
bun run check && bun run typecheck
bun run db:generate      # regenera el cliente Prisma
bun run db:diff          # DEBE salir vacío: DB == schema (verifica drift)
bun run db:seed          # seed demo (idempotente)
node scripts/seed-transit.mjs   # seed del dataset canónico (lee data/routes + data/fares)
bun run deploy:demo      # data + build estático + wrangler deploy (Cloudflare Workers)
```

## Base de datos (InsForge) — reglas duras

- DDL SIEMPRE por migraciones InsForge: `npx -y @insforge/cli db migrations new <name>` → editar `migrations/*.sql` → `npx -y @insforge/cli db migrations up --all`.
- **`db:push`/`db:migrate` son stubs que fallan a propósito**: `prisma db push` dropeaba el dataset (no conoce las tablas creadas por InsForge).
- **`tables.external` en `prisma.config.ts` (7 tablas: `transit_*`, `atm_*`, `payment_systems`) las blinda de Prisma Migrate. No quitar.**
- Tras cualquier cambio de schema: `bun run db:diff` vacío. Si no, alinear DB/schema por migración InsForge (no por push).
- **Ownership**: las tablas creadas por Prisma pertenecen a `postgres`; las migraciones corren como `project_admin`. Antes de alterar/dropear una tabla Prisma desde una migración: `ALTER TABLE ... OWNER TO project_admin;` (con `psql "$DATABASE_URL"`). El runner de migraciones **no** puede cambiar ownership (falla con `must be owner of table`): el `ALTER ... OWNER` va aparte con `psql`, la migración solo contiene el DDL.
- Migraciones aplicadas: `canonical-transit`, `fix-atm-fares-pk`, `assistant-chat`, `cms-tables`, `align-assistant-tables`, `drop-legacy-demo-tables`, `profile-avatar`, `better-auth-sessions`, `better-auth-user-columns`, `better-auth-user-defaults`, `better-auth-user-email-unique`.
- Consultas puntuales: `npx -y @insforge/cli db query "SELECT ..."`.
- La tabla `assistant_conversations.title` es `text` (no varchar) y los timestamps del asistente son `timestamptz(6)` a propósito.

## Dataset canónico del buscador

- Fuente: crawl del buscador viejo (`POST https://empresaplana.cat/descargas`, feiners + sábado + domingo) + PDFs oficiales.
- `data/` está **gitignored y es confidencial** (PDFs, exports, dataset). `public/data/transit.json` también queda ignorado (lo genera `bun run demo:data`).
- Artefactos: `data/routes/lines-v3.json` (118 líneas), `trips-v3.json` (**2250 viajes** con paradas y `dayType`), `stops-v2.json` (676 paradas), `data/fares/atm-zones.json` + `atm-fares.json`.
- **Tipos de día**: `feiners` / `dissabtes` / `diumenges` (+ festivos 2026 en `shared/utils/dayType.ts`). Día festivo → horario de domingo.
- Modelo: `id` secuencial interno + `signNumber` (cartel del bus) + `legacyIds` del sistema viejo. L4 (legacy 58/59), L11 (141/142 + 74-77).
- Pendiente: urbanos Cambrils L1-L3, nocturnos NT2-NT5, escolares y temporada (PDFs ya extraídos en `data/sources/extracted-lines/`).

## Buscador (API + UI)

- `GET /api/routes/search?from&to&time&date&type` → SQL JSONB (`stops @> ...`), filtro por `day_type` según `date`, precios ATM por zonas. Sin zona ATM → `price: null` + link.
- Lógica compartida server/cliente: `shared/utils/transit.ts` (el demo estático usa la misma).
- UI: widget BusPlana-style en `/`, resultados en `/rutas-horarios` (anada/tornada, `<details>` con paradas, PDF por línea).

## Deploy — app en InsForge compute (NO Render, NO Cloudflare runtime)

```bash
export PATH="$HOME/.fly/bin:$PATH"   # flyctl requerido (source mode)
npx -y @insforge/cli compute deploy . --name empresaplana --port 3000 --region fra --memory 512 --env-file .env
```

- URL: `https://empresaplana-8929a7b2-3f14-461b-b228-e6f8c8b6573c.fly.dev`
- Plan Free: 1 servicio compute y **máximo 512MB**. Para producción pedir upgrade (paga la empresa).
- Prisma **no corre en Cloudflare Workers** (issues #28657/#29660): runtime = contenedor Node. Cloudflare solo R2 + el demo estático.
- Dockerfile: build con `oven/bun` + runtime `node:22.12-bookworm-slim`. Rotar envs: `compute update <id> --env-set KEY=value`.

## Demo portfolio — Cloudflare Workers Static Assets

- Proyecto Worker `empresaplana-demo`: **`bun run deploy:demo`** = `demo:data` + `demo:build` (`NUXT_PUBLIC_STATIC_DEMO=true`) + `wrangler deploy`.
- Dominio **`empresaplana.senseikatana.com`** gestionado por el propio `wrangler deploy` (crea DNS + certificado; no hay CNAME manual). Respaldo: `https://empresaplana-demo.senseikatanacom.workers.dev`.
- La zona tiene un **challenge de seguridad global** (también afecta `docs.senseikatana.com`); curl/headless reciben 403 `cf-mitigated: challenge`. Si molesta, regla WAF de skip por hostname.
- Dashboard excluido por `nitro.prerender.ignore`; búsqueda 100% cliente sobre `public/data/transit.json`.
- `wrangler.jsonc` es la config del Worker (assets + routes), no de Pages.

## Assets de marca, favicon y PWA

- **No hay fotos del cliente todavía**: `public/img/*.svg` son placeholders de marca (hero, cards, mapa). `AppPicture` intenta `.avif`/`.webp`/`.jpg` y cae al `.svg`; al llegar fotos reales usar los mismos nombres base y ganan solas.
- `AppPicture` recupera el 404 disparado antes de la hidratación con un check en `onMounted` (`complete && naturalWidth === 0`); no quitar.
- Favicons de marca (`public/favicon.svg` simplificado + `favicon.ico` multi-tamaño) declarados en `app/head.link` de `nuxt.config.ts`. `og:image` = `/img/thumbnail.jpg` (1200×630, se regenera desde `thumbnail.svg` con ImageMagick).
- `public/sitemap.xml` estático (9 páginas públicas × 4 locales con hreflang). Si se agregan páginas, regenerarlo. La ruta dinámica `/sitemap.xml` se eliminó: el archivo público gana y también sirve al demo estático.
- PWA "nativa": `public/sw.js` con scope `/dashboard/` (network-first shell, assets/fuentes SWR, nunca intercepta `/api` ni la web pública), registrado por `app/plugins/pwa.client.ts` (se salta en dev). El manifest apunta a `/dashboard/`.

## Auth — Better Auth

Antes: JWT stateless (`nuxt-auth-utils`) en cookie `ep_session`. El logout solo
borraba la cookie y el token seguía válido 7 días. Ahora la sesión es una fila
en `Session` y **se revoca de verdad**.

- **Instancia**: `server/auth.ts`. Adaptador de h3 → Better Auth en
  `server/utils/auth.ts` (`getSessionUser` / `getSessionFromHeaders` /
  `clearSessionUser` / `webHeaders` / `adoptAuthResponse`).
- **Endpoints del panel intactos**: `/api/auth/{login,register,logout,resend-verification}`
  conservan su contrato (401 / 409 `username_exists` / `{ok}`); internamente
  llaman a `auth.api.*`. El handler nativo de Better Auth está en
  `server/api/auth/[...all].ts` (las rutas concretas tienen prioridad).
- **Esquema**: `User` es el modelo de usuario ya existente. `Session`,
  `Account` y `Verification` son tablas nuevas (migración
  `better-auth-sessions`). La contraseña vive en `Account.password`.
- **Gotchas de Better Auth** (todos verificados con la integración real):
  - `advanced.database.generateId` **debe ser `"serial"`, no `false`**: `false`
    hace que el adapter lea `user.id` como *string* y las consultas a
    columnas `Int` revientan con `PrismaClientValidationError`.
  - `auth.api.*( { asResponse: true } )` **no lanza** en errores: devuelve un
    `Response` 4xx. Sin comprobar `response.ok`, un login con contraseña mala
    se registraría como exitoso.
  - `webHeaders()` usa `getRequestHeaders(event)`: `Object.entries()` sobre
    una instancia `Headers` de h3 devuelve `[]` y la cookie se pierde (la
    sesión no se leería nunca).
  - `databaseHooks.user` **no sirve**: colisiona con el `databaseHooks.user`
    del plugin `username`. Las columnas que Better Auth no escribe
    (`passkey`, `fullName`, `phone`) llevan **defaults en la BD**.
- **Contraseña**: `emailAndPassword.password.hash/verify` reutilizan
  `server/utils/passkey.ts`, así que todos los hashes existentes siguen
  sirviendo. El cambio de contraseña (`PATCH /api/account`) escribe en
  `Account`, no en `User.passkey` (ese campo ya no lo lee nadie).
- **Rate limit**: `rateLimit` de Better Auth para `/sign-in|/sign-up`, más el
  `rateLimit()` propio del proyecto en los endpoints del panel.
- **Verificación de email**: se mantiene el flujo propio del proyecto
  (JWT + `server/routes/verify-email` + `/dashboard/pending`).

## Dashboard / intranet

- Layout `app/layouts/dashboard.vue` (sidebar + `UDashboardSearch` + `UDashboardPanel`/`Navbar` + `NotificationsSlideover` + `UserMenu`).
- **Protección en 3 capas** (el middleware de ruta global NO se ejecuta en Nuxt 4.5.2 de este proyecto):
  1. `server/middleware/dashboard-guard.ts` (SSR: sesión + email verificado).
  2. Guard en el layout (capability de `route.meta.capability` → redirige a `/dashboard`).
  3. Endpoints con `requireCapability(...)`; sensibles con `{ requireVerified: true }`.
- `/dashboard` = página de estadísticas (`/api/dashboard/summary`, rol-aware). Sesión con `useSession()`.
- **Perfil con avatar** (`/dashboard/cliente/cuenta`): `bio` (280) + `avatarData`/`avatarMime` (bytes en la DB, sin filesystem efímero). `PUT /api/account/avatar` procesa con **sharp** (auto-rotate, flatten a blanco, 500×500 cover, JPEG; `limitInputPixels` 25 MP + timeout 10s) y valida con **file-type** (≤2 MB, JPG/PNG/WebP); preflight de `Content-Length` y rate-limit. `GET /api/users/[id]/avatar` sirve el binario con ETag/304. La sesión (`/api/me`) expone `hasAvatar`/`avatarVersion` para el `UserMenu` sin fetch extra. Editar perfil/subir avatar exige `profile:edit` + email verificado.




- Registro → sesión inmediata + email de verificación (Resend si `RESEND_API_KEY`; si no, link en el log). Sin verificar solo `/dashboard/pending`.
- Usuarios demo del seed: `cliente` / `trabajador` / `admin`, passkey `12345678`, `emailVerified: true`.

## Asistente IA (chat del dashboard)

- UI `/dashboard/asistente` (`UChatMessages`/`UChatPrompt` + `useChat`); API `server/api/dashboard/assistant/**` con streaming y persistencia en `assistant_conversations`/`assistant_messages` (el mensaje del usuario se guarda al entrar; el del asistente en `onEnd`).
- Modelo: OpenRouter (`OPENROUTER_API_KEY` + `ASSISTANT_MODEL`; default **`openrouter/free`** — el router automático; qwen/gemma suelen estar rate-limited). Sin key → 503 `assistant_not_configured`.
- MCP: seam en `server/utils/mcp.ts` (`MCP_SERVERS` JSON); integración pendiente.

## Releases / Novedades

- Página **interna** `/dashboard/novedades` (staff) con `UChangelogVersions`/`UChangelogVersion` + `AppMarkdown` (comark). Fuente: `CHANGELOG.md`. No va en el navbar público.
- `bun run release:bump --version=x.y.z` inserta `## [x.y.z] - fecha` (sin `[Unreleased]`) y actualiza `package.json`. `release:notes [version]` (default: versión de package.json).
- `.github/workflows/release.yml`: tag `v*` → crea/actualiza la GitHub Release con las notas.

## Seguridad

- `.env` y `opencode.json` (API key InsForge) gitignored; no commitear.
- `public/*_export.json` y `database-structure.png` siguen en el historial de git: evaluar `git filter-repo` si se exige confidencialidad total.
- Rotar credenciales que pasen por chat/diálogos.
- Uploads (avatar): magic bytes con `file-type`, preflight de `content-length` antes de buffear, `sharp` con `limitInputPixels` + timeout, rate-limit en memoria.
- `server/middleware/security-headers.ts`: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, HSTS.
- Cambio de email → `emailVerified = false` + reenvío; el token de verificación se compara contra el email actual del usuario.
- **Login demo**: `NUXT_PUBLIC_DEMO_LOGIN=false` oculta los accesos demo (portfolio: visibles). Las credenciales demo (`cliente`/`trabajador`/`admin` + `12345678`) están en el repo público y en la DB: rotarlas antes de un uso en producción real.
- El SW de la intranet se registra por locale (`/dashboard`, `/es/dashboard`, …) y `UserMenu` purga los cachés `plana-*` al cerrar sesión.

## Gotchas

- El generador Prisma es `prisma-client` (output `generated/prisma`), no `prisma-client-js`.
- `pg-native` tiene stub + alias en Nitro (`server/utils/pg-native-stub.ts`); no quitar.
- `prisma.config.ts` vive en la raíz (Prisma 7 no lo detecta en `prisma/`).
- **Bun**: sin `trustedDependencies` los postinstall de Prisma/esbuild/workerd no corren. `bun install --frozen-lockfile` en el Dockerfile.
- `.dockerignore` excluye `*.md` pero **re-incluye `CHANGELOG.md`** (`!CHANGELOG.md`); sin eso el build de Docker rompe en `/dashboard/novedades`.
- `.dockerignore` debe mantener `data/` excluido (PDFs de 350MB+ en el contexto de build).
- El sitio viejo separa una línea en varios `legacyId` por sentido/variante; el dataset los agrupa por nombre de PDF.
- `public/manifest.webmanifest`: `lang` es `ca` (default real del sitio).
- Nuxt UI toma los colores de `app.config.ts` (`primary: navy`, `secondary: teal`): las escalas `--color-navy-*`/`--color-teal-*` viven en el `@theme` de `main.css`; no renombrar una sin la otra.
- En `UButton` con clases propias, tw-merge descarta el color `text-*` si va antes de `text-button` (font-size custom): poner `text-white`/color al final de la clase.
- `deep-navy` como **texto** se aclara en dark (`main.css`), pero como **fondo/overlay** siempre `primary` (estable en ambos modos).
- `scripts/seed-transit.mjs` es idempotente (upserts) y borra/reinserta los viajes `source='search'`.

## InsForge

Plataforma backend (DB, compute, payments Stripe). Infraestructura → skill `insforge-cli`; SDK de app → skill `insforge`. Docs generales en el AGENTS.md global del usuario.
