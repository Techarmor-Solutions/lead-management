-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'CONTACTED', 'RESPONDED', 'QUALIFIED', 'CLOSED', 'NOT_INTERESTED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'READY', 'APPROVED', 'SENDING', 'ACTIVE', 'COMPLETED', 'PAUSED');

-- CreateEnum
CREATE TYPE "SendStatus" AS ENUM ('PENDING', 'SCHEDULED', 'SENT', 'OPENED', 'CLICKED', 'RESPONDED', 'BOUNCED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('OPEN', 'CLICK');

-- CreateTable
CREATE TABLE "agency_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "services" TEXT[],
    "valueProposition" TEXT NOT NULL DEFAULT '',
    "targetIndustries" TEXT[],
    "targetCompanySize" TEXT NOT NULL DEFAULT '',
    "painPoints" TEXT[],
    "targetGeography" TEXT[],
    "additionalNotes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agency_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "zip" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "employeeCount" TEXT NOT NULL DEFAULT '',
    "rating" DOUBLE PRECISION,
    "totalRatings" INTEGER,
    "placeId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'google_places',
    "enrichmentData" JSONB,
    "enrichedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "linkedin" TEXT NOT NULL DEFAULT '',
    "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
    "enrichmentSummary" TEXT NOT NULL DEFAULT '',
    "enrichedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "lastRunAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "industry" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "userId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_steps" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sends" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "status" "SendStatus" NOT NULL DEFAULT 'PENDING',
    "jobId" TEXT,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sendId" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "url" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gmail_credentials" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiryDate" BIGINT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gmail_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_placeId_key" ON "companies"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_steps_campaignId_stepNumber_key" ON "campaign_steps"("campaignId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sends_campaignId_contactId_stepId_key" ON "sends"("campaignId", "contactId", "stepId");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_tokens_token_key" ON "tracking_tokens"("token");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sends" ADD CONSTRAINT "sends_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sends" ADD CONSTRAINT "sends_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sends" ADD CONSTRAINT "sends_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "campaign_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_tokens" ADD CONSTRAINT "tracking_tokens_sendId_fkey" FOREIGN KEY ("sendId") REFERENCES "sends"("id") ON DELETE CASCADE ON UPDATE CASCADE;
