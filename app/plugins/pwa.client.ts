export default defineNuxtPlugin(() => {
	if (!("serviceWorker" in navigator) || import.meta.dev) return;

	// El dashboard existe en todos los locales (prefix_except_default):
	// /dashboard, /es/dashboard, /en/dashboard, /fr/dashboard.
	const match = window.location.pathname.match(/^\/(es|en)(?=\/|$)/);
	const prefix = match ? `/${match[1]}` : "";

	navigator.serviceWorker
		.register("/sw.js", {
			scope: `${prefix}/dashboard`,
			updateViaCache: "none",
		})
		.catch(() => {});
});
