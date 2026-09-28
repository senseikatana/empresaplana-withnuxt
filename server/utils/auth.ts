import type { H3Event } from "h3";
import { isRole, type Role } from "#shared/acl";

// Alias de compatibilidad: la fuente de verdad del rol es shared/acl.ts
export type UsuarioRole = Role;

export interface SessionUser {
	id: number;
	username: string;
	role: UsuarioRole;
}

/**
 * La sesión la sella `nuxt-auth-utils` (h3 `useSession`, cookie encriptada
 * con iron-webcrypto): ya no hay JWT HS256 ni cookie `ep_session` propia.
 *
 * Este adaptador existe para no dispersar el cambio: guard SSR, `requireCapability`
 * y los endpoints siguen hablando con `SessionUser` y no con el módulo.
 *
 * Solo se guarda en la cookie lo mínimo para reconocer al usuario; el perfil
 * (email, avatar, emailVerified) se lee de la DB en `/api/me`.
 */
export async function getSessionUser(
	event: H3Event,
): Promise<SessionUser | null> {
	try {
		const { user } = await getUserSession(event);
		if (!user) return null;
		// La cookie va sellada, pero el runtime no garantiza la forma: validar
		// evita que un `null`/NaN llegue a la ACL.
		if (!Number.isInteger(user.id) || typeof user.username !== "string")
			return null;
		if (!isRole(user.role)) return null;
		return { id: user.id, username: user.username, role: user.role };
	} catch {
		// Cookie corrupta o secreto rotado: es "sin sesión", no un 500.
		return null;
	}
}

export async function setSessionUser(
	event: H3Event,
	user: SessionUser,
): Promise<void> {
	await setUserSession(event, { user });
}

export async function clearSessionUser(event: H3Event): Promise<void> {
	await clearUserSession(event);
}
