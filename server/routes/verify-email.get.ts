import { verifyVerificationToken } from "../utils/verification";

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const token = typeof query.token === "string" ? query.token : "";

	if (!token) {
		return sendRedirect(event, "/dashboard/login?verify=missing", 302);
	}

	const payload = await verifyVerificationToken(token);
	if (!payload) {
		return sendRedirect(event, "/dashboard/login?verify=invalid", 302);
	}

	await prisma().user.update({
		where: { id: payload.id },
		data: { emailVerified: true },
	});

	return sendRedirect(event, "/dashboard?verified=1", 302);
});
