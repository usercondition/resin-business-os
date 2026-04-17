-- CreateEnum
CREATE TYPE "PortalMessageAuthor" AS ENUM ('CLIENT', 'STAFF');

-- CreateTable
CREATE TABLE "OrderPortalMessage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "author" "PortalMessageAuthor" NOT NULL,
    "staffUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderPortalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderProgressPhoto" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "caption" TEXT,
    "mimeType" TEXT NOT NULL,
    "imageBase64" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "visibleToClient" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderProgressPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderPortalMessage_orderId_createdAt_idx" ON "OrderPortalMessage"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderProgressPhoto_orderId_createdAt_idx" ON "OrderProgressPhoto"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrderPortalMessage" ADD CONSTRAINT "OrderPortalMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderPortalMessage" ADD CONSTRAINT "OrderPortalMessage_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderProgressPhoto" ADD CONSTRAINT "OrderProgressPhoto_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderProgressPhoto" ADD CONSTRAINT "OrderProgressPhoto_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
