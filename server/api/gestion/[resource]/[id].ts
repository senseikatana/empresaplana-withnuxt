import { z } from "zod";
import { type GestionResource, isGestionResource } from "#shared/gestion";
import { requireCapability } from "../../../utils/acl";

/**
 * CRUD genérico de gestión: PATCH (editar) y DELETE (borrar).
 *
 * Las entidades tienen `id Int autoincrement`, así que el `:id` de la ruta se
 * convierte a número y se valida antes de tocar la BD.
 */

const STATUS = ["active", "delayed", "maintenance", "inactive"] as const;

const updateSchemas = {
	buses: z.object({
		number: z.string().trim().min(1).max(20).optional(),
		plate: z.string().trim().min(1).max(20).optional(),
		company: z.string().trim().max(100).optional(),
		capacity: z.coerce.number().int().min(0).max(300).optional(),
		routeId: z.string().trim().max(40).nullish(),
		status: z.enum(STATUS).optional(),
	}),
	stops: z.object({
		name: z.string().trim().min(1).max(200).optional(),
		address: z.string().trim().max(300).optional(),
		lat: z.coerce.number().min(-90).max(90).optional(),
		lng: z.coerce.number().min(-180).max(180).optional(),
	}),
	schedules: z.object({
		routeId: z.string().trim().min(1).max(40).optional(),
		departure: z.string().trim().min(1).max(10).optional(),
		arrival: z.string().trim().min(1).max(10).optional(),
		frequency: z.string().trim().max(30).optional(),
		days: z.string().trim().max(50).optional(),
		status: z.enum(STATUS).optional(),
	}),
	drivers: z.object({
		name: z.string().trim().min(1).max(120).optional(),
		phone: z.string().trim().max(30).optional(),
		license: z.string().trim().max(30).optional(),
		busNumber: z.string().trim().max(20).nullish(),
		routeId: z.string().trim().max(40).nullish(),
		shiftDays: z.string().trim().max(30).nullish(),
		shiftHours: z.string().trim().max(30).nullish(),
		status: z.enum(STATUS).optional(),
	}),
	notifications: z.object({
		type: z.enum(["delay", "accident", "detour", "info"]).optional(),
		title: z.string().trim().min(1).max(200).optional(),
		desc: z.string().trim().min(1).max(1000).optional(),
		routeId: z.string().trim().max(40).nullish(),
		read: z.boolean().optional(),
	}),
	reports: z.object({
		lineId: z.string().trim().min(1).max(40).optional(),
		stop: z.string().trim().max(200).optional(),
		action: z
			.enum(["passed", "onTime", "late", "early", "notPassed", "cancelled"])
			.optional(),
		minutesLate: z.coerce.number().int().min(0).max(600).nullish(),
		comment: z.string().trim().max(500).nullish(),
	}),
} satisfies Record<GestionResource, z.ZodTypeAny>;

async function assertRouteExists(routeId?: string | null) {
	if (!routeId) return;
	const route = await prisma().route.findUnique({
		where: { id: routeId },
		select: { id: true },
	});
	if (!route) {
		throw createError({ statusCode: 400, statusMessage: "route_not_found" });
	}
}

export default defineEventHandler(async (event) => {
	const raw = event.context.params?.resource ?? "";
	if (!isGestionResource(raw)) {
		throw createError({ statusCode: 404, statusMessage: "unknown_resource" });
	}
	const resource = raw;

	const id = Number(event.context.params?.id);
	if (!Number.isInteger(id) || id <= 0) {
		throw createError({ statusCode: 400, statusMessage: "invalid_id" });
	}

	await requireCapability(event, "fleet:manage");
	rateLimit(event, { limit: 40, windowMs: 60_000 });

	const db = prisma();

	// ¿Existe el registro? (evita un 500 de Prisma por P2025)
	const exists = await (async () => {
		switch (resource) {
			case "buses":
				return db.bus.findUnique({ where: { id }, select: { id: true } });
			case "stops":
				return db.stop.findUnique({ where: { id }, select: { id: true } });
			case "schedules":
				return db.schedule.findUnique({ where: { id }, select: { id: true } });
			case "drivers":
				return db.driver.findUnique({ where: { id }, select: { id: true } });
			case "notifications":
				return db.notification.findUnique({
					where: { id },
					select: { id: true },
				});
			case "reports":
				return db.report.findUnique({ where: { id }, select: { id: true } });
		}
	})();
	if (!exists) {
		throw createError({ statusCode: 404, statusMessage: "not_found" });
	}

	// ── DELETE ──────────────────────────────────────────────────────────
	if (event.method === "DELETE") {
		switch (resource) {
			case "buses":
				await db.bus.delete({ where: { id } });
				break;
			case "stops":
				// Las rutas se relacionan con paradas por tabla intermedia
				// implícita: Prisma limpia las filas de enlace al borrar.
				await db.stop.delete({ where: { id } });
				break;
			case "schedules":
				await db.schedule.delete({ where: { id } });
				break;
			case "drivers":
				// `Route.driverId` es un escalar SIN FK: si no se limpia, la
				// ruta se queda apuntando a un conductor inexistente.
				await db.route.updateMany({
					where: { driverId: id },
					data: { driverId: null },
				});
				await db.driver.delete({ where: { id } });
				break;
			case "notifications":
				await db.notification.delete({ where: { id } });
				break;
			case "reports":
				await db.report.delete({ where: { id } });
				break;
		}
		return { ok: true };
	}

	// ── PATCH ───────────────────────────────────────────────────────────
	if (event.method !== "PATCH") {
		throw createError({ statusCode: 405, statusMessage: "method_not_allowed" });
	}

	const body = await readBody<Record<string, unknown>>(event).catch(() => null);
	if (!body || typeof body !== "object") {
		throw createError({ statusCode: 400, statusMessage: "invalid_body" });
	}

	const parsed = parseOr400(updateSchemas[resource], body) as Record<
		string,
		unknown
	>;

	// `routes`/`buses`/`drivers` usan `routeId`; los reportes, `lineId`.
	const routeRef =
		parsed.routeId !== undefined ? parsed.routeId : parsed.lineId;
	if (routeRef !== undefined) {
		await assertRouteExists(routeRef as string | null);
	}

	switch (resource) {
		case "buses": {
			if (typeof parsed.number === "string") {
				const clash = await db.bus.findUnique({
					where: { number: parsed.number },
					select: { id: true },
				});
				if (clash && clash.id !== id) {
					throw createError({
						statusCode: 409,
						statusMessage: "number_exists",
					});
				}
			}
			return db.bus.update({ where: { id }, data: parsed as never });
		}
		case "stops":
			return db.stop.update({ where: { id }, data: parsed as never });
		case "schedules":
			return db.schedule.update({ where: { id }, data: parsed as never });
		case "drivers":
			return db.driver.update({ where: { id }, data: parsed as never });
		case "notifications":
			return db.notification.update({ where: { id }, data: parsed as never });
		case "reports":
			return db.report.update({ where: { id }, data: parsed as never });
	}
});
