-- CreateEnum
CREATE TYPE "SalesRole" AS ENUM ('AGENT', 'LEAD');

-- CreateTable
CREATE TABLE "SalesAccount" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "SalesRole" NOT NULL DEFAULT 'AGENT',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesAccount_username_key" ON "SalesAccount"("username");

-- CreateIndex
CREATE INDEX "SalesAccount_developerId_status_idx" ON "SalesAccount"("developerId", "status");

-- AddForeignKey
ALTER TABLE "SalesAccount" ADD CONSTRAINT "SalesAccount_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
