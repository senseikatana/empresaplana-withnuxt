# Guía de contribución

## Flujo de trabajo

### 1. Crear rama de feature

```bash
git checkout dev
git pull origin dev
git checkout -b feat/mi-feature
```

### 2. Desarrollar

```bash
# Servidor de desarrollo
bun run dev

# Verificar tipos (solo con el dev APAGADO: ver Checklist)
bun run typecheck

# Linting y formato
bun run check
bun run format
```

### 3. Commitear

Seguir Conventional Commits:

```bash
git add .
git commit -m "feat(component): descripción del cambio"
```

### 4. Merge a dev

```bash
git checkout dev
git merge feat/mi-feature --no-ff -m "Merge branch 'feat/mi-feature' into dev"
git push origin dev
```

### 5. Merge a main (cuando esté listo)

```bash
git checkout main
git merge dev --no-ff -m "Merge branch 'dev' into main"
git push origin main
```

### 6. Release (opcional)

```bash
bun run release:bump --version=1.2.0   # package.json + entrada en CHANGELOG.md
git add package.json CHANGELOG.md
git commit -m "chore(release): bump version to 1.2.0"
git tag v1.2.0
git push origin dev v1.2.0
# El workflow release.yml crea/actualiza la GitHub Release con las notas del CHANGELOG
```

## Convenciones de código

### TypeScript

- Usar tipos explícitos en props de componentes.
- Los tipos compartidos van junto al módulo que los usa, o en `shared/` si los
  consumen app y servidor.
- Auto-imports de Nuxt para composables/utils; `~/` apunta a `app/`.

### Nuxt / Vue

- Componentes Vue con `<script setup lang="ts">`.
- Los datos estáticos van en `app/data/` como JSON/TS.
- Los tokens de diseño van en `app/assets/css/main.css` (nunca `bg-[#...]` ad-hoc).

### CSS

- Usar clases de Tailwind del sistema de diseño.
- Los tokens de color, espaciado y tipografía están en `main.css` (`@theme`).
- No hardcodear colores; usar las variables CSS del `@theme`.

### i18n

- Todo el texto visible va en los diccionarios `i18n/locales/*.json`.
- Añadir claves en los 3 idiomas (CA, ES, EN).
- Usar `useI18n()` y `useLocalePath()` en las páginas.

## Estructura de commits

```
tipo(alcance): descripción

[opcional cuerpo]

[opcional pie]
```

- **tipo:** `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`, `perf`
- **alcance:** componente, módulo o área afectada
- ** descripción:** imperativo, sin punto final, máx 72 caracteres

Ejemplos:
```
feat(search): añadir filtro por franja horaria
fix(accordion): corregir animación de apertura
chore(deps): actualizar Tailwind a v4.3.3
docs(wiki): documentar sistema de diseño
```

## Pull Requests

Si se usa el flujo de PRs:

1. Crear PR de `feat/*` a `dev`.
2. Describir los cambios en la descripción.
3. Esperar review (si aplica).
4. Merge con `--no-ff` para preservar el historial.

## Checklist antes de merge

- [ ] `bun run check` pasa linting y formato
- [ ] `bun run typecheck` no muestra errores (con el dev server **apagado**:
      `typecheck`/`build`/`bun install` corren `nuxt prepare` y rompen el dev
      server en silencio — 503/500 sin error en el log)
- [ ] `bun run build` compila sin errores (igual: sin dev vivo)
- [ ] Los textos están en los 3 diccionarios i18n (CA, ES, EN)
- [ ] Los tokens de diseño se usan correctamente (no colores hardcodeados)
