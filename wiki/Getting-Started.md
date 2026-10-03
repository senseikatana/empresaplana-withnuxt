# Guía de inicio rápido

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|----------------|
| **bun** | 1.4 (`packageManager: bun@1.4.2`) |
| **Node.js** | 22.12+ (runtime de producción) |
| Acceso al proyecto InsForge | `DATABASE_URL` en `.env` — **no hay DB local** |

## Instalación

```bash
# 1. Clonar (rama de desarrollo: dev)
git clone git@github.com:senseikatana/empresaplana-withnuxt.git
cd empresaplana-withnuxt
git checkout dev

# 2. Dependencias (postinstall: nuxt prepare + prisma generate)
bun install

# 3. Variables de entorno
cp .env.example .env   # DATABASE_URL + AUTH_SECRET (APP_URL en producción)

# 4. Cliente Prisma y seed demo (idempotente)
bun run db:generate
bun run db:seed        # usuarios demo: cliente / trabajador / admin (12345678)
```

La DB es **InsForge Postgres (remota)**: `DATABASE_URL` viene del proyecto
`empresaplana.cat`. No hace falta Docker ni Postgres local.

> Los cambios de schema **no** pasan por Prisma (`db:push`/`db:migrate` son
> stubs que fallan a propósito): van por migraciones InsForge
> (`npx -y @insforge/cli db migrations new <name>` → editar `migrations/*.sql`
> → `npx -y @insforge/cli db migrations up --all` → `bun run db:diff` vacío).

## Desarrollo local

```bash
bun run dev   # http://localhost:3000
```

> ⚠️ Con el dev server corriendo, **no** ejecutes `bun run typecheck`,
> `bun run build` ni `bun install`: los tres corren `nuxt prepare` y dejan el
> dev server devolviendo 503/500 en todas las rutas **sin escribir ningún
> error en su log**. `bun run check` (Biome) sí es seguro. Si pasa, reinicia
> el dev (no hace falta borrar `.nuxt`).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `bun run dev` | Dev server (3000) |
| `bun run build:node` | Build producción Node → `.output/` |
| `bun run preview` | Sirve el build |
| `bun run typecheck` | `nuxi typecheck` (sin dev vivo; `vue-tsc` fijado a 3.3.11) |
| `bun run db:generate` / `db:diff` / `db:seed` / `db:studio` | Prisma (cliente) |
| `bun run db:create-user` | Crear usuario (`<user> <pass> <role>`) |
| `bun run check` / `lint` / `format` | Biome |
| `bun run demo:data` / `demo:build` / `deploy:demo` | Demo estática en Cloudflare Workers |
| `bun run release:bump --version=x.y.z` | Bump de versión + entrada en CHANGELOG |

## Estructura del proyecto

```
empresaplana-withnuxt/
├── app/               # Nuxt srcDir: pages, components, layouts, middleware, lib/
├── server/            # Nitro API: server/api/*, server/utils/* (auth, prisma, passkey)
├── i18n/locales/      # diccionarios ca/es/en (contenido real)
├── prisma/            # schema + seed + seed-data/
├── generated/prisma/  # client generado (no editar)
├── migrations/        # migraciones InsForge (DDL de la BD)
├── render.yaml        # blueprint Render (legado, descartado)
├── wrangler.jsonc     # config Cloudflare Workers (demo estática)
├── nuxt.config.ts     # config Nuxt
└── DESIGN.md          # tokens de diseño (fuente de verdad)
```

## Solución de problemas

### El servidor no arranca
```bash
bun --version
rm -rf node_modules .nuxt bun-lock.yaml
bun install
bun run nuxt:prepare   # solo con el dev APAGADO
```

### La DB no conecta
```bash
curl http://localhost:3000/api/health   # debe devolver {"ok":true,"db":"up"}
```
Verificar que `DATABASE_URL` de `.env` apunta al proyecto InsForge y que hay red
hacia `*.eu-central.database.insforge.app`.
