-- AlterTable
ALTER TABLE "anomaly_scores" ADD COLUMN     "description_reason" TEXT,
ADD COLUMN     "description_score" INTEGER,
ADD COLUMN     "fragmentation_reason" TEXT,
ADD COLUMN     "fragmentation_score" INTEGER,
ADD COLUMN     "round_number_reason" TEXT,
ADD COLUMN     "round_number_score" INTEGER,
ADD COLUMN     "timing_reason" TEXT,
ADD COLUMN     "timing_score" INTEGER;
