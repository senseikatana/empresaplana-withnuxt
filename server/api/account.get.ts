import { requireCapability } from "../utils/acl";

export default defineEventHandler(async (event) => {
	const session = await requireCapability(event, "profile:edit");

	// `omit` evita traer el blob del avatar (BYTEA) para un flag booleano.
	const user = await prisma().user.findUnique({
		where: { id: session.id },
		omit: { avatarData: true },
	});
	if (!user) {
		throw createError({ statusCode: 404, statusMessage: "Usuari no trobat" });
	}

	return {
		user: {
			id: user.id,
			username: user.username,
			name: user.name,
			fullName: user.fullName,
			email: user.email,
			phone: user.phone,
			bio: user.bio ?? "",
			role: user.role,
			hasAvatar: Boolean(user.avatarMime),
			avatarVersion: user.updatedAt.getTime(),
			totpEnabled: Boolean(user.totpSecret),
			emailVerified: user.emailVerified,
			createdAt: user.createdAt,
		},
	};
});
