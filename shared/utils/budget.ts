import { z } from "zod";

/**
 * Contrato de la API de presupuestos (server + form).
 * El DDL vive en InsForge; esto solo valida el payload.
 */
export const budgetApiSchema = z.object({
	name: z.string().trim().min(1).max(200),
	email: z.string().trim().email().max(200),
	phone: z.string().trim().max(30).optional().default(""),
	company: z.string().trim().max(200).optional().default(""),
	reasonId: z.string().trim().min(1).max(60),
	description: z.string().trim().min(1).max(2000),
	departureCity: z.string().trim().max(120).optional().default(""),
	departureDay: z.string().trim().max(12).optional().default(""),
	departureTime: z.string().trim().max(10).optional().default(""),
	arrivalCity: z.string().trim().max(120).optional().default(""),
	arrivalDay: z.string().trim().max(12).optional().default(""),
	arrivalTime: z.string().trim().max(10).optional().default(""),
	people: z.string().trim().max(10).optional().default(""),
});

export type BudgetApiData = z.infer<typeof budgetApiSchema>;
