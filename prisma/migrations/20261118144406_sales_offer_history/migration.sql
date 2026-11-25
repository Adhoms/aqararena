-- Offers are history, like holds: deleting a salesperson's account no longer deletes their offers
-- (NO ACTION). Deleting the developer still removes both in one cascade. Plus an index for the
-- plan's SET NULL and plan lookups.

-- DropForeignKey
ALTER TABLE "SalesOffer" DROP CONSTRAINT "SalesOffer_salesAccountId_fkey";

-- CreateIndex
CREATE INDEX "SalesOffer_paymentPlanId_idx" ON "SalesOffer"("paymentPlanId");

-- AddForeignKey
ALTER TABLE "SalesOffer" ADD CONSTRAINT "SalesOffer_salesAccountId_fkey" FOREIGN KEY ("salesAccountId") REFERENCES "SalesAccount"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

