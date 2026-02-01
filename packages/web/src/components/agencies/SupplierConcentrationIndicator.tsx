import { Link } from "@tanstack/react-router";
import { AlertTriangle, Building2 } from "lucide-react";
import { Badge } from "@/components/ui";
import type { SupplierConcentration } from "@/lib/types";

interface SupplierConcentrationIndicatorProps {
  concentrations: SupplierConcentration[];
  threshold?: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function SupplierConcentrationIndicator({
  concentrations,
  threshold = 30,
}: SupplierConcentrationIndicatorProps) {
  const highConcentrations = concentrations.filter(
    (c) => c.percentage >= threshold
  );

  if (highConcentrations.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Concentração por Fornecedor</h3>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-sm">
            Nenhuma concentração significativa detectada (&gt;{threshold}%)
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <h3 className="font-medium text-amber-600 dark:text-amber-400">
          Concentração Detectada
        </h3>
        <Badge variant="warning" className="ml-auto">
          {highConcentrations.length} fornecedor{highConcentrations.length > 1 ? "es" : ""}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Mais de {threshold}% dos contratos concentrados em:
      </p>
      <div className="space-y-3">
        {highConcentrations.map((concentration) => (
          <div key={concentration.supplier.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <Link
                to="/fornecedores/$supplierId"
                params={{ supplierId: concentration.supplier.id }}
                className="font-medium hover:underline"
              >
                {concentration.supplier.tradeName}
              </Link>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                {concentration.percentage.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{concentration.contractCount} contratos</span>
              <span>{formatCurrency(concentration.totalValue)}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, concentration.percentage)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
