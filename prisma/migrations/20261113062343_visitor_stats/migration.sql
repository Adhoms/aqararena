-- CreateEnum
CREATE TYPE "StatEvent" AS ENUM ('VIEW', 'FAVORITE', 'COMPARE', 'OFFER', 'CALL', 'WHATSAPP', 'WEBSITE', 'EMAIL', 'BROCHURE', 'SHARE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "unitsNotifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProjectStat" (
    "projectId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "event" "StatEvent" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectStat_pkey" PRIMARY KEY ("projectId","day","event")
);

-- CreateIndex
CREATE INDEX "ProjectStat_day_idx" ON "ProjectStat"("day");

-- AddForeignKey
ALTER TABLE "ProjectStat" ADD CONSTRAINT "ProjectStat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
