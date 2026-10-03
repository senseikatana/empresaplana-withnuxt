import { z } from "zod";
import { auth } from "../../auth";
import {
	adoptAuthResponse,
	authErrorMessage,
	webHeaders,
} from "../../utils/auth";
import { createLogger } from "../../utils/logger";
import { sendVerificationEmail } from "../../utils/verification";

const log = createLogger("api:auth:register");

const registerSchema = z.object({
	username: z
		.string()
		.min(3)
		.max(60)
		.regex(/^[a-z0-9._-]+$/i, "sin espacios ni símbolos"),
	email: z.string().email().max(200),
	password: z.string().min(8).max(128),
	name: z.string().min(1).max(60),
});

export default defineEventHandler(async (event) => {
	rateLimit(event, { limit: 5, windowMs: 60 * 60_000 });

	const body = await readBody(event).catch(() => ({}));
	const parsed = registerSchema.safeParse(body);
	if (!parsed.success) {
		const first = parsed.error.issues[0];
		throw createError({
			statusCode: 400,
			statusMessage: first?.message ?? "Dades invàlides",
		});
	}

	const { username, name } = parsed.data;
	const email = parsed.data.email.toLowerCase();

	// Contrato 409 intacto: el pre-chequeo decide el código de estado antes
	// de que Better Auth responda con el suyo (que no es 409 en todos los casos).
	const existingUser = await prisma().user.findFirst({
		where: { OR: [{ username }, { email }] },
	});
	if (existingUser) {
		throw createError({
			statusCode: 409,
			statusMessage: "username_exists",
		});
	}

	// El plugin `username` amplía el body de `signUpEmail` con `username`, pero
	// no aparece en su tipo. Se construye en una variable (no en un literal
	// fresco) para que TS valide por estructura y no por propiedades extra.
	const signUpBody: {
		name: string;
		email: string;
		password: string;
		username: string;
	} = { name, email, password: parsed.data.password, username };

	// `asResponse: true` → Better Auth devuelve un Response en vez de lanzar,
	// así que hay que comprobar el estado (409 si el usuario ya existe).
	let created = false;
	try {
		// Crea el usuario, el `Account` con el hash scrypt y la sesión.
		const response = await auth.api.signUpEmail({
			body: signUpBody,
			headers: webHeaders(event),
			asResponse: true,
		});
		created = adoptAuthResponse(event, response);
		if (!created) {
			log.warn("Register rejected by Better Auth", {
				username,
				status: response.status,
				reason: authErrorMessage(response),
			});
		}
	} catch (error) {
		log.warn("Register error", {
			username,
			reason: error instanceof Error ? error.message : "unknown",
		});
	}

	if (!created) {
		// Contrato 409 intacto: carrera contra un registro concurrente.
		const recent = await prisma().user.findFirst({
			where: { OR: [{ username }, { email }] },
		});
		if (recent) {
			throw createError({
				statusCode: 409,
				statusMessage: "username_exists",
			});
		}
		throw createError({ statusCode: 400, statusMessage: "Dades invàlides" });
	}

	const user = await prisma().user.findFirst({ where: { email } });
	if (!user) {
		throw createError({ statusCode: 500, statusMessage: "Error intern" });
	}

	// El registro nunca acepta un rol del cliente: siempre `client`. Los roles
	// privilegiados se asignan aparte, tras verificar el email.
	if (user.role !== "client") {
		await prisma().user.update({
			where: { id: user.id },
			data: { role: "client" },
		});
		user.role = "client";
	}

	// La verificación de email nunca bloquea el registro: si falla el envío,
	// el usuario puede reenviarla desde /dashboard/pending.
	let verificationEmailSent = false;
	try {
		await sendVerificationEmail({
			id: user.id,
			email: user.email,
			name: user.name,
		});
		verificationEmailSent = true;
	} catch {
		verificationEmailSent = false;
	}

	return {
		user: {
			id: user.id,
			username: user.username,
			name: user.name,
			email: user.email,
			role: user.role,
			emailVerified: user.emailVerified,
		},
		verificationRequired: !user.emailVerified,
		verificationEmailSent,
	};
});
