-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EGP', 'USD');

-- CreateEnum
CREATE TYPE "PlanStepKind" AS ENUM ('PAYMENT', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING_APPROVAL', 'ISSUED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OfferChannel" AS ENUM ('WHATSAPP', 'TELEGRAM', 'EMAIL', 'DEVICE');

-- CreateEnum
CREATE TYPE "OfferLanguage" AS ENUM ('ar', 'en');

-- AlterTable
ALTER TABLE "Developer" ADD COLUMN     "agentDiscountPct" DECIMAL(4,2) NOT NULL DEFAULT 0,
ADD COLUMN     "leadDiscountPct" DECIMAL(4,2) NOT NULL DEFAULT 0,
ADD COLUMN     "offerValidityDays" INTEGER NOT NULL DEFAULT 7;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'EGP';

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "zoneId" TEXT;

-- CreateTable
CREATE TABLE "PlanStep" (
    "id" TEXT NOT NULL,
    "paymentPlanId" TEXT NOT NULL,
    "monthOffset" INTEGER NOT NULL,
    "pct" DECIMAL(9,6) NOT NULL,
    "kind" "PlanStepKind" NOT NULL DEFAULT 'PAYMENT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlanStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOffer" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "salesAccountId" TEXT NOT NULL,
    "unitId" TEXT,
    "paymentPlanId" TEXT,
    "clientName" VARCHAR(100) NOT NULL,
    "clientPhone" VARCHAR(40),
    "clientEmail" VARCHAR(200),
    "language" "OfferLanguage" NOT NULL DEFAULT 'ar',
    "currency" "Currency" NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "sentVia" "OfferChannel"[] DEFAULT ARRAY[]::"OfferChannel"[],
    "discountPct" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "status" "OfferStatus" NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanStep_paymentPlanId_kind_monthOffset_key" ON "PlanStep"("paymentPlanId", "kind", "monthOffset");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOffer_token_key" ON "SalesOffer"("token");

-- CreateIndex
CREATE INDEX "SalesOffer_salesAccountId_createdAt_idx" ON "SalesOffer"("salesAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesOffer_developerId_status_idx" ON "SalesOffer"("developerId", "status");

-- CreateIndex
CREATE INDEX "SalesOffer_unitId_idx" ON "SalesOffer"("unitId");

-- CreateIndex
CREATE INDEX "Unit_zoneId_idx" ON "Unit"("zoneId");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "MasterPlanZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanStep" ADD CONSTRAINT "PlanStep_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOffer" ADD CONSTRAINT "SalesOffer_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOffer" ADD CONSTRAINT "SalesOffer_salesAccountId_fkey" FOREIGN KEY ("salesAccountId") REFERENCES "SalesAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOffer" ADD CONSTRAINT "SalesOffer_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOffer" ADD CONSTRAINT "SalesOffer_paymentPlanId_fkey" FOREIGN KEY ("paymentPlanId") REFERENCES "PaymentPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOffer" ADD CONSTRAINT "SalesOffer_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "SalesAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOffer" ADD CONSTRAINT "SalesOffer_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "SalesAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ranges the app checks, enforced by the database too (src/lib/sales/offers.ts, src/lib/catalog/plan-steps.ts).
-- Prisma's schema can't describe CHECK constraints and ignores them when diffing; never drop them.
ALTER TABLE "Developer" ADD CONSTRAINT "Developer_offerValidityDays_range" CHECK ("offerValidityDays" BETWEEN 1 AND 30);
ALTER TABLE "Developer" ADD CONSTRAINT "Developer_agentDiscountPct_range" CHECK ("agentDiscountPct" BETWEEN 0 AND 20);
ALTER TABLE "Developer" ADD CONSTRAINT "Developer_leadDiscountPct_range" CHECK ("leadDiscountPct" BETWEEN 0 AND 20);
ALTER TABLE "Developer" ADD CONSTRAINT "Developer_discount_order" CHECK ("agentDiscountPct" <= "leadDiscountPct");
ALTER TABLE "PlanStep" ADD CONSTRAINT "PlanStep_monthOffset_range" CHECK ("monthOffset" BETWEEN 0 AND 360);
ALTER TABLE "PlanStep" ADD CONSTRAINT "PlanStep_pct_range" CHECK ("pct" > 0 AND "pct" <= 100);
ALTER TABLE "SalesOffer" ADD CONSTRAINT "SalesOffer_discountPct_range" CHECK ("discountPct" BETWEEN 0 AND 20);
ALTER TABLE "SalesOffer" ADD CONSTRAINT "SalesOffer_validity" CHECK ("validUntil" > "issuedAt");
