-- Better Auth: sesiones revocables, credenciales y tokens de verificación.
--
-- Aditivo: solo CREA tablas nuevas. No altera ni borra ninguna existente, así
-- que es seguro sobre la BD compartida con `withastro`.
--
-- Motivo: antes la sesión era un JWT stateless (`nuxt-auth-utils`): el logout
-- solo borraba la cookie y el token seguía válido 7 días. Con `Session` en BD
-- se revoca de verdad.

-- ── Session ─────────────────────────────────────────────────────────────────
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Account ─────────────────────────────────────────────────────────────────
-- Para `providerId = 'credential'` la contraseña vive aquí (`password`),
-- con el MISMO formato scrypt `salt:hash` que ya usaba `User.passkey`.
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "providerId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Account_userId_providerId_key" ON "Account"("userId", "providerId");
CREATE INDEX "Account_providerId_accountId_idx" ON "Account"("providerId", "accountId");

ALTER TABLE "Account"
  ADD CONSTRAINT "Account_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Verification ────────────────────────────────────────────────────────────
CREATE TABLE "Verification" (
    "id" SERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- ── Backfill de credenciales ────────────────────────────────────────────────
-- Better Auth lee la contraseña de `Account.password`, no de `User.passkey`.
-- Se COPIA (no se mueve) para que el roll-back siga siendo posible: si se
-- vuelve al login antiguo, `User.passkey` sigue intacto.
-- Idempotente: el NOT EXISTS evita duplicar si se re-ejecuta.
INSERT INTO "Account" ("userId", "providerId", "accountId", "password", "updatedAt")
SELECT u."id", 'credential', u."id"::text, u."passkey", CURRENT_TIMESTAMP
FROM "User" u
WHERE u."passkey" <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "Account" a
    WHERE a."userId" = u."id" AND a."providerId" = 'credential'
  );

-- ── Tablas solo de servidor ─────────────────────────────────────────────────
-- Igual que `assistant_conversations`/`Page`: sin acceso anon/authenticated.
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Verification" ENABLE ROW LEVEL SECURITY;
