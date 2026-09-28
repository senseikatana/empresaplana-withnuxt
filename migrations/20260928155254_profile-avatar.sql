-- Perfil de usuario: bio y avatar (bytes, sin filesystem efímero).
-- Nota: "User" la creó Prisma; antes de esta migración se transfirió el ownership:
--   psql "$DATABASE_URL" -c 'ALTER TABLE "User" OWNER TO project_admin;'
ALTER TABLE "User" ADD COLUMN "bio" VARCHAR(280);
ALTER TABLE "User" ADD COLUMN "avatarData" BYTEA;
ALTER TABLE "User" ADD COLUMN "avatarMime" VARCHAR(50);
