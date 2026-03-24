-- AddColumn categories to agency_profiles
ALTER TABLE "agency_profiles" ADD COLUMN "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
