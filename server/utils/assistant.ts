import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** Default model: free auto-router (probes showed the popular free models rate-limiting). */
export const DEFAULT_ASSISTANT_MODEL = "openrouter/free";

/** Modelo por defecto en Ollama: rápido, local y sin cuota. */
export const DEFAULT_OLLAMA_MODEL = "llama3";

/**
 * Proveedor de IA: `openrouter` (nube, gratis con cuota) u `ollama`
 * (local, sin cuota ni datos fuera de la máquina).
 *
 * Se cambia con `ASSISTANT_PROVIDER`. En desarrollo conviene `ollama`; en
 * producción (contenedor InsForge) hace falta `openrouter`, porque ahí no
 * corre el demonio de Ollama.
 */
function assistantProvider(): "openrouter" | "ollama" {
	const raw = (process.env.ASSISTANT_PROVIDER ?? "").trim().toLowerCase();
	if (raw === "ollama") return "ollama";
	if (raw === "openrouter") return "openrouter";
	// Sin decidir: si hay URL de Ollama y no hay API key, se usa lo local.
	if (process.env.OLLAMA_BASE_URL && !process.env.OPENROUTER_API_KEY) {
		return "ollama";
	}
	return "openrouter";
}

export function assistantProviderName(): "openrouter" | "ollama" {
	return assistantProvider();
}

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
	// ── Ollama local ────────────────────────────────────────────────────
	// Expone API compatible con OpenAI en /v1, así que el mismo cliente sirve.
	if (assistantProvider() === "ollama") {
		const baseURL = (
			process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1"
		).replace(/\/+$/, "");

		// `ASSISTANT_MODEL` viene documentado como `openrouter/free`; si se
		// cambia de proveedor sin tocarlo, ese valor no existe en Ollama.
		let model = (process.env.ASSISTANT_MODEL ?? "").trim();
		if (!model || model.startsWith("openrouter/")) {
			model = DEFAULT_OLLAMA_MODEL;
		}

		const ollama = createOpenAICompatible({
			name: "ollama",
			baseURL,
			// Ollama no valida la key: se pasa cualquiera porque el cliente
			// la exige.
			apiKey: "ollama",
		});
		return ollama(model);
	}

	// ── OpenRouter (nube) ───────────────────────────────────────────────
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
