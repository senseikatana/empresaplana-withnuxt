import {
	convertToModelMessages,
	createUIMessageStream,
	createUIMessageStreamResponse,
	isStepCount,
	smoothStream,
	streamText,
	toUIMessageStream,
	type UIMessage,
} from "ai";
import { z } from "zod";
import type { Prisma } from "../../../../generated/prisma/client";
import {
	ASSISTANT_SYSTEM_PROMPT,
	assistantModel,
} from "../../../utils/assistant";
import { loadMcpTools } from "../../../utils/mcp";

const bodySchema = z.object({
	messages: z.array(z.custom<UIMessage>()),
});

function asJson(parts: unknown): Prisma.InputJsonValue {
	return parts as unknown as Prisma.InputJsonValue;
}

export default defineEventHandler(async (event) => {
	const session = await requireCapability(event, "chat:access", {
		requireVerified: true,
	});

	const { id } = await getValidatedRouterParams(
		event,
		z.object({ id: z.string().uuid() }).parse,
	);
	const { messages } = parseOr400(
		bodySchema,
		await readBody(event).catch(() => ({})),
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

	if (!conversation.title) {
		const firstText = messages
			.filter((message) => message.role === "user")
			.flatMap((message) => message.parts)
			.find((part) => part.type === "text");
		const title =
			(firstText && "text" in firstText ? String(firstText.text) : "")
				.trim()
				.slice(0, 60) || "Conversa";
		await prisma().assistantConversation.update({
			where: { id },
			data: { title },
		});
	}

	const model = assistantModel();
	const tools = await loadMcpTools();

	// Persist the incoming user message immediately (the stream only yields
	// assistant messages in `onEnd`).
	const lastMessage = messages[messages.length - 1];
	if (lastMessage?.role === "user") {
		await prisma().assistantMessage.upsert({
			where: { id: lastMessage.id },
			update: { parts: asJson(lastMessage.parts) },
			create: {
				id: lastMessage.id,
				conversationId: id,
				role: "user",
				parts: asJson(lastMessage.parts),
			},
		});
	}

	const stream = createUIMessageStream({
		execute: async ({ writer }) => {
			const result = streamText({
				model,
				system: ASSISTANT_SYSTEM_PROMPT,
				messages: await convertToModelMessages(messages),
				tools,
				stopWhen: isStepCount(5),
				experimental_transform: smoothStream(),
			});

			writer.merge(
				toUIMessageStream({ stream: result.stream, sendReasoning: true }),
			);
		},
		onEnd: async ({ messages: finalMessages }) => {
			for (const message of finalMessages) {
				await prisma().assistantMessage.upsert({
					where: { id: message.id },
					update: { parts: asJson(message.parts) },
					create: {
						id: message.id,
						conversationId: id,
						role: message.role,
						parts: asJson(message.parts),
					},
				});
			}
			await prisma().assistantConversation.update({
				where: { id },
				data: { updatedAt: new Date() },
			});
		},
	});

	return createUIMessageStreamResponse({ stream });
});
