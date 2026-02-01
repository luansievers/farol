import { TrendingUp } from "lucide-react";
import type { YearlyContractData } from "@/lib/types";

interface AgencyEvolutionChartProps {
  data: YearlyContractData[];
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AgencyEvolutionChart({ data }: AgencyEvolutionChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4" />
          <h3 className="font-semibold">Evolução Temporal</h3>
        </div>
        <p className="text-center text-muted-foreground py-8">
          Dados insuficientes para exibir evolução temporal.
        </p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.totalValue));
  const maxContracts = Math.max(...data.map((d) => d.contractCount));

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4" />
        <h3 className="font-semibold">Evolução Temporal (Contratos por Ano)</h3>
      </div>

      <div className="space-y-4">
        {/* Chart legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary rounded" />
            <span>Valor Total</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary/30 rounded" />
            <span>Quantidade de Contratos</span>
          </div>
        </div>

        {/* Chart bars */}
        <div className="space-y-3">
          {data.map((yearData) => (
            <div key={yearData.year} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium w-12">{yearData.year}</span>
                <div className="flex-1 mx-4">
                  {/* Value bar */}
                  <div className="h-6 bg-muted rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-primary rounded-full transition-all flex items-center justify-end pr-2"
                      style={{
                        width: `${maxValue > 0 ? (yearData.totalValue / maxValue) * 100 : 0}%`,
                        minWidth: yearData.totalValue > 0 ? "40px" : "0",
                      }}
                    >
                      {yearData.totalValue > 0 && (
                        <span className="text-xs text-primary-foreground font-medium">
                          {formatCurrency(yearData.totalValue)}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Contracts bar */}
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/30 rounded-full transition-all flex items-center justify-end pr-2"
                      style={{
                        width: `${maxContracts > 0 ? (yearData.contractCount / maxContracts) * 100 : 0}%`,
                        minWidth: yearData.contractCount > 0 ? "30px" : "0",
                      }}
                    >
                      {yearData.contractCount > 0 && (
                        <span className="text-xs font-medium">
                          {yearData.contractCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total de anos</p>
            <p className="font-semibold">{data.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Média anual</p>
            <p className="font-semibold">
              {formatCurrency(
                data.reduce((sum, d) => sum + d.totalValue, 0) / data.length
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
