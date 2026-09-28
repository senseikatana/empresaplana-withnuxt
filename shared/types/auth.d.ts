import type { Role } from "../acl";

/**
 * Sesión de `nuxt-auth-utils`. Solo lo mínimo para reconocer al usuario:
 * el perfil completo (email, avatar, emailVerified) se lee de la DB en
 * `/api/me`, no se mete en la cookie (límite de 4096 bytes).
 *
 * `role` usa la fuente de verdad de `shared/acl.ts`; nunca se acepta desde
 * el cliente.
 */
declare module "#auth-utils" {
	interface User {
		id: number;
		username: string;
		role: Role;
	}

	interface SecureSessionData {}
}

export {};
