-- Two more reasons a hold is released (src/lib/sales/hold-service.ts): its unit left the developer's
-- Sales inventory, or the developer disabled the salesperson's account. Additive only.
ALTER TYPE "HoldReleaseReason" ADD VALUE 'OUT_OF_SALES';
ALTER TYPE "HoldReleaseReason" ADD VALUE 'ACCOUNT_DISABLED';
