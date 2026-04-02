/*
  Warnings:

  - A unique constraint covering the columns `[whatsappMessageId]` on the table `Message` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[whatsappId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `whatsappMessageId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `whatsappTimestamp` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Made the column `whatsappId` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "whatsappMessageId" TEXT NOT NULL,
ADD COLUMN     "whatsappTimestamp" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "whatsappStatus" TEXT NOT NULL DEFAULT 'offline',
ALTER COLUMN "whatsappId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Message_whatsappMessageId_key" ON "Message"("whatsappMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "User_whatsappId_key" ON "User"("whatsappId");
