-- AlterTable
ALTER TABLE "Project" ADD COLUMN "alertSnapshot" JSONB;

-- CreateTable
CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "token" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceAlert_token_key" ON "PriceAlert"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PriceAlert_projectId_email_key" ON "PriceAlert"("projectId", "email");

-- CreateIndex
CREATE INDEX "PriceAlert_projectId_confirmedAt_idx" ON "PriceAlert"("projectId", "confirmedAt");

-- AddForeignKey
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
