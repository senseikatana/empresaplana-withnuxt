import type { ReportAction } from "#shared/types/bus-tracking";
import { addReport, REPORT_ACTIONS } from "../../utils/tracking-store";

const ACTIONS = new Set<string>(REPORT_ACTIONS);

export default defineEventHandler(async (event) => {
	// Endpoint público (sin sesión): sin límite, un bot podría rellenar el
	// fichero de la demo indefinidamente.
	rateLimit(event, { limit: 30, windowMs: 60_000 });

	const body = await readBody<Record<string, unknown>>(event).catch(() => null);
	if (!body || typeof body !== "object") {
		throw createError({ statusCode: 400, statusMessage: "invalid_body" });
	}

	const lineId = typeof body.lineId === "string" ? body.lineId.trim() : "";
	const action = typeof body.action === "string" ? body.action : "";
	const stopId =
		typeof body.stopId === "string" ? body.stopId.trim() : undefined;
	const minutesLate =
		typeof body.minutesLate === "number" && body.minutesLate >= 0
			? Math.round(body.minutesLate)
			: undefined;
	const comment =
		typeof body.comment === "string" ? body.comment.slice(0, 500) : undefined;

	if (!lineId) {
		throw createError({ statusCode: 400, statusMessage: "line_id_required" });
	}
	if (!ACTIONS.has(action)) {
		throw createError({ statusCode: 400, statusMessage: "invalid_action" });
	}

	return addReport({
		lineId,
		stopId,
		action: action as ReportAction,
		minutesLate,
		comment,
	});
});
