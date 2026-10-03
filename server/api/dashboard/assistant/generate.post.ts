import { generateText } from "ai";
import { z } from "zod";
import { assistantModel } from "../../../utils/assistant";

/**
 * Generación puntual de contenido para los formularios del panel
 * ("Generar amb IA"). No es una conversación: recibe el campo y devuelve
 * texto listo para insertar. El chat completo sigue en `[id].post.ts`.
 */

const bodySchema = z.object({
	/** Nombre del campo, p. ej. "name", "bio", "description". */
	field: z.string().min(1).max(60),
	/** Qué hay alrededor en el formulario (entidad, otros campos). */
	context: z.string().max(1200).optional(),
	/** Texto que ya hay en el campo: se pide mejorar/ampliar, no repetir. */
	existing: z.string().max(2000).optional(),
	/** Idioma del texto generado. */
	locale: z.enum(["ca", "es", "en"]).default("ca"),
	/** Forma del resultado: corta (etiqueta/nombre) o larga (descripción). */
	kind: z.enum(["label", "name", "description"]).default("description"),
});

/**
 * Reglas del generador: devuelve SOLO el texto, sin markdown ni preámbulo,
 * para que el frontend pueda insertarlo en el campo tal cual.
 */
const GENERATOR_SYSTEM_PROMPT = `Ets el generador de contingut de la intranet d'Empresa Plana (transport públic a la Costa Daurada i el Camp de Tarragona).

Tasca: escriure el text demanat per a un camp d'un formulari.

Regles estrictes:
- Respon NOMÉS amb el text generat. Cap cometa, cap explicació, cap salutació, cap títol markdown.
- Idioma: l'indicat a la petició.
- Respecta la llargada demanada.
- No inventis dades verificables (horaris, preus, telèfons, matrícules). Si en falten, deixa un marcador entre claus com {horari}.
- Estil: sobri i professional, com el de la web d'Empresa Plana.

Llargades:
- label: entre 3 i 30 caràcters, sovint en majúscules o forma curta.
- name: entre 4 i 60 caràcters, una sola línia, títol propi (ex.: "L4 Costa Daurada").
- description: 1 o 2 frases, entre 60 i 220 caràcters.`;

export default defineEventHandler(async (event) => {
	await requireCapability(event, "chat:access", { requireVerified: true });
	// Endpoint de SG IA sin sesión propia: se limita por usuario para que un
	// formulario mal programado no vacíe la cuota de OpenRouter.
	rateLimit(event, { limit: 12, windowMs: 60_000 });

	const body = parseOr400(bodySchema, await readBody(event).catch(() => ({})));

	const localeLabel =
		body.locale === "es"
			? "castellà"
			: body.locale === "en"
				? "English"
				: "català";

	const userPrompt = [
		`Idioma: ${localeLabel}.`,
		`Camp: ${body.field}.`,
		`Forma: ${body.kind}.`,
		body.context ? `Context del formulari:\n${body.context}` : "",
		body.existing?.trim()
			? `Text actual del camp (millora'l, no el repeteixi tal qual):\n${body.existing.trim()}`
			: "",
	]
		.filter(Boolean)
		.join("\n\n");

	try {
		const { text } = await generateText({
			model: assistantModel(),
			system: GENERATOR_SYSTEM_PROMPT,
			prompt: userPrompt,
		});

		// Defensa por si el modelo obedece a medias: sin preámbulo ni comillas.
		const clean = text
			.trim()
			.replace(/^["'`«»]+|["'`«»]+$/g, "")
			.replace(
				/^(aqu[íi] tens?|aquí tens|here(?:'s| is)|cl(o|ó) est[àa]|text:)\s*/i,
				"",
			)
			.trim();

		if (!clean) {
			throw createError({
				statusCode: 502,
				statusMessage: "assistant_empty_response",
			});
		}
		return { text: clean };
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"statusCode" in error &&
			(error as { statusCode?: number }).statusCode === 503
		) {
			throw error;
		}
		// 503 = sin API key (assistantModel) → se propaga; el resto, 502.
		if (/OPENROUTER|not configured|503/i.test(String(error))) {
			throw createError({
				statusCode: 503,
				statusMessage: "assistant_not_configured",
			});
		}
		throw createError({
			statusCode: 502,
			statusMessage: "assistant_generation_failed",
		});
	}
});
