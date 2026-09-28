export default defineEventHandler(async (event) => {
	const session = await requireCapability(event, "chat:access", {
		requireVerified: true,
	});

	const conversations = await prisma().assistantConversation.findMany({
		where: { userId: session.id },
		orderBy: { updatedAt: "desc" },
		select: { id: true, title: true, createdAt: true, updatedAt: true },
	});

	return { conversations };
});
