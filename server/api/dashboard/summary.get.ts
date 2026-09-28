import { can } from "../../utils/acl";

export default defineEventHandler(async (event) => {
	const session = await requireCapability(event, "dashboard:access", {
		requireVerified: true,
	});
	const db = prisma();
	const summary: Record<string, number> = {};

	if (can(session, "users:manage")) {
		const [users, routes, buses, drivers] = await Promise.all([
			db.user.count(),
			db.route.count(),
			db.bus.count(),
			db.driver.count(),
		]);
		Object.assign(summary, { users, routes, buses, drivers });
	} else if (can(session, "fleet:view")) {
		const [routes, buses, unread] = await Promise.all([
			db.route.count(),
			db.bus.count(),
			db.notification.count({ where: { read: false } }),
		]);
		Object.assign(summary, { routes, buses, unreadNotifications: unread });
	} else {
		const [budgets, favorites, searches] = await Promise.all([
			db.budget.count({ where: { userId: session.id } }),
			db.favoriteRoute.count({ where: { userId: session.id } }),
			db.recentSearch.count({ where: { userId: session.id } }),
		]);
		Object.assign(summary, { budgets, favorites, recentSearches: searches });
	}

	return { role: session.role, summary };
});
