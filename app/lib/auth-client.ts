import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/vue";

/**
 * Cliente oficial de Better Auth para Nuxt (docs: integrations/nuxt).
 *
 * `usernameClient()` da `signIn.username` y `signUp.email({ username })`.
 * Va importado de `better-auth/client/plugins` y NO de `better-auth/plugins`:
 * el del server trae `api/routes/session`, `db/schema` y `utils/password`, y
 * eso metería código de servidor en el bundle del cliente.
 *
 * El `basePath` por defecto es `/api/auth`, igual que el servidor.
 */
export const authClient = createAuthClient({
	plugins: [usernameClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
