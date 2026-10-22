-- CreateEnum
CREATE TYPE "DeveloperPlan" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('LAUNCH', 'UNDER_CONSTRUCTION', 'READY', 'DELIVERED');

-- CreateEnum
CREATE TYPE "PropertyCategory" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'ADMINISTRATIVE', 'MEDICAL', 'COASTAL');

-- CreateEnum
CREATE TYPE "PropertySubType" AS ENUM ('APARTMENT', 'STUDIO', 'DUPLEX', 'PENTHOUSE', 'TOWNHOUSE', 'TWIN_HOUSE', 'VILLA', 'MANSION', 'OFFICE', 'CLINIC', 'RETAIL', 'FOOD_AND_BEVERAGE', 'PHARMACY', 'BANK', 'CHALET', 'CABIN', 'SERVICED_APARTMENT');

-- CreateEnum
CREATE TYPE "FinishingType" AS ENUM ('CORE_AND_SHELL', 'SEMI_FINISHED', 'FULLY_FINISHED', 'FULLY_FINISHED_WITH_AC', 'FURNISHED');

-- CreateEnum
CREATE TYPE "UnitAvailability" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD');

-- CreateEnum
CREATE TYPE "InstallmentFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'FLOOR_PLAN_2D', 'LAYOUT_SKETCH', 'MODEL_3D', 'VIRTUAL_TOUR', 'MASTER_PLAN', 'BROCHURE');

-- CreateEnum
CREATE TYPE "MediaGroup" AS ENUM ('EXTERIOR', 'INTERIOR', 'CONSTRUCTION');

-- CreateEnum
CREATE TYPE "ZoneKind" AS ENUM ('RESIDENTIAL', 'VILLAS', 'GREEN', 'AMENITY', 'COMMERCIAL', 'ADMINISTRATIVE');

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Developer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "foundedYear" INTEGER,
    "aboutAr" TEXT,
    "aboutEn" TEXT,
    "website" TEXT,
    "hotline" TEXT,
    "salesPhone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "hqAddressAr" TEXT,
    "hqAddressEn" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "plan" "DeveloperPlan" NOT NULL DEFAULT 'BASIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "districtAr" TEXT,
    "districtEn" TEXT,
    "categories" "PropertyCategory"[],
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "landAreaM2" DECIMAL(12,2),
    "footprintPct" DECIMAL(5,2),
    "unitsCount" INTEGER,
    "status" "ProjectStatus" NOT NULL DEFAULT 'LAUNCH',
    "launchDate" DATE,
    "deliveryDate" DATE NOT NULL,
    "progressPct" INTEGER,
    "pricesUpdatedAt" DATE,
    "amenities" TEXT[],
    "masterPlanUrl" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Typology" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT,
    "nameEn" TEXT,
    "category" "PropertyCategory" NOT NULL,
    "subType" "PropertySubType" NOT NULL,
    "buaM2" DECIMAL(8,2) NOT NULL,
    "netM2" DECIMAL(8,2),
    "gardenM2" DECIMAL(8,2),
    "roofM2" DECIMAL(8,2),
    "terraceM2" DECIMAL(8,2),
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "finishing" "FinishingType" NOT NULL,
    "priceFrom" DECIMAL(14,2),
    "pricePerM2From" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Typology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "typologyId" TEXT NOT NULL,
    "building" TEXT,
    "floor" INTEGER,
    "unitNumber" TEXT,
    "orientation" TEXT,
    "view" TEXT,
    "price" DECIMAL(14,2),
    "availability" "UnitAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterPlanZone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "ZoneKind" NOT NULL,
    "shortAr" TEXT NOT NULL,
    "shortEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "phaseAr" TEXT,
    "phaseEn" TEXT,
    "descriptionAr" TEXT,
    "descriptionEn" TEXT,
    "areaFeddan" DECIMAL(8,2),
    "buildingsCount" INTEGER,
    "unitsCount" INTEGER,
    "unitSubTypes" "PropertySubType"[],
    "xPct" DECIMAL(5,2) NOT NULL,
    "yPct" DECIMAL(5,2) NOT NULL,
    "widthPct" DECIMAL(5,2) NOT NULL,
    "heightPct" DECIMAL(5,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MasterPlanZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDistance" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "placeAr" TEXT NOT NULL,
    "placeEn" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectDistance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "group" "MediaGroup",
    "url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "captionAr" TEXT,
    "captionEn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT,
    "typologyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "typologyId" TEXT,
    "nameAr" TEXT,
    "nameEn" TEXT,
    "downPaymentPct" DECIMAL(5,2) NOT NULL,
    "deliveryPaymentPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "years" INTEGER NOT NULL,
    "frequency" "InstallmentFrequency" NOT NULL DEFAULT 'QUARTERLY',
    "cashDiscountPct" DECIMAL(5,2),
    "maintenancePct" DECIMAL(5,2),
    "garageFee" DECIMAL(12,2),
    "clubFee" DECIMAL(12,2),
    "validUntil" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "detailsAr" TEXT,
    "detailsEn" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isSponsored" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "typologyId" TEXT,
    "recordedAt" DATE NOT NULL,
    "pricePerM2" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConstructionUpdate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "progressPct" INTEGER,
    "noteAr" TEXT,
    "noteEn" TEXT,
    "mediaUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConstructionUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Area_slug_key" ON "Area"("slug");

-- CreateIndex
CREATE INDEX "Area_parentId_idx" ON "Area"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Developer_slug_key" ON "Developer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_developerId_idx" ON "Project"("developerId");

-- CreateIndex
CREATE INDEX "Project_areaId_idx" ON "Project"("areaId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_published_isFeatured_idx" ON "Project"("published", "isFeatured");

-- CreateIndex
CREATE INDEX "Typology_category_subType_idx" ON "Typology"("category", "subType");

-- CreateIndex
CREATE INDEX "Typology_priceFrom_idx" ON "Typology"("priceFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Typology_projectId_code_key" ON "Typology"("projectId", "code");

-- CreateIndex
CREATE INDEX "Unit_typologyId_availability_idx" ON "Unit"("typologyId", "availability");

-- CreateIndex
CREATE INDEX "MasterPlanZone_projectId_idx" ON "MasterPlanZone"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDistance_projectId_idx" ON "ProjectDistance"("projectId");

-- CreateIndex
CREATE INDEX "Media_projectId_kind_idx" ON "Media"("projectId", "kind");

-- CreateIndex
CREATE INDEX "Media_typologyId_kind_idx" ON "Media"("typologyId", "kind");

-- CreateIndex
CREATE INDEX "PaymentPlan_projectId_isActive_idx" ON "PaymentPlan"("projectId", "isActive");

-- CreateIndex
CREATE INDEX "PaymentPlan_downPaymentPct_years_idx" ON "PaymentPlan"("downPaymentPct", "years");

-- CreateIndex
CREATE INDEX "Offer_projectId_idx" ON "Offer"("projectId");

-- CreateIndex
CREATE INDEX "Offer_endsAt_idx" ON "Offer"("endsAt");

-- CreateIndex
CREATE INDEX "PriceHistory_projectId_recordedAt_idx" ON "PriceHistory"("projectId", "recordedAt");

-- CreateIndex
CREATE INDEX "ConstructionUpdate_projectId_date_idx" ON "ConstructionUpdate"("projectId", "date");

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Typology" ADD CONSTRAINT "Typology_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_typologyId_fkey" FOREIGN KEY ("typologyId") REFERENCES "Typology"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterPlanZone" ADD CONSTRAINT "MasterPlanZone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDistance" ADD CONSTRAINT "ProjectDistance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_typologyId_fkey" FOREIGN KEY ("typologyId") REFERENCES "Typology"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_typologyId_fkey" FOREIGN KEY ("typologyId") REFERENCES "Typology"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_typologyId_fkey" FOREIGN KEY ("typologyId") REFERENCES "Typology"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionUpdate" ADD CONSTRAINT "ConstructionUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
