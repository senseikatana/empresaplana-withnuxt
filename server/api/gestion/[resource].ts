import { z } from "zod";
import { type GestionResource, isGestionResource } from "#shared/gestion";
import { requireCapability } from "../../utils/acl";

/**
 * CRUD genérico de gestión: GET (lista) y POST (crear).
 *
 * Un solo endpoint para buses/paradas/horarios/conductores, dirigido por el
 * registro de `shared/gestion.ts`. El de rutas vive aparte en
 * `/api/fleet/routes*` porque `Route.id` es un slug `String` y no un
 * autoincrement, así que necesita su propia generación de id.
 */

const STATUS = ["active", "delayed", "maintenance", "inactive"] as const;

/**
 * Los formularios llegan con strings; `z.coerce` convierte los numéricos y
 * los opcionales se normalizan a `null` para que Prisma no reciba "".
 */
const createSchemas = {
	buses: z.object({
		number: z.string().trim().min(1).max(20),
		plate: z.string().trim().min(1).max(20),
		company: z.string().trim().max(100).default("Empresa Plana"),
		capacity: z.coerce.number().int().min(0).max(300).default(50),
		routeId: z.string().trim().max(40).nullish(),
		status: z.enum(STATUS).default("active"),
	}),
	stops: z.object({
		name: z.string().trim().min(1).max(200),
		address: z.string().trim().max(300).default(""),
		lat: z.coerce.number().min(-90).max(90),
		lng: z.coerce.number().min(-180).max(180),
	}),
	schedules: z.object({
		routeId: z.string().trim().min(1).max(40),
		departure: z.string().trim().min(1).max(10),
		arrival: z.string().trim().min(1).max(10),
		frequency: z.string().trim().max(30).default("60 min"),
		days: z.string().trim().max(50).default("Lun–Dom"),
		status: z.enum(STATUS).default("active"),
	}),
	drivers: z.object({
		name: z.string().trim().min(1).max(120),
		phone: z.string().trim().max(30).default(""),
		license: z.string().trim().max(30).default(""),
		busNumber: z.string().trim().max(20).nullish(),
		routeId: z.string().trim().max(40).nullish(),
		shiftDays: z.string().trim().max(30).nullish(),
		shiftHours: z.string().trim().max(30).nullish(),
		status: z.enum(STATUS).default("active"),
	}),
	notifications: z.object({
		type: z.enum(["delay", "accident", "detour", "info"]),
		title: z.string().trim().min(1).max(200),
		desc: z.string().trim().min(1).max(1000),
		routeId: z.string().trim().max(40).nullish(),
	}),
	reports: z.object({
		lineId: z.string().trim().min(1).max(40),
		stop: z.string().trim().max(200).default(""),
		action: z.enum([
			"passed",
			"onTime",
			"late",
			"early",
			"notPassed",
			"cancelled",
		]),
		minutesLate: z.coerce.number().int().min(0).max(600).nullish(),
		comment: z.string().trim().max(500).nullish(),
	}),
} satisfies Record<GestionResource, z.ZodTypeAny>;

function resourceOf(event: { context: { params?: Record<string, string> } }) {
	const raw = event.context.params?.resource ?? "";
	if (!isGestionResource(raw)) {
		throw createError({ statusCode: 404, statusMessage: "unknown_resource" });
	}
	return raw;
}

export async function assertRouteExists(routeId?: string | null) {
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
	const resource = resourceOf(event);

	// ── GET: lista ──────────────────────────────────────────────────────
	if (event.method === "GET") {
		await requireCapability(event, "fleet:view", { requireVerified: true });
		const db = prisma();
		switch (resource) {
			case "buses":
				return db.bus.findMany({ orderBy: { number: "asc" } });
			case "stops":
				return db.stop.findMany({ orderBy: { name: "asc" } });
			case "schedules":
				return db.schedule.findMany({
					orderBy: [{ routeId: "asc" }, { departure: "asc" }],
				});
			case "drivers":
				return db.driver.findMany({ orderBy: { name: "asc" } });
			case "notifications":
				return db.notification.findMany({
					orderBy: { createdAt: "desc" },
					take: 100,
				});
			case "reports":
				return db.report.findMany({
					orderBy: { createdAt: "desc" },
					take: 200,
				});
		}
	}

	// ── POST: crear ─────────────────────────────────────────────────────
	await requireCapability(event, "fleet:manage");
	rateLimit(event, { limit: 30, windowMs: 60_000 });

	const body = await readBody<Record<string, unknown>>(event).catch(() => null);
	if (!body || typeof body !== "object") {
		throw createError({ statusCode: 400, statusMessage: "invalid_body" });
	}

	const schema = createSchemas[resource];
	const parsed = parseOr400(schema, body) as unknown as Record<string, unknown>;
	const db = prisma();

	switch (resource) {
		case "buses": {
			const number = String(parsed.number);
			const clash = await db.bus.findUnique({
				where: { number },
				select: { id: true },
			});
			if (clash) {
				throw createError({ statusCode: 409, statusMessage: "number_exists" });
			}
			await assertRouteExists(parsed.routeId as string | null | undefined);
			return db.bus.create({ data: parsed as never });
		}
		case "stops":
			return db.stop.create({ data: parsed as never });
		case "schedules": {
			await assertRouteExists(parsed.routeId as string);
			return db.schedule.create({ data: parsed as never });
		}
		case "drivers": {
			await assertRouteExists(parsed.routeId as string | null | undefined);
			return db.driver.create({ data: parsed as never });
		}
		case "notifications": {
			await assertRouteExists(parsed.routeId as string | null | undefined);
			return db.notification.create({ data: parsed as never });
		}
		case "reports": {
			await assertRouteExists(parsed.lineId as string);
			return db.report.create({ data: parsed as never });
		}
	}
});
