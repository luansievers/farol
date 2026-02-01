/**
 * Crawler service - orchestrates fetching and storing contracts
 */

import { Prisma } from "@/generated/prisma/client.js";
import { prisma } from "@modules/database/index.js";
import type { Result } from "@shared/types/index.js";
import type { PncpClient } from "./client.js";
import { createPncpClient } from "./client.js";
import { normalizeContracts } from "./normalizer.js";
import type {
  CrawlerConfig,
  CrawlerError,
  CrawlerStats,
  NormalizedContract,
  PncpSearchParams,
} from "./types/index.js";

// São Paulo IBGE code
const SAO_PAULO_IBGE = "3550308";

/**
 * Creates the crawler service
 */
export function createCrawlerService(config: Partial<CrawlerConfig> = {}) {
  const client: PncpClient = createPncpClient(config);

  /**
   * Finds or creates an agency record
   */
  async function findOrCreateAgency(
    agency: NormalizedContract["agency"]
  ): Promise<string> {
    const existing = await prisma.agency.findUnique({
      where: { code: agency.code },
    });

    if (existing) {
      return existing.id;
    }

    const created = await prisma.agency.create({
      data: {
        code: agency.code,
        name: agency.name,
      },
    });

    console.log(`[Crawler] Created agency: ${agency.name}`);
    return created.id;
  }

  /**
   * Finds or creates a supplier record
   */
  async function findOrCreateSupplier(
    supplier: NormalizedContract["supplier"]
  ): Promise<string> {
    // Handle empty CNPJ (foreign suppliers, etc.)
    const cnpj = supplier.cnpj || `UNKNOWN_${String(Date.now())}`;

    const existing = await prisma.supplier.findUnique({
      where: { cnpj },
    });

    if (existing) {
      return existing.id;
    }

    const created = await prisma.supplier.create({
      data: {
        cnpj,
        tradeName: supplier.name,
        legalName: supplier.name,
      },
    });

    console.log(`[Crawler] Created supplier: ${supplier.name}`);
    return created.id;
  }

  /**
   * Saves a normalized contract to the database
   * Returns true if new, false if updated
   */
  async function saveContract(
    contract: NormalizedContract
  ): Promise<Result<boolean, CrawlerError>> {
    try {
      const agencyId = await findOrCreateAgency(contract.agency);
      const supplierId = await findOrCreateSupplier(contract.supplier);

      const existing = await prisma.contract.findUnique({
        where: { externalId: contract.externalId },
      });

      const contractData = {
        number: contract.number,
        object: contract.object,
        value: new Prisma.Decimal(contract.value),
        signatureDate: contract.signatureDate,
        startDate: contract.startDate,
        endDate: contract.endDate,
        publicationDate: contract.publicationDate,
        modalidade: contract.modalidade,
        pdfUrl: contract.pdfUrl,
        agencyId,
        supplierId,
        lastFetchedAt: new Date(),
      };

      if (existing) {
        await prisma.contract.update({
          where: { id: existing.id },
          data: contractData,
        });
        return { success: true, data: false };
      }

      await prisma.contract.create({
        data: {
          externalId: contract.externalId,
          ...contractData,
        },
      });

      return { success: true, data: true };
    } catch (err) {
      return {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message:
            err instanceof Error ? err.message : "Unknown database error",
          details: { externalId: contract.externalId },
        },
      };
    }
  }

  /**
   * Crawls contracts for a date range with pagination
   */
  async function crawlContracts(
    startDate: Date,
    endDate: Date
  ): Promise<Result<CrawlerStats, CrawlerError>> {
    const stats: CrawlerStats = {
      startedAt: new Date(),
      finishedAt: null,
      totalFound: 0,
      newContracts: 0,
      updatedContracts: 0,
      errors: 0,
      pages: 0,
      lastError: null,
    };

    const formatDate = (d: Date) =>
      d.toISOString().slice(0, 10).replace(/-/g, "");

    const params: PncpSearchParams = {
      dataInicial: formatDate(startDate),
      dataFinal: formatDate(endDate),
      codigoMunicipio: SAO_PAULO_IBGE,
      pagina: 1,
      tamanhoPagina: client.config.pageSize,
    };

    console.log(
      `[Crawler] Starting crawl for São Paulo (${params.dataInicial} to ${params.dataFinal})`
    );

    let hasMorePages = true;

    while (hasMorePages) {
      const result = await client.fetchContracts(params);

      if (!result.success) {
        stats.lastError = result.error.message;
        stats.errors++;

        // If it's the first page, fail entirely
        if (params.pagina === 1) {
          stats.finishedAt = new Date();
          return {
            success: false,
            error: result.error,
          };
        }

        // Otherwise, log and stop pagination
        console.error(
          `[Crawler] Error on page ${String(params.pagina)}: ${result.error.message}`
        );
        hasMorePages = false;
        break;
      }

      const { data: response } = result;
      const contracts = response.data;

      stats.pages++;
      stats.totalFound += contracts.length;

      console.log(
        `[Crawler] Page ${String(params.pagina)}: ${String(contracts.length)} contracts found`
      );

      // Normalize and save contracts
      const normalized = normalizeContracts(contracts);

      for (const contract of normalized) {
        const saveResult = await saveContract(contract);

        if (!saveResult.success) {
          stats.errors++;
          stats.lastError = saveResult.error.message;
          console.error(
            `[Crawler] Error saving contract ${contract.externalId}: ${saveResult.error.message}`
          );
          continue;
        }

        if (saveResult.data) {
          stats.newContracts++;
        } else {
          stats.updatedContracts++;
        }
      }

      // Check if there are more pages
      // PNCP API returns empty array when no more data
      if (contracts.length < client.config.pageSize) {
        hasMorePages = false;
      } else {
        params.pagina = (params.pagina ?? 1) + 1;
      }
    }

    stats.finishedAt = new Date();

    console.log(`[Crawler] Crawl completed:`);
    console.log(`  - Pages processed: ${String(stats.pages)}`);
    console.log(`  - Total contracts found: ${String(stats.totalFound)}`);
    console.log(`  - New contracts: ${String(stats.newContracts)}`);
    console.log(`  - Updated contracts: ${String(stats.updatedContracts)}`);
    console.log(`  - Errors: ${String(stats.errors)}`);

    return { success: true, data: stats };
  }

  /**
   * Crawls contracts for the last N days
   */
  async function crawlLastDays(
    days: number
  ): Promise<Result<CrawlerStats, CrawlerError>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return crawlContracts(startDate, endDate);
  }

  return {
    crawlContracts,
    crawlLastDays,
    client,
  };
}

export type CrawlerService = ReturnType<typeof createCrawlerService>;
