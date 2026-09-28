export default defineEventHandler(async (event) => {
	await requireCapability(event, "users:manage", { requireVerified: true });

	const users = await prisma().user.findMany({
		orderBy: { id: "asc" },
		select: {
			id: true,
			username: true,
			name: true,
			email: true,
			role: true,
			emailVerified: true,
			createdAt: true,
		},
	});

	return { users };
});
