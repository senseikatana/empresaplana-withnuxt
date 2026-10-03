import { addReview } from "../../utils/tracking-store";

export default defineEventHandler(async (event) => {
	// Público (sin sesión): igual que los reportes, con límite propio.
	rateLimit(event, { limit: 20, windowMs: 60_000 });

	const body = await readBody<Record<string, unknown>>(event).catch(() => null);
	if (!body || typeof body !== "object") {
		throw createError({ statusCode: 400, statusMessage: "invalid_body" });
	}

	const lineId = typeof body.lineId === "string" ? body.lineId.trim() : "";
	const stars = typeof body.stars === "number" ? Math.round(body.stars) : 0;
	const comment =
		typeof body.comment === "string" ? body.comment.slice(0, 500) : undefined;

	if (!lineId) {
		throw createError({ statusCode: 400, statusMessage: "line_id_required" });
	}
	if (stars < 1 || stars > 5) {
		throw createError({ statusCode: 400, statusMessage: "invalid_stars" });
	}

	return { review: addReview({ lineId, stars, comment }) };
});
