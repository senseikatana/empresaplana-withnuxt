import type { ChatSession } from "../utils/chat";
import {
	canAccessConversation,
	createMessage,
	ensureParticipant,
} from "../utils/chat";

export default defineWebSocketHandler({
	// `requireUserSession` acepta el Request del upgrade y tira 401 sin sesión,
	// así que ya no hace falta parsear la cookie ni verificar el JWT a mano.
	async upgrade(request) {
		const { user } = await requireUserSession(request);
		const session: ChatSession = {
			id: user.id,
			username: user.username,
			role: user.role,
		};
		(
			request as unknown as { context: Record<string, unknown> }
		).context.session = session;
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
