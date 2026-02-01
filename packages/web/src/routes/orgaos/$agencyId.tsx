import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button, Badge } from "@/components/ui";
import {
  AgencyMetrics,
  SupplierConcentrationIndicator,
  AgencyContractsTable,
  AgencyEvolutionChart,
} from "@/components/agencies";
import { useAgencyDetail } from "@/hooks/queries/useAgencies";
import { ArrowLeft, FileText } from "lucide-react";
import type { SupplierConcentration, YearlyContractData, AgencyContractDto } from "@/lib/types";

export const Route = createFileRoute("/orgaos/$agencyId")({
  component: AgencyDetailPage,
});

function computeSupplierConcentrations(
  contracts: AgencyContractDto[]
): SupplierConcentration[] {
  const supplierMap = new Map<
    string,
    { supplier: AgencyContractDto["supplier"]; contractCount: number; totalValue: number }
  >();

  for (const contract of contracts) {
    const existing = supplierMap.get(contract.supplier.id);
    if (existing) {
      existing.contractCount++;
      existing.totalValue += contract.value;
    } else {
      supplierMap.set(contract.supplier.id, {
        supplier: contract.supplier,
        contractCount: 1,
        totalValue: contract.value,
      });
    }
  }

  const total = contracts.length;
  const concentrations: SupplierConcentration[] = [];

  for (const { supplier, contractCount, totalValue } of supplierMap.values()) {
    concentrations.push({
      supplier,
      contractCount,
      totalValue,
      percentage: total > 0 ? (contractCount / total) * 100 : 0,
    });
  }

  return concentrations.sort((a, b) => b.percentage - a.percentage);
}

function computeYearlyData(contracts: AgencyContractDto[]): YearlyContractData[] {
  const yearMap = new Map<number, { contractCount: number; totalValue: number }>();

  for (const contract of contracts) {
    if (!contract.signatureDate) continue;

    const year = new Date(contract.signatureDate).getFullYear();
    const existing = yearMap.get(year);

    if (existing) {
      existing.contractCount++;
      existing.totalValue += contract.value;
    } else {
      yearMap.set(year, {
        contractCount: 1,
        totalValue: contract.value,
      });
    }
  }

  const yearlyData: YearlyContractData[] = [];
  for (const [year, data] of yearMap.entries()) {
    yearlyData.push({
      year,
      contractCount: data.contractCount,
      totalValue: data.totalValue,
    });
  }

  return yearlyData.sort((a, b) => a.year - b.year);
}

function AgencyDetailPage() {
  const { agencyId } = Route.useParams();
  const { data: agency, isLoading, error } = useAgencyDetail(agencyId);

  const contracts = useMemo(
    () => agency?.contracts ?? [],
    [agency?.contracts]
  );

  const supplierConcentrations = useMemo(
    () => computeSupplierConcentrations(contracts),
    [contracts]
  );

  const yearlyData = useMemo(
    () => computeYearlyData(contracts),
    [contracts]
  );

  const uniqueSuppliersCount = supplierConcentrations.length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/contratos">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div className="h-9 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/contratos">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            Órgão não encontrado
          </h1>
        </div>
        <div className="rounded-lg border bg-destructive/10 p-8 text-center text-destructive">
          <p>Não foi possível carregar os detalhes deste órgão.</p>
          <p className="text-sm mt-2">
            O órgão pode ter sido removido ou o ID está incorreto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Link to="/contratos">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {agency.name}
            </h1>
            {agency.acronym && (
              <p className="text-muted-foreground mt-1">{agency.acronym}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                Código: {agency.code}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <AgencyMetrics
        metrics={agency.metrics}
        suppliersCount={uniqueSuppliersCount}
      />

      {/* Concentration and Evolution Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Concentration Indicator */}
        <SupplierConcentrationIndicator concentrations={supplierConcentrations} />

        {/* Evolution Chart */}
        <AgencyEvolutionChart data={yearlyData} />
      </div>

      {/* Contracts List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-xl font-semibold">
            Contratos ({agency.contracts.length})
          </h2>
        </div>
        <AgencyContractsTable contracts={agency.contracts} />
      </div>
    </div>
  );
}
