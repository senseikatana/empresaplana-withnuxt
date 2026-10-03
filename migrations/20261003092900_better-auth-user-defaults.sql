-- Better Auth no escribe `passkey`, `fullName` ni `phone` al registrar: son
-- columnas NOT NULL sin default heredadas del endpoint de registro anterior,
-- y el INSERT del registro nuevo fallaba con "Argument passkey is missing".
--
-- Defaults en la BD (no un hook): es lo que garantiza que el INSERT funcione
-- sin depender del orden en que Better Auth ejecute los hooks de los plugins.
--
-- `fullName` no se usa en la UI (solo `name`), y el login ya no lee
-- `user.passkey` (Better Auth usa `Account.password`).
ALTER TABLE "User" ALTER COLUMN "passkey"   SET DEFAULT '';
ALTER TABLE "User" ALTER COLUMN "fullName"  SET DEFAULT '';
ALTER TABLE "User" ALTER COLUMN "phone"     SET DEFAULT '';

-- Mismo criterio que el resto de columnas NOT NULL que sí escribe Better Auth:
-- `role` ya tenía default 'client'.
UPDATE "User" SET "passkey" = ''   WHERE "passkey"   IS NULL;
UPDATE "User" SET "fullName" = ''  WHERE "fullName"  IS NULL;
UPDATE "User" SET "phone" = ''     WHERE "phone"     IS NULL;
