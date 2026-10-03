import type { H3Event } from "h3";
import { isRole, type Role } from "#shared/acl";
import { auth, toAuthSessionUser } from "../auth";

// Alias de compatibilidad: la fuente de verdad del rol es shared/acl.ts
export type UsuarioRole = Role;

export interface SessionUser {
	id: number;
	username: string;
	role: UsuarioRole;
	emailVerified: boolean;
}

/**
 * Adaptador sobre Better Auth (antes `nuxt-auth-utils`).
 *
 * Better Auth guarda las sesiones en la tabla `session`: el logout las borra
 * de verdad y una cookie robada deja de valer en cuanto se revoca. El JWT
 * stateless de antes seguía vivo 7 días aunque el usuario cerrara sesión.
 *
 * Esta capa existe para que los guards (`dashboard-guard`, `requireCapability`)
 * y los endpoints no cambien de forma: siguen hablando de `SessionUser`.
 */

/**
 * Cabeceras nativas de la petición.
 * `getRequestHeaders` devuelve un objeto plano con posibles `undefined`:
 * usar `Object.entries()` sobre la instancia `Headers` de h3 devolvería `[]`
 * y la cookie se perdería (la sesión nunca se leía).
 */
export function webHeaders(event: H3Event): Headers {
	const headers = new Headers();
	for (const [key, value] of Object.entries(getRequestHeaders(event))) {
		if (value !== undefined) headers.append(key, value);
	}
	return headers;
}

/**
 * Adopta la respuesta de Better Auth en el evento de h3.
 *
 * Devuelve `false` si Better Auth respondió con error: cuando se pide
 * `asResponse: true` **no lanza**, devuelve un `Response` con 4xx/5xx. Sin
 * comprobar esto se loguearía un login fallido como exitoso.
 */
export function adoptAuthResponse(event: H3Event, response: Response): boolean {
	for (const cookie of response.headers.getSetCookie()) {
		appendResponseHeader(event, "set-cookie", cookie);
	}
	return response.ok;
}

/** Mensaje de error de un `Response` fallido de Better Auth, si lo trae. */
export function authErrorMessage(response: Response): string {
	return response.statusText || `HTTP ${response.status}`;
}

/**
 * Sesión a partir de unos cabeceras cualquiera (h3 o `Request` de WebSocket).
 * Compartido por los endpoints HTTP y por el upgrade de `chat.ws`.
 */
export async function getSessionFromHeaders(
	headers: HeadersInit,
): Promise<SessionUser | null> {
	try {
		const session = await auth.api.getSession({ headers });
		const raw = session?.user;
		if (!raw) return null;

		const user = toAuthSessionUser(raw);
		const id = Number(user?.id);
		// El runtime no garantiza la forma: validar evita que un `null`/NaN
		// llegue a la ACL.
		if (!Number.isInteger(id)) return null;
		if (typeof user?.username !== "string" || !isRole(user.role)) return null;

		return {
			id,
			username: user.username,
			role: user.role,
			emailVerified: Boolean(user.emailVerified),
		};
	} catch {
		// Cookie corrupta o secreto rotado: es "sin sesión", no un 500.
		return null;
	}
}

/** Sesión actual según Better Auth, o `null` si no hay cookie válida. */
export async function getSessionUser(
	event: H3Event,
): Promise<SessionUser | null> {
	return getSessionFromHeaders(webHeaders(event));
}

/**
 * Cierra la sesión: Better Auth borra la fila de `session` (revocación real)
 * y limpia la cookie en el navegador.
 */
export async function clearSessionUser(event: H3Event): Promise<void> {
	try {
		// `asResponse: true` es imprescindible: sin él Better Auth devuelve solo
		// el body y los `Set-Cookie` (la purga de la sesión) se pierden.
		const response = await auth.api.signOut({
			headers: webHeaders(event),
			asResponse: true,
		});
		if (response) adoptAuthResponse(event, response);
	} catch {
		// Aunque falle la llamada, la cookie local se elimina igualmente.
	} finally {
		deleteCookie(event, "better-auth.session_token", { path: "/" });
		deleteCookie(event, "nuxt-auth-utils.session", { path: "/" });
	}
}

/** Idem que `getSessionUser`, pero lanza 401 si no hay sesión. */
export async function requireSessionUser(event: H3Event): Promise<SessionUser> {
	const session = await getSessionUser(event);
	if (!session) {
		throw createError({ statusCode: 401, statusMessage: "No autenticat" });
	}
	return session;
}
