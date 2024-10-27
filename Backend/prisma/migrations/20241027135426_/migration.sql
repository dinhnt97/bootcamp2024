/*
  Warnings:

  - A unique constraint covering the columns `[userId,fundId]` on the table `Investment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Investment_userId_fundId_key" ON "Investment"("userId", "fundId");
