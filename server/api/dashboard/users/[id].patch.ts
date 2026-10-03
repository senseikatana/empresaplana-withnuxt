import { z } from "zod";
import { ROLES } from "#shared/acl";
import { requireCapability } from "../../../utils/acl";
import { hashPasskey } from "../../../utils/passkey";

/**
 * Edición de usuarios desde el panel.
 *
 * Guardas:
 * - un admin no puede cambiarse el rol a sí mismo (se dejaría fuera del panel);
 * - si cambia el correo y no se indica lo contrario, `emailVerified` vuelve a
 *   `false` (mismo criterio que el perfil propio en `account.patch.ts`);
 * - la contraseña se escribe en `Account.password`, no en `User.passkey`.
 */
const updateSchema = z.object({
	username: z
		.string()
		.trim()
		.min(3)
		.max(60)
		.regex(/^[a-z0-9._-]+$/i, "invalid_username")
		.optional(),
	name: z.string().trim().min(1).max(60).optional(),
	email: z.email().max(200).optional(),
	phone: z.string().trim().max(30).optional(),
	role: z.enum(ROLES).optional(),
	emailVerified: z.boolean().optional(),
	password: z.string().min(8).max(128).optional(),
});

export default defineEventHandler(async (event) => {
	const session = await requireCapability(event, "users:manage", {
		requireVerified: true,
	});
	rateLimit(event, { limit: 30, windowMs: 60_000 });

	const id = Number(event.context.params?.id);
	if (!Number.isInteger(id) || id <= 0) {
		throw createError({ statusCode: 400, statusMessage: "invalid_id" });
	}

	const data = parseOr400(
		updateSchema,
		await readBody(event).catch(() => ({})),
	);

	const db = prisma();
	const existing = await db.user.findUnique({
		where: { id },
		select: { id: true, username: true, email: true },
	});
	if (!existing) {
		throw createError({ statusCode: 404, statusMessage: "not_found" });
	}

	// Nadie se cambia el rol a sí mismo: si se quitara `users:manage` se
	// quedaría sin acceso al panel en la siguiente petición.
	if (id === session.id && data.role && data.role !== "admin") {
		throw createError({ statusCode: 400, statusMessage: "cannot_demote_self" });
	}

	const email = data.email?.toLowerCase();
	const wantsEmailChange = Boolean(email && email !== existing.email);

	// Unicidad de username y correo, excluyendo al propio usuario.
	if (
		(data.username && data.username !== existing.username) ||
		wantsEmailChange
	) {
		const clash = await db.user.findFirst({
			where: {
				NOT: { id },
				OR: [
					...(data.username ? [{ username: data.username }] : []),
					...(email ? [{ email }] : []),
				],
			},
			select: { username: true, email: true },
		});
		if (clash) {
			throw createError({
				statusCode: 409,
				statusMessage:
					data.username && clash.username === data.username
						? "username_exists"
						: "email_exists",
			});
		}
	}

	const user = await db.$transaction(async (tx) => {
		const updated = await tx.user.update({
			where: { id },
			data: {
				...(data.username ? { username: data.username } : {}),
				...(data.name ? { name: data.name, fullName: data.name } : {}),
				...(email ? { email } : {}),
				...(data.phone !== undefined ? { phone: data.phone } : {}),
				...(data.role ? { role: data.role } : {}),
				// El correo nuevo no puede darse por verificado sin confirmarlo.
				...(wantsEmailChange && data.emailVerified === undefined
					? { emailVerified: false }
					: data.emailVerified !== undefined
						? { emailVerified: data.emailVerified }
						: {}),
			},
		});

		if (data.password) {
			const password = hashPasskey(data.password);
			await tx.account.upsert({
				where: {
					userId_providerId: { userId: id, providerId: "credential" },
				},
				create: {
					userId: id,
					providerId: "credential",
					accountId: String(id),
					password,
				},
				update: { password, updatedAt: new Date() },
			});
		}

		return updated;
	});

	return {
		user: {
			id: user.id,
			username: user.username,
			name: user.name,
			email: user.email,
			phone: user.phone,
			role: user.role,
			emailVerified: user.emailVerified,
		},
	};
});
