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
	if (sensitive) {
		if (!parsed.data.currentPasskey) {
			throw createError({
				statusCode: 400,
				statusMessage: "Cal indicar la contrasenya actual",
			});
		}
		const user = await prisma().user.findUnique({
			where: { id: session.id },
			select: { passkey: true },
		});
		if (!user || !verifyPasskey(parsed.data.currentPasskey, user.passkey)) {
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
	if (parsed.data.newPassword) {
		data.passkey = hashPasskey(parsed.data.newPassword);
	}

	if (Object.keys(data).length === 0) {
		throw createError({ statusCode: 400, statusMessage: "Res a actualitzar" });
	}

	// Sin `avatarData`: no hace falta traer el blob para devolver el perfil.
	const user = await prisma().user.update({
		where: { id: session.id },
		data,
		omit: { avatarData: true },
	});

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
