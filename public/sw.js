/* Empresa Plana — service worker de la intranet (PWA, "app nativa").
 *
 * Ámbito: /dashboard/ (y su versión con prefijo de idioma /es|en/dashboard).
 * La web pública y /api nunca se interceptan.
 *
 * Estrategias:
 *  - Navegación del dashboard: network-first con fallback a caché (uso offline).
 *  - Assets de build e imágenes propias (/_nuxt/, /img/, /app-icons/):
 *    cache-first con revalidación en segundo plano.
 *  - Fuentes de Google: stale-while-revalidate.
 */
const VERSION = "v3";
const SHELL_CACHE = `plana-shell-${VERSION}`;
const ASSET_CACHE = `plana-assets-${VERSION}`;
const FONT_CACHE = `plana-fonts-${VERSION}`;
const CACHES = [SHELL_CACHE, ASSET_CACHE, FONT_CACHE];

const PRECACHE = ["/manifest.webmanifest", "/app-icons/icon-192.png", "/app-icons/icon-512.png"];

const DASHBOARD_RE = /^\/(?:(?:es|en)\/)?dashboard(?:\/|$)/;

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(SHELL_CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.catch(() => {})
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key.startsWith("plana-") && !CACHES.includes(key)).map((key) => caches.delete(key))))
			.then(() => self.clients.claim()),
	);
});

async function networkFirst(request, cacheName) {
	const cache = await caches.open(cacheName);
	const url = new URL(request.url);
	// Raíz del dashboard del locale correspondiente: /dashboard/ o /es/dashboard/
	const shellPath = url.pathname.replace(/\/dashboard(?:\/.*)?$/, "/dashboard/");
	const cached = (await cache.match(request)) || (await cache.match(shellPath));

	try {
		const response = await fetch(request);
		if (response && response.ok && response.type === "basic") {
			cache.put(request, response.clone());
			// Guarda la última navegación como shell offline de ese locale.
			if (request.mode === "navigate") cache.put(shellPath, response.clone());
		}
		return response;
	} catch {
		return cached ?? Response.error();
	}
}

async function staleWhileRevalidate(request, cacheName) {
	const cache = await caches.open(cacheName);
	const cached = await cache.match(request);
	const network = fetch(request)
		.then((response) => {
			if (response && response.ok) cache.put(request, response.clone());
			return response;
		})
		.catch(() => cached);
	return cached ?? network;
}

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;
	const url = new URL(request.url);

	if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
		event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
		return;
	}

	if (url.origin !== self.location.origin) return;

	// Datos personales: siempre red.
	if (url.pathname.startsWith("/api/")) return;

	if (url.pathname.startsWith("/_nuxt/") || url.pathname.startsWith("/img/") || url.pathname.startsWith("/app-icons/")) {
		event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
		return;
	}

	if (request.mode === "navigate" && DASHBOARD_RE.test(url.pathname)) {
		event.respondWith(networkFirst(request, SHELL_CACHE));
	}
});
