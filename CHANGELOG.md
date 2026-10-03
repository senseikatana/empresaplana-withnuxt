# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] - 2026-10-03

### Changed
- docs(.env.example): update documentation in 82 files

## [1.3.2] - 2026-09-29

### Changed
- **bun.lock**: update dependencies or build settings in bun.lock

## [1.3.1] - 2026-09-28

### Changed
- docs(README.md): update documentation in README.md

## [1.2.0] - 2026-09-28

### Added
- Assets de marca: 9 placeholders SVG en `public/img/`, `thumbnail.jpg` (1200×630) para OG y favicon propio (`favicon.svg` + `favicon.ico` multi-tamaño) declarado en `nuxt.config.ts`.
- SEO: `public/sitemap.xml` estático con hreflang (9 páginas públicas × 4 idiomas y `x-default`).
- Enlace **Intranet** en la cabecera pública (escritorio y móvil) y en el pie, hacia `/dashboard`, traducido en ca/es/en/fr.
- Perfil de usuario con **biografía** (280 caracteres) y **avatar** almacenado en la DB (migración InsForge `profile-avatar`: `bio`, `avatarData`, `avatarMime`), con vista previa y modal de confirmación.
- Subida de avatar: `PUT /api/account/avatar` (sharp: auto-rotate, 500×500, JPEG; file-type: JPG/PNG/WebP ≤ 2 MB) y `GET /api/users/[id]/avatar` con ETag.
- PWA de la intranet: `public/sw.js` reescrito con scope `/dashboard/` y registro mediante `app/plugins/pwa.client.ts`.

### Changed
- Dark mode: fondos y overlays de marca pasan de `deep-navy` a `primary` y `color-scheme` nativo para los controles del sistema.
- Sesión (`/api/me`, `/api/account`): expone `hasAvatar` y `avatarVersion`; el `UserMenu` muestra el avatar real.
- Imágenes placeholder alojadas en Google sustituidas por `AppPicture` y assets de marca (oficinas y servicios discrecionales); alts traducidos en ca/es/en/fr.
- `manifest.webmanifest`: `lang` corregido a `ca` (default real del sitio).

### Fixed
- `UButton` con clases propias: el color de texto se coloca al final para que tw-merge no lo descarte (`CookieBanner`, formularios de presupuesto).
- `AppPicture`: recuperación del 404 disparado antes de la hidratación y fallback en cascada foto → SVG → degradado.
- Cerrar el modal de avatar con ESC o clic fuera limpia el selector y revoca el `blob:` (antes no se podía repetir con el mismo archivo).

### Security
- Subida de avatar endurecida: preflight de `Content-Length` (rechaza cuerpos grandes antes de buffear), rate-limit, `sharp` con `limitInputPixels` (25 MP) y timeout, errores 422 controlados y aplanado a blanco de PNG con transparencia.
- Perfil: edición y avatar exigen `profile:edit` + email verificado; cambiar el correo resetea `emailVerified` y reenvía la verificación; el token de verificación se valida contra el email actual.
- Cabeceras de seguridad (`nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, HSTS) y purga de los cachés `plana-*` del service worker al cerrar sesión.
- Accesos demo del login detrás de `NUXT_PUBLIC_DEMO_LOGIN`; eliminada la ruta dinámica `/sitemap.xml` duplicada.

## [1.1.0] - 2026-09-13

### Added
- Migración a **Nuxt 4** (Nitro 2, presets `node_server`): app full-stack SSR con Nuxt UI v4, Tailwind v4 y estructura `app/`, `server/`, `i18n/`.
- API REST + CMS con **Prisma 7** sobre Postgres: modelos y seed de datos reales de rutas, buses, horarios, paradas y conductores; endpoints de presupuestos, favoritas, chat, oficinas y búsqueda de rutas.
- Panel dashboard por rol (cliente/trabajador/admin) con navegación por capabilities (`hasCapability()`).
- Chat WebSocket entre clientes y personal.
- SEO técnico: meta/OG traducidos, hreflang, `robots.txt` y `sitemap.xml`.
- Idioma francés (`fr`) en los diccionarios i18n (ca/es/en/fr).
- Login demo y middleware global de auth + guards de ruta por capability.
- Deploy en **InsForge** (Prisma Postgres + Compute + Dockerfile) y documentación (`docs/DEPLOYMENT.md`, `docs/INSFORGE.md`).

### Changed
- Eliminado el legacy **Astro** (`src/`, Keystatic y dependencias).
- Gestor de paquetes **bun → pnpm** (pnpm-lock, workspaces, workflows CI).
- Auth migrada a **JWT HS256 (jose)** en cookie `ep_session` (7 días) con passkeys hasheadas con **scrypt**.
- Autorización bajo **ACL estilo WordPress** (roles → capabilities) en endpoints y UI, sin checks de rol inline.
- Hardening de la API: **rate-limit** por IP (ventana fija en memoria) y sesión obligatoria en endpoints sensibles.

### Fixed
- CI: `prisma generate` en postinstall con `DATABASE_URL` dummy y `nuxt prepare` previo.
- Endpoints sensibles (presupuestos, favoritas, chat, cuenta) que no exigían sesión autenticada.

---

## [0.1.0] - 2026-09-03

### Added
- Version automation: `scripts/bump-version.mjs` and `.github/workflows/release.yml`.
- Database boundary stubs pending a custom ORM: `src/db/schema.ts`, plus stubbed `src/lib/db.ts`, `src/lib/search.ts`, and `api/auth/*` / `api/users/*` routes.
- Build glue to make the site build and serve: `src/layouts/BaseLayout.astro`, `src/data/towns.ts`, and `src/data/index.ts`.

### Changed
- Converted the `BusTrackingPanel` React island into a vanilla-JS Astro component (`BusTrackingPanel.astro`).
- Wired the build: `astro.config.mjs` (server output, Node adapter, Tailwind, `@/` alias) and cleaned `tsconfig.json` and `.gitignore`.

### Removed
- Database tooling: deleted `src/scripts/` (Turso seed/sync/export scripts) and the 10 scraped markdown files in `src/config/`.
- Dead code: `src/interfaces/types.ts` and `src/interfaces/data.ts`.
- React dependency, dropped with the bus-tracking island conversion.

### Fixed
- Fixed dev and build scripts so the project builds and serves.

---

## [1.0.0] - 2026-07-26

### Added
- Initial release of the project.
- Complete folder structure and baseline configuration.
- Comprehensive `.gitignore`, `LICENSE`, and documentation files.
- Responsive design layout and UI components.

### Changed
- Standardized project configurations and clean commit workflow.

### Fixed
- Resolved nested repository issues and gitlink submodule conflicts.
