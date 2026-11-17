-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "HoldReleaseReason" AS ENUM ('EXPIRED', 'CANCELLED', 'PORTAL_STATUS_CHANGE', 'ADMIN_STATUS_CHANGE');

-- AlterTable
ALTER TABLE "Developer" ADD COLUMN     "holdHours" INTEGER NOT NULL DEFAULT 48;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "holdHours" INTEGER;

-- CreateTable
CREATE TABLE "UnitHold" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "salesAccountId" TEXT NOT NULL,
    "clientNote" VARCHAR(200),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "HoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "releasedById" TEXT,
    "releaseReason" "HoldReleaseReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnitHold_salesAccountId_status_idx" ON "UnitHold"("salesAccountId", "status");

-- CreateIndex
CREATE INDEX "UnitHold_unitId_status_idx" ON "UnitHold"("unitId", "status");

-- AddForeignKey
ALTER TABLE "UnitHold" ADD CONSTRAINT "UnitHold_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitHold" ADD CONSTRAINT "UnitHold_salesAccountId_fkey" FOREIGN KEY ("salesAccountId") REFERENCES "SalesAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitHold" ADD CONSTRAINT "UnitHold_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "SalesAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One live hold per unit, guaranteed by the database itself (spec sections 4 and 6). If two
-- salespeople hold the same unit at the same moment, the second insert fails here (P2002) and is
-- told who won. Prisma's schema can't describe a partial index; Prisma 7.10 ignores it when diffing,
-- so `prisma migrate dev` won't drop it. Never remove it.
CREATE UNIQUE INDEX "UnitHold_unitId_active_key" ON "UnitHold"("unitId") WHERE "status" = 'ACTIVE';
