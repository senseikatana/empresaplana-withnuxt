import { clearSessionUser, getSessionUser } from "../utils/auth";

export default defineEventHandler(async (event) => {
	const session = await getSessionUser(event);
	if (!session) {
		throw createError({ statusCode: 401, statusMessage: "No autenticat" });
	}

	const user = await prisma().user.findUnique({
		where: { id: session.id },
		select: {
			id: true,
			username: true,
			name: true,
			email: true,
			role: true,
			emailVerified: true,
			avatarMime: true,
			updatedAt: true,
		},
	});

	if (!user) {
		await clearSessionUser(event);
		throw createError({ statusCode: 401, statusMessage: "Sessió invàlida" });
	}

	const { avatarMime, updatedAt, ...rest } = user;
	return {
		user: {
			...rest,
			hasAvatar: Boolean(avatarMime),
			avatarVersion: updatedAt.getTime(),
		},
	};
});
