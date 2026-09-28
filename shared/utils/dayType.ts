// Day-type resolution for the route finder.
// The old Empresa Plana site groups service days as:
//   feiners (Mon-Fri, non-holiday) | dissabtes (Saturdays) | diumenges (Sundays + public holidays)

export type DayType = "feiners" | "dissabtes" | "diumenges";

// Public holidays in Catalonia for 2026.
export const HOLIDAYS_2026: string[] = [
	"2026-01-01",
	"2026-01-06",
	"2026-04-03",
	"2026-04-06",
	"2026-05-01",
	"2026-06-24",
	"2026-08-15",
	"2026-09-11",
	"2026-10-12",
	"2026-12-08",
	"2026-12-25",
	"2026-12-26",
];

export function resolveDayType(date: string | null | undefined): DayType {
	if (!date) return "feiners";
	if (HOLIDAYS_2026.includes(date)) return "diumenges";
	const parsed = new Date(`${date}T12:00:00Z`);
	if (Number.isNaN(parsed.getTime())) return "feiners";
	const day = parsed.getUTCDay();
	if (day === 0) return "diumenges";
	if (day === 6) return "dissabtes";
	return "feiners";
}
