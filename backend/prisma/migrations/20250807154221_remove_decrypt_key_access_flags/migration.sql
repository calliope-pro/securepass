/*
  Warnings:

  - You are about to drop the column `decryptKeyAccessed` on the `AccessRequest` table. All the data in the column will be lost.
  - You are about to drop the column `decryptKeyAccessedAt` on the `AccessRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AccessRequest" DROP COLUMN "decryptKeyAccessed",
DROP COLUMN "decryptKeyAccessedAt";
