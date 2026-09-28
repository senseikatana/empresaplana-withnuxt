import { z } from "zod";

export default defineEventHandler(async (event) => {
	const session = await requireCapability(event, "chat:access", {
		requireVerified: true,
	});

	const { id } = await getValidatedRouterParams(
		event,
		z.object({ id: z.string().uuid() }).parse,
	);

	const conversation = await prisma().assistantConversation.findUnique({
		where: { id },
		select: { id: true, userId: true, title: true },
	});
	if (!conversation || conversation.userId !== session.id) {
		throw createError({
			statusCode: 404,
			statusMessage: "Conversation not found",
		});
	}

	const messages = await prisma().assistantMessage.findMany({
		where: { conversationId: id },
		orderBy: { createdAt: "asc" },
		select: { id: true, role: true, parts: true },
	});

	return {
		conversation: { id: conversation.id, title: conversation.title },
		messages: messages.map((message) => ({
			id: message.id,
			role: message.role,
			parts: message.parts,
		})),
	};
});
