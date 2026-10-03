import { getSessionFromHeaders } from "../utils/auth";
import type { ChatSession } from "../utils/chat";
import {
	canAccessConversation,
	createMessage,
	ensureParticipant,
} from "../utils/chat";

export default defineWebSocketHandler({
	// Better Auth valida la cookie de sesión contra la tabla `Session` (revocable).
	// El upgrade trae un `Request` de fetch, así que se pasan sus headers.
	async upgrade(request) {
		const session = await getSessionFromHeaders(request.headers);
		if (!session) {
			// Rechaza el handshake: sin sesión no hay canal de chat.
			// (Volver aquí sin lanzar dejaría la conexión abierta y sin sesión.)
			throw createError({ statusCode: 401, statusMessage: "No autenticat" });
		}
		(
			request as unknown as { context: Record<string, unknown> }
		).context.session = session satisfies ChatSession;
	},

	open(peer) {
		const session = peer.context.session as ChatSession;
		peer.subscribe(`user:${session.id}`);
	},

	async message(peer, message) {
		const session = peer.context.session as ChatSession;
		const text = message.text();
		let data: { type?: string; conversationId?: number; body?: string };
		try {
			data = JSON.parse(text);
		} catch {
			return;
		}

		if (data.type === "subscribe" && typeof data.conversationId === "number") {
			const allowed = await canAccessConversation(session, data.conversationId);
			if (allowed) {
				peer.subscribe(`conv:${data.conversationId}`);
			}
			return;
		}

		if (data.type === "message" && typeof data.conversationId === "number") {
			if (typeof data.body !== "string") return;
			const body = data.body.trim();
			if (!body || body.length > 2000) return;
			const allowed = await canAccessConversation(session, data.conversationId);
			if (!allowed) return;
			await ensureParticipant(session, data.conversationId);
			const saved = await createMessage(session, data.conversationId, body);
			peer.publish(`conv:${data.conversationId}`, {
				type: "message",
				message: saved,
			});
			// Avisa también al propio emisor (para múltiples pestañas).
			peer.publish(`user:${session.id}`, {
				type: "message",
				message: saved,
			});
			return;
		}
	},
});
