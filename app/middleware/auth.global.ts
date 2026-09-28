import { type Capability, hasCapability, isRole } from "#shared/acl";

// Ruta del panel con o sin prefijo de locale (ca vive en la raíz).
const dashboardPathPattern = /^\/(?:es|en|fr)?\/dashboard(?:\/|$)/;
const publicAuthPaths = ["/dashboard/login", "/dashboard/register"];
const pendingPathPattern = /^\/(?:es|en|fr)?\/dashboard\/pending(?:\/|$)/;

function withoutLocale(path: string): string {
	return path.replace(/^\/(?:es|en|fr)(?=\/dashboard)/, "");
}

function isPublicAuthPath(path: string): boolean {
	return publicAuthPaths.includes(withoutLocale(path));
}

function isPendingPath(path: string): boolean {
	return pendingPathPattern.test(path);
}

export default defineNuxtRouteMiddleware(async (to) => {
	if (!dashboardPathPattern.test(to.path) || isPublicAuthPath(to.path)) return;

	const localePath = useLocalePath();

	let session: { user?: { role?: string; emailVerified?: boolean } } | null =
		null;
	try {
		session = await $fetch("/api/me", {
			headers: useRequestHeaders(["cookie"]),
		});
	} catch {
		session = null;
	}

	const role = session?.user?.role;
	console.log("[auth-middleware]", to.path, { role, emailVerified: session?.user?.emailVerified });
	if (!role || !isRole(role)) {
		// Query construido manualmente: navigateTo con string + query no
		// garantiza la serialización del redirect en SSR.
		const loginUrl = `${localePath("/dashboard/login")}?redirect=${encodeURIComponent(to.fullPath)}`;
		return navigateTo(loginUrl);
	}

	// El panel exige email verificado: sin verificar solo es accesible /dashboard/pending.
	if (session?.user?.emailVerified === false && !isPendingPath(to.path)) {
		const pendingUrl = `${localePath("/dashboard/pending")}?redirect=${encodeURIComponent(to.fullPath)}`;
		return navigateTo(pendingUrl);
	}
	if (session?.user?.emailVerified === true && isPendingPath(to.path)) {
		return navigateTo(localePath("/dashboard"));
	}

	// Guard por capability (no por rol): la página declara lo que necesita
	// con `definePageMeta({ capability: "..." })`.
	const required = to.meta.capability as Capability | undefined;
	if (required && !hasCapability(role, required)) {
		return navigateTo(localePath("/dashboard"));
	}
});
