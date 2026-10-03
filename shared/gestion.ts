/**
 * Registro de las secciones CRUD del panel de gestión.
 *
 * Está en `shared/` porque lo consumen tanto los endpoints
 * (`server/api/gestion/*`) como el componente de lista/formulario
 * (`app/components/GestionCrud.vue`): un único sitio donde definir qué
 * campos tiene cada entidad.
 *
 * Las etiquetas salen de `app.gestion.entities.{entitat}.fields.{camp}`
 * de los diccionarios i18n, que ya existían traducidos en los 3 idiomas.
 */

export type GestionResource =
	| "buses"
	| "stops"
	| "schedules"
	| "drivers"
	| "notifications"
	| "reports";

/** Traducción de `resource` (URL) → modelo de Prisma (nombre del delegate). */
export const PRISMA_MODEL: Record<GestionResource, string> = {
	buses: "bus",
	stops: "stop",
	schedules: "schedule",
	drivers: "driver",
	notifications: "notification",
	reports: "report",
};

/** Prefijo i18n de las etiquetas de campo. */
export const I18N_ENTITY: Record<GestionResource, string> = {
	buses: "bus",
	stops: "stop",
	schedules: "schedule",
	drivers: "driver",
	notifications: "notification",
	reports: "report",
};

export type FieldType = "text" | "number" | "textarea" | "select" | "route";

export interface GestionField {
	key: string;
	type: FieldType;
	/** Obligatorio a nivel de formulario y de BD. */
	required?: boolean;
	maxLength?: number;
	/** Valores literales para `select`. */
	literalOptions?: string[];
	/**
	 * Prefijo i18n de las etiquetas de `literalOptions`.
	 * Por defecto `app.gestion.states`; las notificaciones usan
	 * `app.gestion.notifications.types`.
	 */
	optionsI18n?: string;
	/** Placeholders / ayuda en i18n (opcional). */
	placeholderKey?: string;
	/** Si existe, el campo lleva el botón "Generar amb IA". */
	ai?: "label" | "name" | "description";
}

export interface GestionEntity {
	/** Segmento de URL: /api/gestion/{resource} */
	resource: GestionResource;
	/** Clave del diccionario i18n: app.gestion.entities.{key} */
	entityKey: string;
	/** Título de la sección: app.gestion.nav.{titleKey} */
	titleKey: string;
	fields: GestionField[];
	/**
	 * Campos que se muestran en la tarjeta de la lista (además del estado).
	 * Se resuelven con `app.gestion.entities.{key}.fields.{campo}`.
	 */
	summary: string[];
	/** Clave de la columna de búsqueda libre. */
	searchKeys: string[];
}

const STATUS_FIELD: GestionField = {
	key: "status",
	type: "select",
	literalOptions: ["active", "delayed", "maintenance", "inactive"],
};

/** `routeId` se resuelve con `/api/fleet/routes`, que ya existe. */
const ROUTE_FIELD: GestionField = { key: "routeId", type: "route" };

export const GESTION_ENTITIES: Record<GestionResource, GestionEntity> = {
	buses: {
		resource: "buses",
		entityKey: "bus",
		titleKey: "buses",
		fields: [
			{
				key: "number",
				type: "text",
				required: true,
				maxLength: 20,
			},
			{ key: "plate", type: "text", required: true, maxLength: 20 },
			{ key: "company", type: "text", maxLength: 100 },
			{ key: "capacity", type: "number" },
			ROUTE_FIELD,
			STATUS_FIELD,
		],
		summary: ["number", "plate", "company"],
		searchKeys: ["number", "plate", "company"],
	},
	stops: {
		resource: "stops",
		entityKey: "stop",
		titleKey: "stops",
		fields: [
			{ key: "name", type: "text", required: true, maxLength: 200, ai: "name" },
			{ key: "address", type: "text", maxLength: 300 },
			{ key: "lat", type: "number" },
			{ key: "lng", type: "number" },
		],
		summary: ["name", "address"],
		searchKeys: ["name", "address"],
	},
	schedules: {
		resource: "schedules",
		entityKey: "schedule",
		titleKey: "schedules",
		fields: [
			ROUTE_FIELD,
			{
				key: "departure",
				type: "text",
				required: true,
				maxLength: 10,
			},
			{ key: "arrival", type: "text", required: true, maxLength: 10 },
			{ key: "frequency", type: "text", maxLength: 30 },
			{ key: "days", type: "text", maxLength: 50 },
			STATUS_FIELD,
		],
		summary: ["departure", "arrival", "frequency"],
		searchKeys: ["routeId", "departure", "arrival", "days"],
	},
	drivers: {
		resource: "drivers",
		entityKey: "driver",
		titleKey: "drivers",
		fields: [
			{ key: "name", type: "text", required: true, maxLength: 120 },
			{ key: "phone", type: "text", maxLength: 30 },
			{ key: "license", type: "text", maxLength: 30 },
			{ key: "busNumber", type: "text", maxLength: 20 },
			ROUTE_FIELD,
			{ key: "shiftDays", type: "text", maxLength: 30 },
			{ key: "shiftHours", type: "text", maxLength: 30 },
			STATUS_FIELD,
		],
		summary: ["name", "license", "phone"],
		searchKeys: ["name", "phone", "license"],
	},
	notifications: {
		resource: "notifications",
		entityKey: "notification",
		titleKey: "notifications",
		fields: [
			{
				key: "type",
				type: "select",
				required: true,
				literalOptions: ["delay", "accident", "detour", "info"],
				// Las etiquetas de tipo viven en su propio namespace, no en
				// `app.gestion.states.*` como el resto de selects.
				optionsI18n: "app.gestion.notifications.types",
			},
			// Los dos campos de texto llevan asistencia IA: aquí SÍ es útil,
			// porque el contenido es redactable (a diferencia de un número de
			// bus o una hora, que son datos que la IA no puede conocer).
			{
				key: "title",
				type: "text",
				required: true,
				maxLength: 200,
				ai: "name",
			},
			{
				key: "desc",
				type: "text",
				required: true,
				maxLength: 1000,
				ai: "description",
			},
			ROUTE_FIELD,
		],
		summary: ["title", "desc"],
		searchKeys: ["title", "desc", "type"],
	},
	reports: {
		resource: "reports",
		entityKey: "report",
		titleKey: "reports",
		fields: [
			// `Report.lineId` apunta a `Route.id`; el componente lo resuelve con
			// `/api/fleet/routes` igual que el resto de campos `route`.
			{ key: "lineId", type: "route", required: true },
			{ key: "stop", type: "text", maxLength: 200 },
			{
				key: "action",
				type: "select",
				required: true,
				// Mismas acciones que el bus tracking público.
				literalOptions: [
					"passed",
					"onTime",
					"late",
					"early",
					"notPassed",
					"cancelled",
				],
				optionsI18n: "busTracking.actions",
			},
			{ key: "minutesLate", type: "number" },
			{ key: "comment", type: "text", maxLength: 500 },
		],
		summary: ["stop", "action", "minutesLate"],
		searchKeys: ["lineId", "stop", "action", "comment"],
	},
};

export const GESTION_RESOURCES = Object.keys(
	GESTION_ENTITIES,
) as GestionResource[];

export function isGestionResource(value: string): value is GestionResource {
	return value in GESTION_ENTITIES;
}
