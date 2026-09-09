-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "email" TEXT;

-- DropIndex (non-unique -> unique)
DROP INDEX "Customer_orgId_phone_idx";

-- CreateIndex unique phone per org
CREATE UNIQUE INDEX "Customer_orgId_phone_key" ON "Customer"("orgId", "phone");

-- CreateIndex unique email per org (NULLs don't conflict)
CREATE UNIQUE INDEX "Customer_orgId_email_key" ON "Customer"("orgId", "email");
