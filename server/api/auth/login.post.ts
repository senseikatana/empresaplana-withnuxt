import { z } from "zod";
import { isRole } from "#shared/acl";
import { auth } from "../../auth";
import {
	adoptAuthResponse,
	authErrorMessage,
	webHeaders,
} from "../../utils/auth";
import { createLogger } from "../../utils/logger";

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

	// Pre-chequeo para mantener el contrato: roles corruptos y fantasmas
	// anónimos (passkey vacío) nunca autentican, igual que antes.
	const user = await prisma().user.findUnique({ where: { username } });
	if (!user || !isRole(user.role)) {
		log.warn("Login failed", { username });
		throw createError({
			statusCode: 401,
			statusMessage: "Credencials invàlides",
		});
	}

	// Con `asResponse: true` Better Auth NO lanza en credenciales malas:
	// devuelve un Response 4xx, así que hay que comprobar el estado.
	let signedIn = false;
	try {
		const response = await auth.api.signInUsername({
			body: { username, password: passkey },
			headers: webHeaders(event),
			asResponse: true,
		});
		signedIn = adoptAuthResponse(event, response);
		if (!signedIn) {
			log.warn("Login rejected by Better Auth", {
				username,
				status: response.status,
				reason: authErrorMessage(response),
			});
		}
	} catch (error) {
		log.warn("Login error", {
			username,
			reason: error instanceof Error ? error.message : "unknown",
		});
	}

	if (!signedIn) {
		throw createError({
			statusCode: 401,
			statusMessage: "Credencials invàlides",
		});
	}

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
