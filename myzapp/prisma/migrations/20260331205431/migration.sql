/*
  Warnings:

  - A unique constraint covering the columns `[userId,deviceType]` on the table `Device` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Device` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastWhatsappSync" TIMESTAMP(3),
ADD COLUMN     "whatsappConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Device_userId_deviceType_key" ON "Device"("userId", "deviceType");
