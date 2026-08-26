-- Q08: planejamento administrativo de sessões.
-- Migration aditiva: preserva Session legado e cria somente vínculos novos.

-- CreateEnum
CREATE TYPE "SessionPlanningStatus" AS ENUM ('PLANNED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Session"
  ADD COLUMN "agenda" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "objectives" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "postSummary" TEXT,
  ADD COLUMN "status" "SessionPlanningStatus" NOT NULL DEFAULT 'PLANNED';

-- CreateTable
CREATE TABLE "SessionHypothesis" (
  "sessionId" TEXT NOT NULL,
  "hypothesisId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionHypothesis_pkey" PRIMARY KEY ("sessionId", "hypothesisId")
);

-- CreateTable
CREATE TABLE "SessionBoardView" (
  "sessionId" TEXT NOT NULL,
  "viewId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionBoardView_pkey" PRIMARY KEY ("sessionId", "viewId")
);

-- CreateIndex
CREATE INDEX "SessionHypothesis_hypothesisId_idx" ON "SessionHypothesis"("hypothesisId");
CREATE INDEX "SessionBoardView_viewId_idx" ON "SessionBoardView"("viewId");

-- AddForeignKey
ALTER TABLE "SessionHypothesis"
  ADD CONSTRAINT "SessionHypothesis_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionHypothesis"
  ADD CONSTRAINT "SessionHypothesis_hypothesisId_fkey"
  FOREIGN KEY ("hypothesisId") REFERENCES "InvestigationHypothesis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionBoardView"
  ADD CONSTRAINT "SessionBoardView_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SessionBoardView"
  ADD CONSTRAINT "SessionBoardView_viewId_fkey"
  FOREIGN KEY ("viewId") REFERENCES "InvestigationBoardView"("id") ON DELETE CASCADE ON UPDATE CASCADE;
