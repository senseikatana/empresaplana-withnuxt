import { z } from "zod";
import { requireCapability } from "../../utils/acl";

const createSchema = z.object({
	code: z.string().trim().min(1).max(20),
	name: z.string().trim().min(1).max(200),
	origin: z.string().trim().max(120),
	destination: z.string().trim().max(120),
	status: z
		.enum(["active", "inactive", "delayed", "maintenance"])
		.default("active"),
	color: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/, "color_hext")
		.default("#013990"),
});

/** `Route.id` es `String @id` SIN default: hay que generarlo. */
function slugify(code: string): string {
	return (
		code
			.toLowerCase()
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 40) || "ruta"
	);
}

export default defineEventHandler(async (event) => {
	await requireCapability(event, "fleet:manage");
	rateLimit(event, { limit: 20, windowMs: 60_000 });

	const data = parseOr400(
		createSchema,
		await readBody(event).catch(() => ({})),
	);

	const clash = await prisma().route.findUnique({
		where: { code: data.code },
		select: { id: true },
	});
	if (clash) {
		throw createError({ statusCode: 409, statusMessage: "code_exists" });
	}

	// Slug del código con sufijo si ya existe (dos códigos pueden colisionar
	// al limpiarse, p. ej. "L 68" y "L68").
	let id = slugify(data.code);
	const taken = await prisma().route.findUnique({
		where: { id },
		select: { id: true },
	});
	if (taken) id = `${id}-${crypto.randomUUID().slice(0, 6)}`;

	const route = await prisma().route.create({ data: { ...data, id } });
	return { route };
});
