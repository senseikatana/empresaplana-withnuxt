import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** Default model: free, fast and with a large context window. */
export const DEFAULT_ASSISTANT_MODEL = "qwen/qwen3.8-27b:free";

export const ASSISTANT_SYSTEM_PROMPT = `Ets l'assistent intern d'Empresa Plana (transport públic de viatgers a la Costa Daurada, Catalunya).
Ajudes el personal i els usuaris de la intranet amb:
- Horaris, línies, parades i tarifes ATM de la xarxa (L4 Costa, L11 Cambrils-Tarragona, e5 Reus-Salou, etc.).
- Pressupostos de serveis discrecionals, incidències de flota i dubtes operatius.
- Contingut del web i tasques administratives de la intranet.

Regles:
- Respon en l'idioma de l'usuari (català per defecte).
- Sigues concís, clar i útil. Sense capçaleres markdown (#, ##); usa **negreta** per etiquetes.
- Si no tens una dada concreta, digues-ho i indica on consultar-la (buscador de línies, tarifes ATM, etc.).
- No inventis horaris ni preus.`;

export function assistantModel(): LanguageModel {
	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) {
		throw createError({
			statusCode: 503,
			statusMessage: "assistant_not_configured",
		});
	}

	const provider = createOpenAICompatible({
		name: "openrouter",
		baseURL: OPENROUTER_BASE_URL,
		apiKey,
		headers: {
			"HTTP-Referer": process.env.APP_URL ?? "https://empresaplana.cat",
			"X-Title": "Empresa Plana Intranet",
		},
	});

	return provider(process.env.ASSISTANT_MODEL ?? DEFAULT_ASSISTANT_MODEL);
}
