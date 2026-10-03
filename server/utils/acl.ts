import type { H3Event } from "h3";
import { type Capability, hasCapability } from "#shared/acl";
import { getSessionUser, type SessionUser } from "./auth";

/** ¿Tiene la sesión esta capability? Punto único de autorización en servidor. */
export function can(user: SessionUser | null, capability: Capability): boolean {
	if (!user) return false;
	return hasCapability(user.role, capability);
}

export interface RequireOptions {
	/** Exige email verificado (además de la capability). */
	requireVerified?: boolean;
}

/**
 * Guard para endpoints: 401 sin sesión, 403 sin capability (o sin email verificado).
 * Devuelve la sesión para no tener que volver a pedirla.
 */
export async function requireCapability(
	event: H3Event,
	capability: Capability,
	options: RequireOptions = {},
): Promise<SessionUser> {
	const session = await getSessionUser(event);
	if (!session) {
		throw createError({ statusCode: 401, statusMessage: "No autenticat" });
	}
	if (!can(session, capability)) {
		throw createError({ statusCode: 403, statusMessage: "Sense accés" });
	}
	if (options.requireVerified) {
		// `emailVerified` ya viene de la sesión (Better Auth lo lee de `User`
		// en cada getSession): antes hacía una consulta extra por petición.
		if (!session.emailVerified) {
			throw createError({
				statusCode: 403,
				statusMessage: "Cal verificar el correu",
			});
		}
	}
	return session;
}
