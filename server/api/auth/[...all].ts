import { toWebRequest } from "h3";
import { auth } from "../../auth";

/**
 * Handler de Better Auth (`/api/auth/*`).
 *
 * Sirve los endpoints nativos (`/sign-in/username`, `/sign-up/email`,
 * `/sign-out`, `/get-session`, `/verify-email`, …) que ya usa el cliente
 * oficial de Vue (`app/lib/auth-client.ts` → login, registro y logout de la UI).
 *
 * Las rutas concretas del panel (`/api/auth/login`, `/logout`, `/register`,
 * `/resend-verification`) tienen prioridad en Nitro sobre este wildcard, así
 * que su contrato HTTP (401 / 409 `username_exists` / `{ok}`) no cambia.
 */
export default defineEventHandler(async (event) => {
	return auth.handler(toWebRequest(event));
});
