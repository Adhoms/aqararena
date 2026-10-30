-- Refundable reservation amount (EOI) shown on launch projects. Nullable, so existing rows are unaffected.
ALTER TABLE "Project" ADD COLUMN "bookingFee" DECIMAL(12,2);
