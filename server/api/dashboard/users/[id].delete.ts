import { requireCapability } from "../../../utils/acl";

/**
 * Borrado de usuarios desde el panel.
 *
 * Guardas:
 * - no puedes borrarte a ti mismo (te quedarías sin sesión a mitad de faena);
 * - no se puede borrar al último admin (el panel se quedaría sin nadie que
 *   pueda gestionar usuarios).
 *
 * Limpieza: `Session`, `Account`, `FavoriteRoute`, `RecentSearch` y
 * `AssistantConversation` caen por `onDelete: Cascade`. En cambio
 * `Budget.user` NO tiene cascade (bloquearía el delete con un FK) y
 * `ConversationParticipant.userId` es un escalar sin FK (dejaría huérfanos),
 * así que ambos se limpian aquí dentro de una transacción.
 */
export default defineEventHandler(async (event) => {
	const session = await requireCapability(event, "users:manage", {
		requireVerified: true,
	});
	rateLimit(event, { limit: 20, windowMs: 60_000 });

	const id = Number(event.context.params?.id);
	if (!Number.isInteger(id) || id <= 0) {
		throw createError({ statusCode: 400, statusMessage: "invalid_id" });
	}

	if (id === session.id) {
		throw createError({ statusCode: 400, statusMessage: "cannot_delete_self" });
	}

	const db = prisma();
	const user = await db.user.findUnique({
		where: { id },
		select: { id: true, username: true, role: true },
	});
	if (!user) {
		throw createError({ statusCode: 404, statusMessage: "not_found" });
	}

	if (user.role === "admin") {
		const admins = await db.user.count({ where: { role: "admin" } });
		if (admins <= 1) {
			throw createError({
				statusCode: 409,
				statusMessage: "last_admin",
			});
		}
	}

	await db.$transaction(async (tx) => {
		await tx.budget.deleteMany({ where: { userId: id } });
		await tx.conversationParticipant.deleteMany({ where: { userId: id } });
		await tx.user.delete({ where: { id } });
	});

	return { ok: true };
});
