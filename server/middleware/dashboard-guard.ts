import { getSessionUser } from "../utils/auth";

const DASHBOARD_PATH = /^\/(?:es|en)?\/dashboard(?:\/|$)/;
const SESSION_FREE_PATHS = ["/dashboard/login", "/dashboard/register"];
const VERIFICATION_FREE_PATHS = ["/dashboard/pending"];

/**
 * SSR guard for the dashboard: guarantees server-side redirects before any
 * protected page is rendered, independently of client route middleware.
 * Denies access by session and email verification; capabilities are enforced
 * per-endpoint with `requireCapability`.
 */
export default defineEventHandler(async (event) => {
	const path = (event.path ?? "").split("?")[0] ?? "";
	if (!DASHBOARD_PATH.test(path)) return;

	const prefix = path.match(/^\/(es|en)(?=\/dashboard)/)?.[0] ?? "";
	const normalized = path.replace(/^\/(?:es|en)(?=\/dashboard)/, "");
	const loginPath = `${prefix}/dashboard/login`;

	if (SESSION_FREE_PATHS.includes(normalized)) return;

	const session = await getSessionUser(event);
	if (!session) {
		// Ruta limpia: sin query de retorno. El login siempre aterriza en el panel.
		return sendRedirect(event, loginPath, 302);
	}

	if (VERIFICATION_FREE_PATHS.includes(normalized)) return;

	// `emailVerified` viene de la sesión (Better Auth lee `User` en cada
	// getSession, sin cookie cache en setups con BD): antes era una consulta
	// extra en CADA petición al panel. Si el usuario ya no existe, la sesión
	// no valida y `getSessionUser` ha devuelto null más arriba.
	if (!session.emailVerified) {
		return sendRedirect(event, `${prefix}/dashboard/pending`, 302);
	}
});
