import { z } from "zod";
import { ROLES } from "#shared/acl";
import { requireCapability } from "../../utils/acl";
import { hashPasskey } from "../../utils/passkey";

/**
 * Alta de usuarios desde el panel.
 *
 * La contraseña no vive en `User` (Better Auth la guarda en
 * `Account.password`, providerId `credential`) y usa el mismo scrypt del
 * proyecto (`hashPasskey`) para que el login la valide igual.
 *
 * Usuario y cuenta se crean en una transacción: si falla el `Account`, no
 * queda un usuario sin credenciales.
 */
const createSchema = z.object({
	username: z
		.string()
		.trim()
		.min(3)
		.max(60)
		.regex(/^[a-z0-9._-]+$/i, "invalid_username"),
	name: z.string().trim().min(1).max(60),
	email: z.email().max(200),
	phone: z.string().trim().max(30).default(""),
	role: z.enum(ROLES).default("client"),
	password: z.string().min(8).max(128),
	emailVerified: z.boolean().default(false),
});

export default defineEventHandler(async (event) => {
	await requireCapability(event, "users:manage", { requireVerified: true });
	rateLimit(event, { limit: 20, windowMs: 60_000 });

	const data = parseOr400(
		createSchema,
		await readBody(event).catch(() => ({})),
	);

	const email = data.email.toLowerCase();
	const db = prisma();

	const clash = await db.user.findFirst({
		where: { OR: [{ username: data.username }, { email }] },
		select: { id: true, username: true, email: true },
	});
	if (clash) {
		throw createError({
			statusCode: 409,
			statusMessage:
				clash.username === data.username ? "username_exists" : "email_exists",
		});
	}

	const passwordHash = hashPasskey(data.password);

	const user = await db.$transaction(async (tx) => {
		const created = await tx.user.create({
			data: {
				username: data.username,
				name: data.name,
				fullName: data.name,
				email,
				phone: data.phone,
				role: data.role,
				emailVerified: data.emailVerified,
				// `User.passkey` queda vacío a propósito: la credencial real
				// está en `Account.password`.
				passkey: "",
			},
		});

		await tx.account.create({
			data: {
				userId: created.id,
				providerId: "credential",
				accountId: String(created.id),
				password: passwordHash,
			},
		});

		return created;
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
			createdAt: user.createdAt,
		},
	};
});
