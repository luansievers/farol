import { Building2, FileText, TrendingUp, DollarSign } from "lucide-react";
import type { SupplierMetricsDto } from "@/lib/types";

interface SupplierMetricsProps {
  metrics: SupplierMetricsDto;
  agenciesCount: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function SupplierMetrics({ metrics, agenciesCount }: SupplierMetricsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <FileText className="h-4 w-4" />
          <span className="text-sm">Total de Contratos</span>
        </div>
        <p className="text-2xl font-bold">{metrics.totalContracts}</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <DollarSign className="h-4 w-4" />
          <span className="text-sm">Valor Total</span>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Building2 className="h-4 w-4" />
          <span className="text-sm">Órgãos Atendidos</span>
        </div>
        <p className="text-2xl font-bold">{agenciesCount}</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm">Score Médio</span>
        </div>
        <p className="text-2xl font-bold">
          {metrics.averageScore !== null ? metrics.averageScore.toFixed(1) : "—"}
        </p>
      </div>
    </div>
  );
}
