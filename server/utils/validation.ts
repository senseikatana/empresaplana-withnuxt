import type { ZodType, z } from "zod";

/**
 * Valida con zod y convierte el fallo en un **400** legible.
 *
 * `schema.parse()` lanza `ZodError`, y Nitro no lo traduce: el cliente recibía
 * un **500 "Server Error"** por enviar un formulario incompleto. `safeParse`
 * permite devolver 400 con el campo que falla.
 *
 * Se genérica sobre el schema (`S extends ZodType`) y no sobre su salida
 * porque en zod v4 `ZodType<Output, Input>` hace que el `Input` sea
 * invariante y un schema concreto no encaje en `ZodType<T>`.
 *
 * `statusMessage` va corto y seguro para URL; el detalle va en `message`.
 */
export function parseOr400<S extends ZodType>(
	schema: S,
	value: unknown,
): z.infer<S> {
	const result = schema.safeParse(value);
	if (!result.success) {
		const issue = result.error.issues[0];
		const field = issue?.path?.join(".") ?? "";
		throw createError({
			statusCode: 400,
			statusMessage: "invalid_body",
			message: field
				? `${field}: ${issue?.message ?? "invalid"}`
				: (issue?.message ?? "invalid_body"),
		});
	}
	return result.data;
}
