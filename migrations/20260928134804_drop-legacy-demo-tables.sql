-- DropForeignKey
ALTER TABLE "SchedulesOnLine" DROP CONSTRAINT "SchedulesOnLine_lineId_fkey";

-- DropTable
DROP TABLE "Line";

-- DropTable
DROP TABLE "LineConnection";

-- DropTable
DROP TABLE "SchedulesOnLine";
