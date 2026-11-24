-- Additive enum extension. Existing campaigns and files remain untouched.
ALTER TYPE "SystemType" ADD VALUE IF NOT EXISTS 'THREEDET_VICTORY';
