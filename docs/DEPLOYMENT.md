# Deployment — Empresa Plana Website

## Visión general

El sitio corre en **Nuxt 4** (SSR, Nitro preset `node_server`). Dos entornos:

| Concepto | Valor |
|---|---|
| App (producción) | **InsForge Compute** — contenedor Node (Docker: build con Bun, runtime Node) |
| Framework | Nuxt 4 + Nitro 2, preset `node_server` |
| Build | `bun run build:node` (`NITRO_PRESET=node_server`) |
| Start | `node .output/server/index.mjs` |
| Health check | `GET /api/health` → `{"ok":true,"db":"up"}` |
| DB | InsForge Postgres (eu-central) — **el DDL vive en migraciones InsForge** |
| Demo (portfolio) | **Cloudflare Workers Static Assets** — `wrangler deploy`, dominio custom |

## InsForge Compute (app real)

- Endpoint: <https://empresaplana-8929a7b2-3f14-461b-b228-e6f8c8b6573c.fly.dev>
- Deploy (source mode; requiere `flyctl` en PATH):

```bash
export PATH="$HOME/.fly/bin:$PATH"
npx -y @insforge/cli compute deploy . --name empresaplana --port 3000 \
  --region fra --memory 512 --env-file .env
```

- Plan Free: 1 servicio y **máximo 512 MB por máquina**. Para producción pedir upgrade.
- Envs del servicio: las de `.env` (`DATABASE_URL`, `AUTH_SECRET`, `OPENROUTER_API_KEY`,
  `RESEND_API_KEY`…). Rotar una sola: `npx -y @insforge/cli compute update <service-id> --env-set KEY=value`.
- Región `fra` a propósito: la DB está en eu-central (latencia).
- **`APP_URL` es obligatoria en producción** (ej. `--env-set APP_URL=https://empresaplana.cat`).
  Better Auth la usa como `baseURL` **y** como `trustedOrigins`: si no está definida cae a
  `http://localhost:3000` y entonces (1) el `sign-out` desde el navegador responde
  **403 `MISSING_OR_NULL_ORIGIN`** —nadie podría cerrar sesión— y (2) los links de
  verificación de email saldrían apuntando a localhost.

## Demo portfolio (Cloudflare Workers Static Assets)

- `bun run deploy:demo` → `demo:data` (exporta `public/data/transit.json`) + `demo:build`
  (`NUXT_PUBLIC_STATIC_DEMO=true nuxt generate`) + `wrangler deploy`.
- `wrangler.jsonc`: assets `.output/public` + custom domain
  `empresaplana.senseikatana.com` (el deploy crea DNS + certificado solo).
- El dashboard no se incluye en el demo (`nitro.prerender.ignore`): sin servidor no hay auth.
- Búsqueda 100 % cliente sobre el dataset (misma lógica que la API, `shared/utils/transit.ts`).
- Nota: la zona tiene un challenge de seguridad global que también afecta a
  `docs.senseikatana.com`; si molesta para la demo, crear una regla WAF que lo salte
  para el hostname.

## Desarrollo local

```bash
bun run dev   # http://localhost:3000 — DB InsForge (DATABASE_URL del .env)
```

## Histórico

- **Render**: descartado (servicio manual con build command incorrecto). `render.yaml` es legado.
- **Cloudflare Pages como runtime**: descartado — Prisma 7 no corre en Workers
  (prisma/prisma#28657, `Wasm code generation disallowed by embedder`). El demo
  sí va en Workers porque es 100 % estático (sin Prisma en runtime).
