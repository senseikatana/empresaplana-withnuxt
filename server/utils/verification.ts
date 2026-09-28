import { jwtVerify, SignJWT } from "jose";
import { sendMail } from "./mailer";

const ISSUER = "empresaplana";
const PURPOSE = "email-verify";
const TOKEN_TTL = "24h";

function secret(): Uint8Array {
	const value = process.env.AUTH_SECRET;
	if (!value) {
		throw new Error("AUTH_SECRET is not set");
	}
	return new TextEncoder().encode(value);
}

export function appUrl(): string {
	return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function createVerificationToken(user: {
	id: number;
	email: string;
}): Promise<string> {
	return new SignJWT({ email: user.email, purpose: PURPOSE })
		.setSubject(String(user.id))
		.setIssuer(ISSUER)
		.setIssuedAt()
		.setExpirationTime(TOKEN_TTL)
		.setProtectedHeader({ alg: "HS256" })
		.sign(secret());
}

export async function verifyVerificationToken(
	token: string,
): Promise<{ id: number; email: string } | null> {
	try {
		const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER });
		if (payload.purpose !== PURPOSE) return null;
		if (typeof payload.email !== "string") return null;
		const id = Number(payload.sub);
		if (!Number.isInteger(id)) return null;
		return { id, email: payload.email };
	} catch {
		return null;
	}
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export async function sendVerificationEmail(user: {
	id: number;
	email: string;
	name: string;
}): Promise<string> {
	const token = await createVerificationToken(user);
	const link = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
	const safeName = escapeHtml(user.name);

	await sendMail({
		to: user.email,
		subject: "Confirma el teu correu · Empresa Plana",
		text:
			`Hola ${user.name},\n\n` +
			`Confirma el teu correu d'Empresa Plana obrint aquest enllaç:\n${link}\n\n` +
			"L'enllaç caduca en 24 hores. Si no has creat cap compte, ignora aquest missatge.",
		html:
			`<p>Hola ${safeName},</p>` +
			"<p>Confirma el teu correu d'Empresa Plana:</p>" +
			`<p><a href="${link}">Confirmar el correu</a></p>` +
			`<p style="color:#666;font-size:12px">Si el botó no funciona, copia aquesta adreça: ${link}</p>` +
			"<p>L'enllaç caduca en 24 hores.</p>",
	});

	return link;
}
