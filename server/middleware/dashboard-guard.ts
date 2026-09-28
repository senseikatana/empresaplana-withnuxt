import { getSessionUser } from "../utils/auth";

const DASHBOARD_PATH = /^\/(?:es|en|fr)?\/dashboard(?:\/|$)/;
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

	const prefix = path.match(/^\/(es|en|fr)(?=\/dashboard)/)?.[0] ?? "";
	const normalized = path.replace(/^\/(?:es|en|fr)(?=\/dashboard)/, "");
	const loginPath = `${prefix}/dashboard/login`;

	if (SESSION_FREE_PATHS.includes(normalized)) return;

	const session = await getSessionUser(event);
	if (!session) {
		return sendRedirect(
			event,
			`${loginPath}?redirect=${encodeURIComponent(path)}`,
			302,
		);
	}

	if (VERIFICATION_FREE_PATHS.includes(normalized)) return;

	const user = await prisma().user.findUnique({
		where: { id: session.id },
		select: { emailVerified: true },
	});

	if (!user) {
		return sendRedirect(event, loginPath, 302);
	}
	if (!user.emailVerified) {
		return sendRedirect(event, `${prefix}/dashboard/pending`, 302);
	}
});
