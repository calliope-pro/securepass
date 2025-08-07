-- AlterTable
ALTER TABLE "AccessRequest" ADD COLUMN     "decryptKeyAccessed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "decryptKeyAccessedAt" TIMESTAMP(3);
