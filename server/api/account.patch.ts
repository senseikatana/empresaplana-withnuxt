import { z } from "zod";
import { requireCapability } from "../utils/acl";
import { hashPasskey, verifyPasskey } from "../utils/passkey";
import { sendVerificationEmail } from "../utils/verification";

const patchSchema = z.object({
	name: z.string().min(1).max(60).optional(),
	email: z.string().email().max(200).optional(),
	phone: z.string().max(30).optional(),
	bio: z.string().max(280).optional(),
	currentPasskey: z.string().min(1).max(128).optional(),
	newPassword: z.string().min(8).max(128).optional(),
});

export default defineEventHandler(async (event) => {
	const session = await requireCapability(event, "profile:edit", {
		requireVerified: true,
	});
	rateLimit(event, { limit: 10, windowMs: 60_000 });

	const body = await readBody(event).catch(() => ({}));
	const parsed = patchSchema.safeParse(body);
	if (!parsed.success) {
		throw createError({ statusCode: 400, statusMessage: "Dades invàlides" });
	}

	const data: Record<string, unknown> = {};
	if (parsed.data.name !== undefined) {
		data.name = parsed.data.name;
		data.fullName = parsed.data.name;
	}
	if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
	if (parsed.data.bio !== undefined) data.bio = parsed.data.bio;

	const sensitive =
		parsed.data.email !== undefined || parsed.data.newPassword !== undefined;

	// Cambiar email o contraseña exige confirmar la contraseña actual.
	// La contraseña vive en `Account.password` (Better Auth), no en
	// `User.passkey`: ese campo ya no lo lee ningún login.
	if (sensitive) {
		if (!parsed.data.currentPasskey) {
			throw createError({
				statusCode: 400,
				statusMessage: "Cal indicar la contrasenya actual",
			});
		}
		const account = await prisma().account.findFirst({
			where: { userId: session.id, providerId: "credential" },
			select: { password: true },
		});
		if (
			!account?.password ||
			!verifyPasskey(parsed.data.currentPasskey, account.password)
		) {
			throw createError({
				statusCode: 403,
				statusMessage: "Contrasenya actual incorrecta",
			});
		}
	}

	let emailChanged = false;
	if (parsed.data.email !== undefined) {
		// Unicidad de email excluyendo la propia cuenta.
		const clash = await prisma().user.findFirst({
			where: { email: parsed.data.email, NOT: { id: session.id } },
			select: { id: true },
		});
		if (clash) {
			throw createError({
				statusCode: 409,
				statusMessage: "email_exists",
			});
		}
		data.email = parsed.data.email;
		// La nueva dirección debe verificarse: nunca mantener "verified" con un
		// correo que no se ha confirmado.
		data.emailVerified = false;
		emailChanged = true;
	}
	// La contraseña nueva se aplica a `Account`, no al usuario.
	const passwordHash = parsed.data.newPassword
		? hashPasskey(parsed.data.newPassword)
		: null;

	if (Object.keys(data).length === 0 && !passwordHash) {
		throw createError({ statusCode: 400, statusMessage: "Res a actualitzar" });
	}

	// Sin `avatarData`: no hace falta traer el blob para devolver el perfil.
	const user =
		Object.keys(data).length > 0
			? await prisma().user.update({
					where: { id: session.id },
					data,
					omit: { avatarData: true },
				})
			: await prisma().user.findUniqueOrThrow({
					where: { id: session.id },
					omit: { avatarData: true },
				});

	if (passwordHash) {
		// `upsert` por si la cuenta de credenciales aún no existe.
		await prisma().account.upsert({
			where: {
				userId_providerId: { userId: session.id, providerId: "credential" },
			},
			create: {
				userId: session.id,
				providerId: "credential",
				accountId: String(session.id),
				password: passwordHash,
			},
			update: { password: passwordHash, updatedAt: new Date() },
		});
	}

	if (emailChanged) {
		await sendVerificationEmail({
			id: user.id,
			email: user.email,
			name: user.name,
		});
	}

	return {
		user: {
			id: user.id,
			username: user.username,
			name: user.name,
			email: user.email,
			phone: user.phone,
			bio: user.bio ?? "",
			role: user.role,
			hasAvatar: Boolean(user.avatarMime),
			avatarVersion: user.updatedAt.getTime(),
		},
		emailVerificationRequired: emailChanged,
	};
});
