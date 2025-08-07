-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "shareId" VARCHAR(12) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "size" BIGINT NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "r2Key" VARCHAR(255) NOT NULL,
    "uploadStatus" TEXT NOT NULL DEFAULT 'uploading',
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedChunks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxDownloads" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileChunk" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "r2Key" VARCHAR(255) NOT NULL,
    "uploadedAt" TIMESTAMP(3),

    CONSTRAINT "FileChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "requestId" VARCHAR(12) NOT NULL,
    "fileId" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" VARCHAR(64) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadLog" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" VARCHAR(64) NOT NULL,

    CONSTRAINT "DownloadLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadSession" (
    "id" TEXT NOT NULL,
    "sessionKey" VARCHAR(64) NOT NULL,
    "fileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "File_shareId_key" ON "File"("shareId");

-- CreateIndex
CREATE INDEX "File_shareId_idx" ON "File"("shareId");

-- CreateIndex
CREATE INDEX "File_createdAt_idx" ON "File"("createdAt");

-- CreateIndex
CREATE INDEX "File_uploadStatus_idx" ON "File"("uploadStatus");

-- CreateIndex
CREATE INDEX "FileChunk_fileId_idx" ON "FileChunk"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "FileChunk_fileId_chunkIndex_key" ON "FileChunk"("fileId", "chunkIndex");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRequest_requestId_key" ON "AccessRequest"("requestId");

-- CreateIndex
CREATE INDEX "AccessRequest_requestId_idx" ON "AccessRequest"("requestId");

-- CreateIndex
CREATE INDEX "AccessRequest_fileId_status_idx" ON "AccessRequest"("fileId", "status");

-- CreateIndex
CREATE INDEX "AccessRequest_createdAt_idx" ON "AccessRequest"("createdAt");

-- CreateIndex
CREATE INDEX "DownloadLog_fileId_idx" ON "DownloadLog"("fileId");

-- CreateIndex
CREATE INDEX "DownloadLog_requestId_idx" ON "DownloadLog"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "UploadSession_sessionKey_key" ON "UploadSession"("sessionKey");

-- CreateIndex
CREATE INDEX "UploadSession_sessionKey_idx" ON "UploadSession"("sessionKey");

-- CreateIndex
CREATE INDEX "UploadSession_status_expiresAt_idx" ON "UploadSession"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "FileChunk" ADD CONSTRAINT "FileChunk_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadLog" ADD CONSTRAINT "DownloadLog_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadLog" ADD CONSTRAINT "DownloadLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
