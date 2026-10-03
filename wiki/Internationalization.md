# Internacionalización (i18n)

## Visión general

El sitio soporta **3 idiomas**: catalán (CA), español (ES) y inglés (EN). El idioma por defecto es **catalán**.

> **Nota:** el francés (FR) se eliminó del proyecto (locale, `fr.json`, selector
> de idioma y sitemap). `/fr/*` devuelve **404 a propósito** — no es un fallo.

## Arquitectura

```
i18n/locales/
├── ca.json          # Diccionario catalán
├── es.json          # Diccionario español
└── en.json          # Diccionario inglés
```

Motor: `@nuxtjs/i18n` con estrategia `prefix_except_default` (ca en raíz, `/es`
y `/en` con prefijo). La config vive en `nuxt.config.ts` (`restructureDir:
"i18n"`, `langDir: "locales"`, `baseUrl: "https://empresaplana.cat"`).

`detectBrowserLanguage` está **desactivado** a propósito: sin eso la cookie
`i18n_redirected` redirige al visitante a `/es`; el idioma solo se cambia con
el selector de la cabecera.

## Uso en páginas

```vue
<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();
</script>

<template>
  <h1>{{ t("home.title") }}</h1>
  <NuxtLink :to="localePath('/rutas-horarios')">{{ t("routes.title") }}</NuxtLink>
</template>
```

- `useI18n().t(clave)` — accede a una clave anidada con notación de puntos
  (`"routes.search.originLabel"`). Si la clave no existe devuelve la clave.
- `useLocalePath()` — convierte una ruta interna en la ruta del locale actual
  (`/rutas-horarios` → `/es/rutas-horarios` en ES).
- `useLocaleHead({ dir: true, seo: true })` en `app/app.vue` — `hreflang`,
  `dir` y amigos en el `<head>` (más el `og:locale` mapeado `ca`/`es`/`en`).

## Cambio de idioma

El selector vive en la cabecera (`app/components/SiteHeader.vue`): itera
`(["ca", "es", "en"] as const)` y usa `useSwitchLocalePath()` para obtener el
enlace al mismo contenido en otro locale (mantiene la ruta actual).

```vue
<script setup lang="ts">
const { locale, t } = useI18n();
const switchLocalePath = useSwitchLocalePath();

const locales = computed(() =>
  (["ca", "es", "en"] as const).map((code) => ({
    code,
    label: t(`common.lang.${code}`),
    href: switchLocalePath(code),
  })),
);
</script>
```

No hay query param `?lang=`: las URLs llevan el idioma en el prefijo de ruta.

## Estructura del diccionario

Los diccionarios tienen la misma estructura en los 3 idiomas (911 claves por
archivo). Ejemplo de claves principales:

```
common.brand                    → "Empresa Plana"
common.nav.services             → "Serveis"
common.lang                     → { ca: "CA", es: "ES", en: "EN" }
common.phone                    → "+34 977 553 680"
home.title                      → "Empresa Plana - Pantalles"
homeVariant1.title              → "Empresa Plana - Homepage"
routes.title                    → "Descàrregues i Horaris - Empresa Plana"
routes.search.originLabel       → "Localitat d'origen"
routes.results.directTitle      → "Rutes directes"
busTracking.title               → "Ha passat el teu autobús?"
busTracking.actions.passed      → "Ha passat"
discretionary.title             → "Serveis Discrecionals - Empresa Plana"
```

## Añadir un nuevo idioma

1. Crear `i18n/locales/xx.json` copiando `ca.json` como plantilla.
2. Traducir todas las claves manteniendo la estructura.
3. Registrar el locale en el array `i18n.locales` de `nuxt.config.ts`.
4. Añadirlo a la lista `["ca","es","en"]` del selector en
   `app/components/SiteHeader.vue` y la clave `common.lang.xx` en los
   diccionarios existentes.
5. Añadir el mapeo `og:locale` en `app/app.vue` y, si el locale tendrá panel,
   sus rutas `/xx/dashboard` en `nitro.prerender.ignore` (demo estática).
6. Regenerar `public/sitemap.xml` (9 páginas × locales, con `hreflang`).
7. Verificar que `useI18n()` y `useLocalePath()` funcionan con el nuevo locale.

## Añadir una nueva clave

1. Añadir la clave en los 3 archivos JSON (`ca.json`, `es.json`, `en.json`).
2. Usar la clave en el componente con `t("seccion.clave")`.
3. Verificar que la clave existe en los 3 idiomas (si falta, `t()` devuelve la clave como texto).

## Convenciones

- Las claves usan **camelCase** en todos los niveles (no hay claves snake_case).
- Los textos largos (políticas legales, descripciones de servicios) están en el diccionario, no hardcodeados.
- Los números de teléfono y URLs van en el diccionario para poder localizarlos.
- Los componentes usan `useI18n()` internamente (p. ej. `BusTrackingPanel.vue`
  con las claves `busTracking.*`); no reciben el diccionario como prop.
