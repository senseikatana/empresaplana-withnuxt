export default defineEventHandler(async (event) => {
	await requireCapability(event, "budgets:view", { requireVerified: true });

	const budgets = await prisma().budget.findMany({
		orderBy: { createdAt: "desc" },
		take: 100,
	});

	return { budgets };
});
