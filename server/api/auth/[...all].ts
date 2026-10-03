import { toWebRequest } from "h3";
import { auth } from "../../auth";

/**
 * Handler de Better Auth (`/api/auth/*`).
 *
 * Sirve los endpoints nativos (`/sign-in/username`, `/sign-out`,
 * `/get-session`, `/verify-email`, …) por si más adelante se usa el cliente
 * oficial de Vue (`better-auth/vue`).
 *
 * Las rutas concretas del panel (`/api/auth/login`, `/logout`, `/register`,
 * `/resend-verification`) tienen prioridad en Nitro sobre este wildcard, así
 * que el contrato con el frontend no cambia.
 */
export default defineEventHandler(async (event) => {
	return auth.handler(toWebRequest(event));
});
