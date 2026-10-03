import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
	compatibilityDate: "2026-09-13",
	devtools: { enabled: true },
	modules: [
		"@nuxt/ui",
		"@nuxt/fonts",
		"@nuxtjs/i18n",
		"@nuxtjs/color-mode",
		"@comark/nuxt",
		// La sesión ya no la gestiona `nuxt-auth-utils`: es Better Auth
		// (server/auth.ts) con sesiones en la tabla `Session`.
	],
	runtimeConfig: {
		public: {
			staticDemo: process.env.NUXT_PUBLIC_STATIC_DEMO === "true",
			// Origen de la app con servidor (insforge compute). El demo estático
			// no tiene API ni sesión, así que sus enlaces de intranet apuntan
			// aquí. Sin este valor el enlace se oculta en vez de dar un 404.
			appUrl: process.env.NUXT_PUBLIC_APP_URL ?? "",
			// Accesos demo del login de la intranet. Por defecto visibles
			// (portfolio/demo); poner NUXT_PUBLIC_DEMO_LOGIN=false en producción
			// real para ocultarlos.
			demoLogin: process.env.NUXT_PUBLIC_DEMO_LOGIN !== "false",
		},
	},
	colorMode: {
		preference: "system",
		fallback: "light",
		classSuffix: "",
		disableTransition: true,
	},
	css: ["~/assets/css/main.css"],
	vite: {
		server: {
			// Acepta los tunnels de cloudflared (subdominios *.trycloudflare.com
			// aleatorios en cada arranque). Sin esto Vite bloquea el Host header.
			allowedHosts: [".trycloudflare.com"],
		},
	},
	fonts: {
		families: [{ name: "Geist", provider: "google" }],
	},
	app: {
		head: {
			meta: [{ name: "theme-color", content: "#013990" }],
			link: [
				// Preconnect a los origenes de fuentes/imagenes remotas
				{ rel: "preconnect", href: "https://fonts.googleapis.com" },
				{
					rel: "preconnect",
					href: "https://fonts.gstatic.com",
					crossorigin: "",
				},
				{ rel: "preconnect", href: "https://lh3.googleusercontent.com" },
				{
					rel: "stylesheet",
					href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap",
				},
				{ rel: "manifest", href: "/manifest.webmanifest" },
				{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
				{
					rel: "icon",
					type: "image/x-icon",
					href: "/favicon.ico",
					sizes: "any",
				},
				{
					rel: "icon",
					type: "image/png",
					href: "/app-icons/icon-192.png",
					sizes: "192x192",
				},
				{ rel: "apple-touch-icon", href: "/app-icons/apple-touch-icon.png" },
			],
		},
	},
	i18n: {
		restructureDir: "i18n",
		langDir: "locales",
		defaultLocale: "ca",
		strategy: "prefix_except_default",
		// Sin esto la detección del navegador escribe la cookie
		// `i18n_redirected` y manda a /es aunque el visitante vuelva a "/".
		// El idioma se cambia solo con el selector del header.
		detectBrowserLanguage: false,
		baseUrl: "https://empresaplana.cat",
		locales: [
			{ code: "ca", language: "ca", name: "CA", file: "ca.json" },
			{ code: "es", language: "es", name: "ES", file: "es.json" },
			{ code: "en", language: "en", name: "EN", file: "en.json" },
		],
	},
	nitro: {
		// Default = Node (insforge compute). Static demo build uses the static preset.
		preset:
			process.env.NITRO_PRESET ||
			(process.env.NUXT_PUBLIC_STATIC_DEMO === "true"
				? "static"
				: "node_server"),
		experimental: {
			websocket: true,
		},
		...(process.env.NUXT_PUBLIC_STATIC_DEMO === "true"
			? {
					prerender: {
						ignore: [
							"/dashboard",
							"/dashboard/**",
							"/es/dashboard",
							"/es/dashboard/**",
							"/en/dashboard",
							"/en/dashboard/**",
							"/fr/dashboard",
							"/fr/dashboard/**",
						],
					},
				}
			: {}),
		alias: {
			"pg-native": fileURLToPath(
				new URL("./server/utils/pg-native-stub.ts", import.meta.url),
			),
		},
	},
	typescript: {
		strict: true,
		typeCheck: false,
	},
});
