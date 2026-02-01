/**
 * Stats Service
 *
 * Provides aggregated statistics for the dashboard
 */

import { prisma } from "@modules/database/index.js";

export interface DashboardStats {
  totalContracts: number;
  contractsWithAnomalies: number;
  totalSuppliers: number;
  totalAgencies: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    totalContracts,
    contractsWithAnomalies,
    totalSuppliers,
    totalAgencies,
  ] = await Promise.all([
    prisma.contract.count(),
    prisma.anomalyScore.count({
      where: {
        category: "HIGH",
      },
    }),
    prisma.supplier.count(),
    prisma.agency.count(),
  ]);

  return {
    totalContracts,
    contractsWithAnomalies,
    totalSuppliers,
    totalAgencies,
  };
}
