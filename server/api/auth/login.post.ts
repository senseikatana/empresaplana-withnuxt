import { z } from "zod";
import { isRole } from "#shared/acl";
import { setSessionUser } from "../../utils/auth";
import { createLogger } from "../../utils/logger";
import { verifyPasskey } from "../../utils/passkey";

const log = createLogger("api:auth:login");
const loginSchema = z.object({
	username: z.string().min(1).max(60),
	passkey: z.string().min(1).max(128),
});

export default defineEventHandler(async (event) => {
	rateLimit(event, { limit: 10, windowMs: 15 * 60_000 });

	const parsed = loginSchema.safeParse(await readBody(event).catch(() => ({})));
	if (!parsed.success) {
		throw createError({ statusCode: 400, statusMessage: "Falten credencials" });
	}

	const { username, passkey } = parsed.data;

	const user = await prisma().user.findUnique({ where: { username } });
	// Fantasmas anónimos (passkey "") y roles corruptos nunca autentican.
	if (!user || !isRole(user.role) || !verifyPasskey(passkey, user.passkey)) {
		log.warn("Login failed", { username });
		throw createError({
			statusCode: 401,
			statusMessage: "Credencials invàlides",
		});
	}

	await setSessionUser(event, {
		id: user.id,
		username: user.username,
		role: user.role,
	});
	log.info("Login successful", { userId: user.id, role: user.role });

	return {
		user: {
			id: user.id,
			username: user.username,
			name: user.name,
			fullName: user.fullName,
			email: user.email,
			role: user.role,
		},
	};
});
