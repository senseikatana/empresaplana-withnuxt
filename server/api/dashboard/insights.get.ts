import { can } from "../../utils/acl";

/**
 * Datos para las gráficas y el feed del home del panel.
 *
 * Solo se devuelven métricas que existen de verdad en la BD: reparto de
 * estados de flota, actividad reciente y usuarios verificados. NO se calculan
 * series temporales ni tendencias porque no hay histórico (la tabla `Stat`
 * está vacía) — un panel que inventa cifras es peor que uno simple.
 */

interface ActivityRow {
	at: Date;
	action: string;
	user: string;
}

function countByStatus(rows: { status: string }[]): Record<string, number> {
	const out: Record<string, number> = {};
	for (const row of rows) out[row.status] = (out[row.status] ?? 0) + 1;
	return out;
}

export default defineEventHandler(async (event) => {
	const session = await requireCapability(event, "dashboard:access", {
		requireVerified: true,
	});
	const db = prisma();

	const fleet = can(session, "fleet:view");
	const manageUsers = can(session, "users:manage");

	const [routes, buses, drivers, activity, users] = await Promise.all([
		fleet ? db.route.findMany({ select: { status: true } }) : [],
		fleet ? db.bus.findMany({ select: { status: true } }) : [],
		fleet ? db.driver.findMany({ select: { status: true } }) : [],
		db.activity.findMany({ orderBy: { at: "desc" }, take: 8 }),
		manageUsers ? db.user.findMany({ select: { emailVerified: true } }) : [],
	]);

	return {
		status: fleet
			? {
					routes: countByStatus(routes),
					buses: countByStatus(buses),
					drivers: countByStatus(drivers),
				}
			: null,
		users: manageUsers
			? {
					total: users.length,
					verified: users.filter((u) => u.emailVerified).length,
				}
			: null,
		activity: (activity as ActivityRow[]).map((a) => ({
			at: a.at.toISOString(),
			action: a.action,
			user: a.user,
		})),
	};
});
