/**
 * Cabeceras de seguridad mínimas para todas las respuestas.
 * La app no se embebe en iframes y sirve binarios propios (avatares),
 * así que DENY + nosniff son seguros aquí.
 */
export default defineEventHandler((event) => {
	setHeaders(event, {
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options": "DENY",
		"Referrer-Policy": "strict-origin-when-cross-origin",
		"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
	});
});
