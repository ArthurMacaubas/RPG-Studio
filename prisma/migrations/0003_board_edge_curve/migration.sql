-- Add persisted Bézier curve offset for investigation board edges.
ALTER TABLE "BoardEdge" ADD COLUMN "curve" DOUBLE PRECISION NOT NULL DEFAULT 0;
