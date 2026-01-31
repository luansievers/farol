import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button, Badge } from "@/components/ui";
import {
  SupplierMetrics,
  ConcentrationIndicator,
  SupplierContractsTable,
  SupplierEvolutionChart,
} from "@/components/suppliers";
import { useSupplierDetail } from "@/hooks/queries/useSuppliers";
import { ArrowLeft, FileText } from "lucide-react";
import type { AgencyConcentration, YearlyContractData, SupplierContractDto } from "@/lib/types";

export const Route = createFileRoute("/fornecedores/$supplierId")({
  component: SupplierDetailPage,
});

function formatCNPJ(cnpj: string): string {
  return cnpj.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

function computeAgencyConcentrations(
  contracts: SupplierContractDto[]
): AgencyConcentration[] {
  const agencyMap = new Map<
    string,
    { agency: SupplierContractDto["agency"]; contractCount: number; totalValue: number }
  >();

  for (const contract of contracts) {
    const existing = agencyMap.get(contract.agency.id);
    if (existing) {
      existing.contractCount++;
      existing.totalValue += contract.value;
    } else {
      agencyMap.set(contract.agency.id, {
        agency: contract.agency,
        contractCount: 1,
        totalValue: contract.value,
      });
    }
  }

  const total = contracts.length;
  const concentrations: AgencyConcentration[] = [];

  for (const { agency, contractCount, totalValue } of agencyMap.values()) {
    concentrations.push({
      agency,
      contractCount,
      totalValue,
      percentage: total > 0 ? (contractCount / total) * 100 : 0,
    });
  }

  return concentrations.sort((a, b) => b.percentage - a.percentage);
}

function computeYearlyData(contracts: SupplierContractDto[]): YearlyContractData[] {
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

function SupplierDetailPage() {
  const { supplierId } = Route.useParams();
  const { data: supplier, isLoading, error } = useSupplierDetail(supplierId);

  const contracts = useMemo(
    () => supplier?.contracts ?? [],
    [supplier?.contracts]
  );

  const agencyConcentrations = useMemo(
    () => computeAgencyConcentrations(contracts),
    [contracts]
  );

  const yearlyData = useMemo(
    () => computeYearlyData(contracts),
    [contracts]
  );

  const uniqueAgenciesCount = agencyConcentrations.length;

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

  if (error || !supplier) {
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
            Fornecedor não encontrado
          </h1>
        </div>
        <div className="rounded-lg border bg-destructive/10 p-8 text-center text-destructive">
          <p>Não foi possível carregar os detalhes deste fornecedor.</p>
          <p className="text-sm mt-2">
            O fornecedor pode ter sido removido ou o ID está incorreto.
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
              {supplier.tradeName}
            </h1>
            <p className="text-muted-foreground mt-1">{supplier.legalName}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">
                CNPJ: {formatCNPJ(supplier.cnpj)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <SupplierMetrics
        metrics={supplier.metrics}
        agenciesCount={uniqueAgenciesCount}
      />

      {/* Concentration and Evolution Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Concentration Indicator */}
        <ConcentrationIndicator concentrations={agencyConcentrations} />

        {/* Evolution Chart */}
        <SupplierEvolutionChart data={yearlyData} />
      </div>

      {/* Contracts List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-xl font-semibold">
            Contratos ({supplier.contracts.length})
          </h2>
        </div>
        <SupplierContractsTable contracts={supplier.contracts} />
      </div>
    </div>
  );
}
