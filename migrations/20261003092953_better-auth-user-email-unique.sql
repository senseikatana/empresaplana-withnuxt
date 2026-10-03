-- `User.email` pasa a ser único: lo exige Better Auth (`email.unique: true`)
-- para detectar registros duplicados, y sin índice la restricción solo vivía
-- en el pre-chequeo del endpoint.
--
-- Verificado antes de crearlo: 0 emails duplicados y 0 vacíos/nulos en las
-- 7 filas existentes, así que el índice se puede crear sin conflictos.
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
