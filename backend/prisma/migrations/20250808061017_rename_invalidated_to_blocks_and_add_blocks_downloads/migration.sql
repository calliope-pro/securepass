-- AlterTable
ALTER TABLE "File" RENAME COLUMN "isInvalidated" TO "blocksRequests";

-- AlterTable  
ALTER TABLE "File" ADD COLUMN "blocksDownloads" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
DROP INDEX "File_isInvalidated_idx";
CREATE INDEX "File_blocksRequests_idx" ON "File"("blocksRequests");
CREATE INDEX "File_blocksDownloads_idx" ON "File"("blocksDownloads");