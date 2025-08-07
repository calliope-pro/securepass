-- AlterTable
ALTER TABLE "File" ADD COLUMN     "isInvalidated" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "File_isInvalidated_idx" ON "File"("isInvalidated");
