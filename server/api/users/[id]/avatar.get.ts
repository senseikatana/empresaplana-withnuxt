/** Sirve el avatar de un usuario (binario, cacheable con ETag). */
export default defineEventHandler(async (event) => {
	const id = Number(getRouterParam(event, "id"));
	if (!Number.isInteger(id) || id <= 0) {
		throw createError({ statusCode: 400, statusMessage: "Id invàlid" });
	}

	const user = await prisma().user.findUnique({
		where: { id },
		select: { avatarData: true, avatarMime: true, updatedAt: true },
	});
	if (!user?.avatarData) {
		throw createError({ statusCode: 404, statusMessage: "Sense avatar" });
	}

	// `handleCacheHeaders` fija ETag/Cache-Control y responde 304 si coincide.
	const etag = `"avatar-${id}-${user.updatedAt.getTime()}"`;
	if (
		handleCacheHeaders(event, {
			etag,
			maxAge: 3600,
			modifiedTime: user.updatedAt,
		})
	) {
		return;
	}

	setHeader(event, "Content-Type", user.avatarMime ?? "image/jpeg");
	return Buffer.from(user.avatarData);
});
