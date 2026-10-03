import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import { isRole } from "#shared/acl";
import { hashPasskey, verifyPasskey } from "./utils/passkey";
import { prisma } from "./utils/prisma";
import { appUrl, sendVerificationEmail } from "./utils/verification";

/**
 * Instancia de Better Auth — reemplaza a `nuxt-auth-utils`.
 *
 * Decisiones de integración con el esquema existente:
 *
 * - `advanced.database.generateId: "serial"` → el id lo genera Postgres
 *   (`autoincrement`) y el adapter sabe que los ids son números. Con `false`
 *   Better Auth los leería como string y las consultas a columnas `Int`
 *   fallarían con PrismaClientValidationError.
 * - `emailAndPassword.password.hash/verify` reutilizan el scrypt del proyecto
 *   (`server/utils/passkey.ts`). Así TODAS las cuentas existentes siguen
 *   pudiendo entrar sin migrar hashes: Better Auth guarda el hash en
 *   `account.password` con exactamente el mismo formato `salt:hash`.
 * - El modelo de usuario es el `User` ya existente; `role` se expone como
 *   `additionalFields` para que la sesión traiga el rol sin consulta extra.
 */
export const auth = betterAuth({
	database: prismaAdapter(prisma(), { provider: "postgresql" }),
	secret: process.env.AUTH_SECRET,
	baseURL: appUrl(),
	trustedOrigins: [appUrl()],

	advanced: {
		database: {
			// `"serial"` (y NO `false`): delega el id a la BD como `autoincrement`
			// y, a diferencia de `false`, le dice al adapter que los ids son
			// NÚMEROS. Con `false` Better Auth lee `user.id` como string y las
			// consultas a columnas `Int` revientan con PrismaClientValidationError.
			generateId: "serial",
		},
	},

	emailAndPassword: {
		enabled: true,
		// El panel exige email verificado aparte (página /dashboard/pending),
		// igual que antes: entrar está permitido, navegar no.
		requireEmailVerification: false,
		password: {
			// Mismo formato que `hashPasskey`: `${salt_hex}:${hash_hex}`.
			hash: async (password) => hashPasskey(password),
			verify: async ({ hash, password }) => verifyPasskey(password, hash),
		},
	},

	emailVerification: {
		// El proyecto ya tiene su propio flujo (JWT + `server/routes/verify-email`
		// + redirecciones a /dashboard/pending). Se reutiliza tal cual: cambiarlo
		// solo por usar el de Better Auth sería churn sin ganancia.
		sendVerificationEmail: async ({ user }) => {
			// Nunca await: un fallo de envío no debe bloquear el registro
			// (mismo criterio que el endpoint de registro anterior).
			await sendVerificationEmail({
				id: Number(user.id),
				email: user.email,
				name: user.name,
			}).catch(() => undefined);
		},
	},

	rateLimit: {
		// Desactivado por defecto en dev; el proyecto sí lo quiere siempre.
		enabled: true,
		window: 60,
		max: 100,
		customRules: {
			"/sign-in/*": { window: 60, max: 10 },
			"/sign-up/*": { window: 60, max: 5 },
			"/forget-password": { window: 60, max: 3 },
			"/send-verification": { window: 60, max: 3 },
		},
	},

	user: {
		// Devuelve `role` dentro de `session.user` → el guard de rutas y los
		// endpoints no necesitan una consulta extra para autorizar.
		additionalFields: {
			role: {
				type: ["client", "worker", "admin"] as const,
				required: false,
				defaultValue: "client",
				input: false,
			},
		},
	},

	/**
	 * Better Auth escribe ids que en este proyecto no son `string`.
	 * `generateId: "serial"` ya convierte los campos que apuntan a `id`
	 * (p. ej. `session.userId`); aquí se refuerza lo que Better Auth no
	 * normaliza solo: `account.accountId` es una columna TEXT en la que
	 * guardamos el id numérico como string.
	 *
	 * NOTA: no hay hook para `user`: `passkey`/`fullName`/`phone` se cubren
	 * con defaults en la BD (migración 20261003092900), porque el
	 * `databaseHooks.user` del plugin `username` y este colisionarían.
	 *
	 * Los params van como `Record<string, unknown>` a propósito: Better Auth
	 * declara `userId: string` y el `Int` real no encaja en su tipo.
	 */
	databaseHooks: {
		session: {
			create: {
				before: async (data: Record<string, unknown>) => ({
					data: { ...data, userId: Number(data.userId) } as never,
				}),
			},
		},
		account: {
			create: {
				before: async (data: Record<string, unknown>) => ({
					data: {
						...data,
						userId: Number(data.userId),
						accountId: String(data.accountId ?? ""),
					} as never,
				}),
			},
		},
	},

	plugins: [username()],
});

export type Session = typeof auth.$Infer.Session;

/**
 * Usuario de sesión con los campos que aportan el plugin `username`
 * (`username`) y `user.additionalFields` (`role`).
 *
 * El `$Infer.Session` de Better Auth solo tipa los campos base, así que se
 * declaran aquí: en runtime sí existen (se leen de la tabla `User`).
 */
export interface AuthSessionUser {
	id: string | number;
	name: string;
	email: string;
	emailVerified: boolean;
	username?: string;
	role?: unknown;
}

/** Castea el `session.user` de Better Auth a nuestro shape. */
export function toAuthSessionUser(user: unknown): AuthSessionUser | null {
	if (!user || typeof user !== "object") return null;
	return user as AuthSessionUser;
}

/** Rol del usuario de la sesión, validado contra la ACL del proyecto. */
export function sessionRole(
	user: AuthSessionUser,
): "client" | "worker" | "admin" | null {
	return isRole(user.role) ? user.role : null;
}
