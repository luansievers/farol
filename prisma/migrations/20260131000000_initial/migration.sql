-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ContractCategory" AS ENUM ('OBRAS', 'SERVICOS', 'TI', 'SAUDE', 'EDUCACAO', 'OUTROS');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'FETCHING_DETAILS', 'DOWNLOADING_PDF', 'EXTRACTING_TEXT', 'GENERATING_SUMMARY', 'CALCULATING_SCORE', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acronym" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "trade_name" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "object" TEXT NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "category" "ContractCategory" NOT NULL DEFAULT 'OUTROS',
    "category_manual" BOOLEAN NOT NULL DEFAULT false,
    "modalidade" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "signature_date" TIMESTAMP(3),
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "publication_date" TIMESTAMP(3),
    "pdf_url" TEXT,
    "storage_path" TEXT,
    "extracted_text" TEXT,
    "summary" TEXT,
    "summary_generated_at" TIMESTAMP(3),
    "is_partially_redacted" BOOLEAN NOT NULL DEFAULT false,
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "last_fetched_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "agency_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amendments" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "value_change" DECIMAL(15,2),
    "duration_change" INTEGER,
    "signature_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "contract_id" TEXT NOT NULL,

    CONSTRAINT "amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anomaly_scores" (
    "id" TEXT NOT NULL,
    "total_score" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "value_score" INTEGER NOT NULL,
    "value_reason" TEXT,
    "amendment_score" INTEGER NOT NULL,
    "amendment_reason" TEXT,
    "concentration_score" INTEGER NOT NULL,
    "concentration_reason" TEXT,
    "duration_score" INTEGER NOT NULL,
    "duration_reason" TEXT,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "contract_id" TEXT NOT NULL,

    CONSTRAINT "anomaly_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agencies_code_key" ON "agencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_cnpj_key" ON "suppliers"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_external_id_key" ON "contracts"("external_id");

-- CreateIndex
CREATE INDEX "contracts_agency_id_idx" ON "contracts"("agency_id");

-- CreateIndex
CREATE INDEX "contracts_supplier_id_idx" ON "contracts"("supplier_id");

-- CreateIndex
CREATE INDEX "contracts_category_idx" ON "contracts"("category");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE INDEX "contracts_processing_status_idx" ON "contracts"("processing_status");

-- CreateIndex
CREATE INDEX "contracts_signature_date_idx" ON "contracts"("signature_date");

-- CreateIndex
CREATE INDEX "contracts_value_idx" ON "contracts"("value");

-- CreateIndex
CREATE UNIQUE INDEX "amendments_external_id_key" ON "amendments"("external_id");

-- CreateIndex
CREATE INDEX "amendments_contract_id_idx" ON "amendments"("contract_id");

-- CreateIndex
CREATE UNIQUE INDEX "anomaly_scores_contract_id_key" ON "anomaly_scores"("contract_id");

-- CreateIndex
CREATE INDEX "anomaly_scores_total_score_idx" ON "anomaly_scores"("total_score");

-- CreateIndex
CREATE INDEX "anomaly_scores_category_idx" ON "anomaly_scores"("category");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amendments" ADD CONSTRAINT "amendments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anomaly_scores" ADD CONSTRAINT "anomaly_scores_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
