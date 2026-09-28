import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { requireCapability } from "../../utils/acl";

const MAX_BYTES = 2 * 1024 * 1024;
// Margen para boundaries y cabeceras del multipart.
const MAX_MULTIPART_OVERHEAD = 64 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
// 25 MP: de sobra para un avatar 500×500 y bloquea "decompression bombs".
const MAX_PIXELS = 25_000_000;

/**
 * Sube (o reemplaza) el avatar del usuario en sesión.
 * Se procesa con sharp (auto-rotate, 500x500 cover, JPEG) y se guarda en la DB
 * como bytes: el filesystem del contenedor es efímero.
 */
export default defineEventHandler(async (event) => {
	const session = await requireCapability(event, "profile:edit", {
		requireVerified: true,
	});
	rateLimit(event, { limit: 10, windowMs: 60_000 });

	// Rechaza cuerpos grandes ANTES de buffearlos en memoria.
	const declared = Number(getRequestHeader(event, "content-length") ?? 0);
	if (
		!Number.isFinite(declared) ||
		declared <= 0 ||
		declared > MAX_BYTES + MAX_MULTIPART_OVERHEAD
	) {
		throw createError({ statusCode: 413, statusMessage: "Imatge massa gran" });
	}

	const parts = await readMultipartFormData(event);
	const file = parts?.find((part) => part.type?.startsWith("image/"));
	if (!file?.data?.length) {
		throw createError({ statusCode: 400, statusMessage: "Sense imatge" });
	}

	const buffer = Buffer.from(file.data);
	if (buffer.length > MAX_BYTES) {
		throw createError({ statusCode: 413, statusMessage: "Imatge massa gran" });
	}

	const detected = await fileTypeFromBuffer(buffer);
	if (!detected || !ALLOWED.includes(detected.mime)) {
		throw createError({ statusCode: 415, statusMessage: "Format no suportat" });
	}

	let processed: Buffer;
	try {
		processed = await sharp(buffer, {
			limitInputPixels: MAX_PIXELS,
			failOn: "error",
		})
			.timeout({ seconds: 10 })
			.rotate()
			.flatten({ background: "#ffffff" })
			.resize(500, 500, { fit: "cover", position: "centre" })
			.jpeg({ quality: 78 })
			.toBuffer();
	} catch {
		throw createError({ statusCode: 422, statusMessage: "Imatge no vàlida" });
	}

	const user = await prisma().user.update({
		where: { id: session.id },
		// `new Uint8Array` copia a un ArrayBuffer propio: Prisma 7 no acepta
		// el Buffer<ArrayBufferLike> de sharp directamente.
		data: { avatarData: new Uint8Array(processed), avatarMime: "image/jpeg" },
		select: { updatedAt: true },
	});

	return { ok: true, avatarVersion: user.updatedAt.getTime() };
});
