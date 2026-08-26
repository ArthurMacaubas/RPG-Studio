-- Q05: vistas administrativas são snapshots de navegação, não cópias do quadro canônico.

-- CreateEnum
CREATE TYPE "InvestigationBoardViewKind" AS ENUM ('SESSION', 'CASE', 'ARC');

-- CreateTable
CREATE TABLE "InvestigationBoardView" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "InvestigationBoardViewKind" NOT NULL DEFAULT 'SESSION',
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigationBoardView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestigationBoardView_campaignId_kind_order_idx" ON "InvestigationBoardView"("campaignId", "kind", "order");

-- CreateIndex
CREATE UNIQUE INDEX "InvestigationBoardView_campaignId_name_key" ON "InvestigationBoardView"("campaignId", "name");

-- AddForeignKey
ALTER TABLE "InvestigationBoardView" ADD CONSTRAINT "InvestigationBoardView_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
