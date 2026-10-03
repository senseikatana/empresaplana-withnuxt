# Despliegue

## App real (InsForge compute, primario)

Contenedor Node (Docker: build con `oven/bun`, runtime `node:22.12-bookworm-slim`):

```bash
export PATH="$HOME/.fly/bin:$PATH"   # flyctl requerido (source mode)
npx -y @insforge/cli compute deploy . --name empresaplana --port 3000 \
  --region fra --memory 512 --env-file .env
```

- Health check: `/api/health` → `{"ok":true,"db":"up"}`.
- Secretos: envs del servicio (`DATABASE_URL`, `AUTH_SECRET`, `OPENROUTER_API_KEY`,
  `RESEND_API_KEY`…). Rotar uno: `npx -y @insforge/cli compute update <service-id> --env-set KEY=value`.
- **`APP_URL` es obligatoria en producción** (ej. `--env-set APP_URL=https://empresaplana.cat`):
  Better Auth la usa como `baseURL` **y** como `trustedOrigins`; si no está definida cae a
  `http://localhost:3000` y entonces (1) el `sign-out` desde el navegador responde
  **403 `MISSING_OR_NULL_ORIGIN`** —nadie podría cerrar sesión— y (2) los links de
  verificación de email saldrían apuntando a localhost.
- Plan Free: 1 servicio y **máximo 512 MB por máquina**. Para producción pedir upgrade.

Detalle completo: [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md).

## Demo portfolio (Cloudflare Workers Static Assets)

```bash
bun run deploy:demo   # demo:data + demo:build (NUXT_PUBLIC_STATIC_DEMO=true) + wrangler deploy
```

- `wrangler.jsonc` publica `.output/public` con custom domain
  `empresaplana.senseikatana.com` (el deploy crea DNS + certificado solo).
- El dashboard no se incluye en el demo (`nitro.prerender.ignore`): sin servidor no hay auth.
- Búsqueda 100 % cliente sobre el dataset (misma lógica que la API, `shared/utils/transit.ts`).

## Histórico

- **Render**: descartado (build command incorrecto). `render.yaml` queda como legado.
- **Cloudflare Pages como runtime**: bloqueado — Prisma 7 no corre en Workers
  (prisma/prisma#28657, `Wasm code generation disallowed by embedder`), sin
  compat flag disponible. El demo sí va en Workers porque es 100 % estático
  (sin Prisma en runtime). Volver a este target cuando Prisma publique un build
  compatible con Workers.

## CI

- `.github/workflows/release.yml` — al pushear un tag `v*`, extrae las notas de
  `CHANGELOG.md` (`scripts/release-notes.mjs`) y crea/actualiza la GitHub Release.
  **No** hace bump ni commit: eso es manual (`bun run release:bump`).
- El DDL **no** corre en runtime: las migraciones son InsForge
  (`npx -y @insforge/cli db migrations up --all`), no Prisma.
