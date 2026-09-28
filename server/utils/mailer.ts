import { createLogger } from "./logger";

const log = createLogger("mailer");

export type MailMessage = {
	to: string;
	subject: string;
	html: string;
	text?: string;
};

/**
 * Sends an email through Resend when RESEND_API_KEY is configured.
 * Without a provider it logs the message (development / demo) and returns false,
 * so callers can keep the flow working without failing.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
	const apiKey = process.env.RESEND_API_KEY;
	const from =
		process.env.MAIL_FROM ?? "Empresa Plana <no-reply@empresaplana.cat>";

	if (!apiKey) {
		log.warn("RESEND_API_KEY not set: email not sent (logged only)", {
			to: message.to,
			subject: message.subject,
		});
		log.info(
			`MAIL to=${message.to} subject=${message.subject}\n${message.text ?? message.html}`,
		);
		return false;
	}

	try {
		const response = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from,
				to: [message.to],
				subject: message.subject,
				html: message.html,
				...(message.text ? { text: message.text } : {}),
			}),
		});
		if (!response.ok) {
			log.error("Resend send failed", {
				status: response.status,
				body: await response.text().catch(() => ""),
			});
			return false;
		}
		return true;
	} catch (error) {
		log.error("Resend request error", { error });
		return false;
	}
}
