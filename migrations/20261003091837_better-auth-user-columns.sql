-- Columnas que Better Auth escribe en el usuario y el validador de esquema
-- exige (además de name/email/emailVerified/createdAt/updatedAt/username,
-- que ya existen).
--
-- `image`: la foto de perfil nativa de Better Auth. Este proyecto guarda el
-- avatar como bytes en `avatarData`/`avatarMime`, así que queda en NULL por
-- ahora y sirve de gancho si se sincroniza la URL en el futuro.
--
-- `displayUsername`: campo del plugin `username` para el nombre visible.
-- Nulo en las cuentas existentes (se rellena en los registros nuevos).
ALTER TABLE "User" ADD COLUMN "image" TEXT;
ALTER TABLE "User" ADD COLUMN "displayUsername" TEXT;
