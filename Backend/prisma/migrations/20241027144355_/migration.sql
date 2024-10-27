-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Fund" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "fundContractId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "isCreating" BOOLEAN NOT NULL,
    "totalInvestment" REAL NOT NULL DEFAULT 0.0
);
INSERT INTO "new_Fund" ("description", "fundContractId", "id", "image", "isCreating", "name", "txHash") SELECT "description", "fundContractId", "id", "image", "isCreating", "name", "txHash" FROM "Fund";
DROP TABLE "Fund";
ALTER TABLE "new_Fund" RENAME TO "Fund";
CREATE UNIQUE INDEX "Fund_txHash_key" ON "Fund"("txHash");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
