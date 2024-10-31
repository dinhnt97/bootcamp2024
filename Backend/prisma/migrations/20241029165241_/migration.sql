-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "address" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Fund" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "fundContractId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "isCreating" BOOLEAN NOT NULL,
    "totalInvestment" REAL NOT NULL DEFAULT 0.0
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "fundId" INTEGER NOT NULL,
    "amount" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "UserInvestment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "investmentId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "txHash" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lastBlock" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Fund_txHash_key" ON "Fund"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "Investment_userId_fundId_key" ON "Investment"("userId", "fundId");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvestment_txHash_key" ON "UserInvestment"("txHash");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvestment_userId_investmentId_key" ON "UserInvestment"("userId", "investmentId");
