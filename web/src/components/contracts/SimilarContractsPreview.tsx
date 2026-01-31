import { Link } from "@tanstack/react-router";
import type { SimilarContractsResponseDto } from "@/lib/types";
import { ScoreBadge } from "./ScoreBadge";
import { ArrowRight } from "lucide-react";

interface SimilarContractsPreviewProps {
  data: SimilarContractsResponseDto;
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: value >= 1000000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000000 ? 1 : 2,
  }).format(value);
}

export function SimilarContractsPreview({
  data,
  isLoading,
}: SimilarContractsPreviewProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { statistics, similarContracts, referenceContract } = data;
  const previewContracts = similarContracts.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Contratos na categoria</p>
          <p className="text-lg font-semibold">{statistics.count}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Valor médio</p>
          <p className="text-lg font-semibold">{formatCurrency(statistics.average)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Valor mínimo</p>
          <p className="text-lg font-semibold">{formatCurrency(statistics.min)}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Valor máximo</p>
          <p className="text-lg font-semibold">{formatCurrency(statistics.max)}</p>
        </div>
      </div>

      {/* Reference contract comparison */}
      <div className="rounded-lg border bg-muted/50 p-3">
        <p className="text-sm text-muted-foreground mb-1">Este contrato</p>
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">
            {formatCurrency(referenceContract.value)}
          </p>
          {referenceContract.value > statistics.average && (
            <span className="text-sm text-yellow-600 dark:text-yellow-400">
              {((referenceContract.value / statistics.average - 1) * 100).toFixed(0)}% acima da média
            </span>
          )}
          {referenceContract.value < statistics.average && (
            <span className="text-sm text-green-600 dark:text-green-400">
              {((1 - referenceContract.value / statistics.average) * 100).toFixed(0)}% abaixo da média
            </span>
          )}
        </div>
      </div>

      {/* Preview list */}
      {previewContracts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Contratos similares
          </p>
          {previewContracts.map((contract) => (
            <Link
              key={contract.id}
              to="/contratos/$contractId"
              params={{ contractId: contract.id }}
              className="flex items-center justify-between rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{contract.object}</p>
                <p className="text-xs text-muted-foreground">
                  {contract.supplier.tradeName}
                </p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className="text-sm font-medium tabular-nums">
                  {formatCurrency(contract.value)}
                </span>
                {contract.anomalyScore && (
                  <ScoreBadge
                    score={contract.anomalyScore.totalScore}
                    category={contract.anomalyScore.category}
                  />
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {similarContracts.length === 0 && (
        <p className="text-center text-muted-foreground py-4">
          Não foram encontrados contratos similares nesta categoria.
        </p>
      )}
    </div>
  );
}
