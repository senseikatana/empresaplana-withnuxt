import { z } from "zod";
import { requireCapability } from "../../../utils/acl";

const updateSchema = z.object({
	code: z.string().trim().min(1).max(20).optional(),
	name: z.string().trim().min(1).max(200).optional(),
	origin: z.string().trim().max(120).optional(),
	destination: z.string().trim().max(120).optional(),
	status: z.enum(["active", "inactive", "delayed", "maintenance"]).optional(),
	color: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/, "color_hext")
		.optional(),
});

export default defineEventHandler(async (event) => {
	await requireCapability(event, "fleet:manage");
	rateLimit(event, { limit: 30, windowMs: 60_000 });

	const { id } = await getValidatedRouterParams(
		event,
		z.object({ id: z.string().min(1).max(40) }).parse,
	);
	const data = parseOr400(
		updateSchema,
		await readBody(event).catch(() => ({})),
	);

	const existing = await prisma().route.findUnique({
		where: { id },
		select: { id: true, code: true },
	});
	if (!existing) {
		throw createError({ statusCode: 404, statusMessage: "not_found" });
	}

	// El código es único: comprobar contra el código del otro, no contra el id.
	if (data.code && data.code !== existing.code) {
		const clash = await prisma().route.findUnique({
			where: { code: data.code },
			select: { id: true },
		});
		if (clash && clash.id !== id) {
			throw createError({ statusCode: 409, statusMessage: "code_exists" });
		}
	}

	const route = await prisma().route.update({ where: { id }, data });
	return { route };
});
