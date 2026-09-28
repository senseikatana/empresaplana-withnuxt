import { sendVerificationEmail } from "../../utils/verification";

export default defineEventHandler(async (event) => {
	rateLimit(event, { limit: 3, windowMs: 15 * 60_000 });

	const session = await requireCapability(event, "dashboard:access");
	const user = await prisma().user.findUnique({ where: { id: session.id } });
	if (!user) {
		throw createError({ statusCode: 404, statusMessage: "Usuari no trobat" });
	}
	if (user.emailVerified) {
		return { ok: true, alreadyVerified: true };
	}

	await sendVerificationEmail({
		id: user.id,
		email: user.email,
		name: user.name,
	});

	return { ok: true, alreadyVerified: false };
});
