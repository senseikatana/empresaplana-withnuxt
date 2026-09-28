export default defineEventHandler(async () => {
	const rows = await prisma().$queryRaw<{ town: string }[]>`
		SELECT DISTINCT town FROM public.transit_stops ORDER BY town`;
	return rows.map((r) => r.town);
});
