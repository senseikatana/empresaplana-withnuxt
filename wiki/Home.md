# Empresa Plana — Wiki

Bienvenido a la wiki del proyecto **Empresa Plana Website**, la web de transporte público de viajeros por carretera de la Costa Daurada y el Camp de Tarragona.

## Índice

| Página | Descripción |
|--------|-------------|
| [Inicio](Home.md) | Esta página |
| [Guía de inicio rápido](Getting-Started.md) | Instalación, desarrollo local y primeros pasos |
| [Arquitectura del proyecto](Architecture.md) | Estructura de carpetas, stack tecnológico y decisiones de diseño |
| [Sistema de diseño](Design-System.md) | Tokens de color, tipografía, espaciado y componentes visuales |
| [Internacionalización (i18n)](Internationalization.md) | Sistema de idiomas CA/ES/EN y cómo añadir traducciones |
| [Componentes](Components.md) | Documento histórico: componentes Astro del sitio legacy |
| [Páginas](Pages.md) | Documento histórico: mapa de rutas del sitio Astro |
| [Despliegue](Deployment.md) | InsForge compute (app) y Cloudflare Workers (demo) |
| [Versionado](Versioning.md) | Bump de versión, CHANGELOG y releases automáticos |
| [Guía de contribución](Contributing.md) | Convenciones de commits, ramas y flujo de trabajo |
| [Contenido del sitio antiguo](Legacy-Content.md) | Datos extraídos del sitio web original (Firecrawl) |

## Stack tecnológico

- **Framework:** Nuxt 4 + Nitro 2 (SSR `node_server`)
- **UI:** Nuxt UI v4 + Tailwind CSS v4 + tokens de diseño personalizados
- **Tipografía:** Geist (via `@nuxt/fonts`) + Material Symbols
- **Paquete:** bun
- **Linting/Formato:** Biome
- **Auth:** Better Auth (sesiones en BD)
- **Internacionalización:** CA / ES / EN (911 claves por diccionario)
- **Despliegue:** InsForge compute (app) → Cloudflare Workers (demo estática)

## Enlaces rápidos

- **Repositorio:** [github.com/senseikatana/empresaplana-withnuxt](https://github.com/senseikatana/empresaplana-withnuxt)
- **Web original:** [empresaplana.cat](https://www.empresaplana.cat)
- **Changelog:** [CHANGELOG.md](../CHANGELOG.md)
