import { getLineStats, listReports } from "../../utils/tracking-store";

export default defineEventHandler((event) => {
	// `getQuery` devuelve `QueryValue`: puede no ser string.
	const raw = getQuery(event).lineId;
	const lineId = typeof raw === "string" ? raw.trim() : "";

	return {
		reports: listReports(lineId || undefined),
		stats: lineId ? getLineStats(lineId) : null,
	};
});
