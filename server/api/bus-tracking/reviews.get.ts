import { listReviews } from "../../utils/tracking-store";

export default defineEventHandler((event) => {
	// `getQuery` devuelve `QueryValue`: puede no ser string.
	const raw = getQuery(event).lineId;
	const lineId = typeof raw === "string" ? raw.trim() : "";
	return { reviews: listReviews(lineId || undefined) };
});
