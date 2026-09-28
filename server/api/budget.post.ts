import { randomUUID } from "node:crypto";
import { budgetApiSchema } from "#shared/utils/budget";

export default defineEventHandler(async (event) => {
	rateLimit(event, { limit: 20, windowMs: 60_000 });

	const parsed = budgetApiSchema.safeParse(
		await readBody(event).catch(() => ({})),
	);
	if (!parsed.success) {
		throw createError({ statusCode: 400, statusMessage: "Dades invàlides" });
	}

	const d = parsed.data;

	// Asociar a un usuario si hay sesión (cliente autenticado); si no, presupuesto anónimo.
	const session = await getSessionUser(event);
	const userId = session?.id ?? (await ensureAnonymousUser(d.email));

	const budget = await prisma().budget.create({
		data: {
			id: randomUUID(),
			userId,
			clientName: d.name,
			email: d.email,
			phone: d.phone,
			company: d.company || null,
			reasonId: d.reasonId,
			description: d.description || null,
			departureCity: d.departureCity,
			departureDay: d.departureDay,
			departureTime: d.departureTime,
			arrivalCity: d.arrivalCity,
			arrivalDay: d.arrivalDay,
			arrivalTime: d.arrivalTime,
			people: d.people,
			status: "received",
		},
	});

	return { id: budget.id, status: budget.status };
});

// Para presupuestos anónimos: crea (o reutiliza) un usuario fantasma "client"
// ligado al email, para no romper la FK userId. Los fantasmas tienen
// `passkey: ""` (marca) y nunca pueden iniciar sesión: `verifyPasskey` los
// rechaza y el login exige passkey no vacía.
//
// Solo se reutiliza un fantasma PREVIO (passkey ""). Si el email pertenece a
// una cuenta real (passkey con sal), se crea un fantasma nuevo: así los
// presupuestos anónimos nunca se pegan a cuentas reales.
async function ensureAnonymousUser(email: string): Promise<number> {
	const ghost = await prisma().user.findFirst({
		where: { email, role: "client", passkey: "" },
	});
	if (ghost) return ghost.id;

	const created = await prisma().user.create({
		data: {
			username: `anon-${randomUUID().slice(0, 8)}`,
			email,
			name: email.split("@")[0] ?? "Anònim",
			fullName: email.split("@")[0] ?? "Anònim",
			phone: "",
			passkey: "",
			role: "client",
		},
	});
	return created.id;
}
