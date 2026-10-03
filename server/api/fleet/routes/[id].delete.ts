import { z } from "zod";
import { requireCapability } from "../../../utils/acl";

/**
 * Borrado de rutas.
 *
 * `Schedule.routeId` y `Bus.routeId` son escalares SIN FK (Prisma no los
 * gestiona), así que un `delete` a pelo dejaría horarios y autobuses colgando
 * de una ruta inexistente. En las 8 rutas actuales las hay en todas, así que
 * un 409 dejaría el botón sin uso.
 *
 * Por eso: si la ruta está referenciada se **archiva** (`status = inactive`,
 * reversible desde el formulario de edición); solo se borra de verdad cuando
 * no la usa nadie.
 */
export default defineEventHandler(async (event) => {
	await requireCapability(event, "fleet:manage");
	rateLimit(event, { limit: 20, windowMs: 60_000 });

	const { id } = await getValidatedRouterParams(
		event,
		z.object({ id: z.string().min(1).max(40) }).parse,
	);

	const route = await prisma().route.findUnique({
		where: { id },
		select: { id: true },
	});
	if (!route) {
		throw createError({ statusCode: 404, statusMessage: "not_found" });
	}

	const [schedules, buses] = await Promise.all([
		prisma().schedule.count({ where: { routeId: id } }),
		prisma().bus.count({ where: { routeId: id } }),
	]);

	if (schedules > 0 || buses > 0) {
		await prisma().route.update({
			where: { id },
			data: { status: "inactive" },
		});
		return { ok: true, archived: true, schedules, buses };
	}

	await prisma().route.delete({ where: { id } });
	return { ok: true, archived: false, schedules: 0, buses: 0 };
});
