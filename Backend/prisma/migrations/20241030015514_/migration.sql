/*
  Warnings:

  - A unique constraint covering the columns `[userId,investmentId,txHash]` on the table `UserInvestment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UserInvestment_userId_investmentId_key";

-- CreateIndex
CREATE UNIQUE INDEX "UserInvestment_userId_investmentId_txHash_key" ON "UserInvestment"("userId", "investmentId", "txHash");
