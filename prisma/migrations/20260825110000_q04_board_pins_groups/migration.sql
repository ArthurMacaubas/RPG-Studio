-- Q04: elementos visuais administrativos do quadro.
-- A migration é aditiva e não converte dados existentes.

-- CreateTable
CREATE TABLE "InvestigationBoardPin" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#E5AC68',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigationBoardPin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationBoardGroup" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#86AAA2',
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 320,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 180,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigationBoardGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationBoardGroupItem" (
    "campaignId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "boardNodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationBoardGroupItem_pkey" PRIMARY KEY ("groupId", "boardNodeId")
);

-- CreateIndex
CREATE INDEX "InvestigationBoardPin_campaignId_idx" ON "InvestigationBoardPin"("campaignId");

-- CreateIndex
CREATE INDEX "InvestigationBoardGroup_campaignId_idx" ON "InvestigationBoardGroup"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestigationBoardGroup_campaignId_id_key" ON "InvestigationBoardGroup"("campaignId", "id");

-- CreateIndex
CREATE INDEX "InvestigationBoardGroupItem_campaignId_boardNodeId_idx" ON "InvestigationBoardGroupItem"("campaignId", "boardNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardNode_campaignId_id_key" ON "BoardNode"("campaignId", "id");

-- AddForeignKey
ALTER TABLE "InvestigationBoardPin" ADD CONSTRAINT "InvestigationBoardPin_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationBoardGroup" ADD CONSTRAINT "InvestigationBoardGroup_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationBoardGroupItem" ADD CONSTRAINT "InvestigationBoardGroupItem_campaignId_groupId_fkey" FOREIGN KEY ("campaignId", "groupId") REFERENCES "InvestigationBoardGroup"("campaignId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationBoardGroupItem" ADD CONSTRAINT "InvestigationBoardGroupItem_campaignId_boardNodeId_fkey" FOREIGN KEY ("campaignId", "boardNodeId") REFERENCES "BoardNode"("campaignId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
