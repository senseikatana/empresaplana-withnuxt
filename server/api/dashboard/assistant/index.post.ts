export default defineEventHandler(async (event) => {
	const session = await requireCapability(event, "chat:access", {
		requireVerified: true,
	});

	const conversation = await prisma().assistantConversation.create({
		data: { userId: session.id, title: "" },
		select: { id: true, title: true, createdAt: true, updatedAt: true },
	});

	return { conversation };
});
