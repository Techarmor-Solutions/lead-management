-- Add rank column to companies (nullable int, 1-3)
ALTER TABLE "companies" ADD COLUMN "rank" INTEGER;
