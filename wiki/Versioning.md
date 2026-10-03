# Versionado

## Sistema de versiones

El proyecto usa **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH`.

| Componente | Descripción |
|-----------|-------------|
| `package.json` | Campo `"version"` — fuente de verdad |
| `CHANGELOG.md` | Registro de cambios por versión |
| `scripts/bump-version.mjs` | Script que sincroniza ambos (`bun run release:bump`) |
| `.github/workflows/release.yml` | Workflow que, en cada tag `v*`, crea/actualiza la GitHub Release con las notas del CHANGELOG |

## Flujo de versionado

### Manual

```bash
# 1. Bump: actualiza package.json y añade la sección al CHANGELOG
bun run release:bump --version=1.2.0

# 2. Escribir las notas bajo "## [1.2.0]" y commitear
git add package.json CHANGELOG.md
git commit -m "chore(release): bump version to 1.2.0"

# 3. Tag y push (dispara el workflow de releases)
git tag v1.2.0
git push && git push --tags
```

### Release automática (tras el bump)

1. Haz push de un tag `v*` al repositorio.
2. El workflow `.github/workflows/release.yml` se ejecuta automáticamente:
   - Extrae la sección del tag de `CHANGELOG.md` (`scripts/release-notes.mjs`).
   - Crea o actualiza la GitHub Release con esas notas.
   - **No** toca `package.json` ni `CHANGELOG.md`: el bump es manual (arriba).

```bash
# Crear y push un tag para disparar el workflow
git tag v1.2.0
git push origin v1.2.0
```

## Script `bump-version.mjs`

### Uso

```bash
# Con versión explícita (recomendado)
bun run release:bump --version=1.2.0

# Fallback: usa el último tag v* del repo (si no hay tag ni arg, falla)
bun run release:bump
```

### Qué hace

1. Lee la versión de `--version=` o del último tag `v*` en git.
2. Valida que sea SemVer válido (`x.y.z` o `x.y.z-prerelease`).
3. Actualiza `"version"` en `package.json` (preservando formato).
4. Inserta una sección nueva `## [x.y.z] - YYYY-MM-DD` (con `### Added /
   Changed / Fixed` vacíos) justo después de la cabecera de `CHANGELOG.md`.
   **No existe una sección `## [Unreleased]`**: las notas se escriben
   directamente bajo la versión nueva.

### Ejemplo de CHANGELOG

`bun run release:bump --version=1.2.0` inserta al principio (tras `---`):

```markdown
## [1.2.0] - 2026-09-03

### Added

### Changed

### Fixed
```

Si la versión ya existe en el CHANGELOG no la duplica (avisa y sale).
Luego se rellenan las notas y se hace el tag.

## Convenciones de commits

El proyecto sigue **Conventional Commits**:

| Prefijo | Uso |
|---------|-----|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de bug |
| `chore:` | Mantenimiento (deps, config, CI) |
| `docs:` | Documentación |
| `refactor:` | Refactorización sin cambio de comportamiento |
| `style:` | Formato, espaciado, etc. |
| `test:` | Tests |
| `perf:` | Mejora de rendimiento |

Ejemplos:
```
feat(deploy): publicar la app en InsForge compute
fix(search): corregir búsqueda de rutas con acentos
chore(deps): actualizar Nuxt a 4.5.2
docs(wiki): añadir documentación de componentes
```

## Ramas

| Rama | Propósito |
|------|-----------|
| `main` | Producción — rama por defecto en GitHub |
| `dev` | Desarrollo — ramas feature se mergean aquí primero |
| `feat/*` | Features — ramas de trabajo para nuevas funcionalidades |

### Flujo de ramas

```
feat/mi-feature → dev → main
```

1. Crear rama `feat/mi-feature` desde `dev`.
2. Desarrollar y commitear.
3. Merge a `dev` (PR o merge directo).
4. Merge a `main` cuando esté listo para producción.
5. Crear tag `v*` para disparar el release.
