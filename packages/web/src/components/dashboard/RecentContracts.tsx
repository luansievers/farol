import { Link } from "@tanstack/react-router";
import { ScoreBadge } from "@/components/contracts/ScoreBadge";
import type { ContractListItemDto } from "@/lib/types";
import { categoryLabels } from "@/lib/types";

interface RecentContractsProps {
  contracts?: ContractListItemDto[];
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between py-3">
          <div className="space-y-2">
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-6 w-16 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function RecentContracts({ contracts, isLoading }: RecentContractsProps) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Contratos Recentes</h2>
        <Link
          to="/contratos"
          className="text-sm text-muted-foreground hover:underline"
        >
          Ver todos
        </Link>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : !contracts || contracts.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center">
          Nenhum contrato encontrado.
        </p>
      ) : (
        <div className="divide-y">
          {contracts.map((contract) => (
            <div key={contract.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <Link
                    to="/contratos/$contractId"
                    params={{ contractId: contract.id }}
                    className="font-medium hover:underline block"
                  >
                    {truncateText(contract.object, 100)}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{categoryLabels[contract.category]}</span>
                    <span>·</span>
                    <span className="tabular-nums">
                      {formatCurrency(contract.value)}
                    </span>
                    <span>·</span>
                    <span>{formatDate(contract.signatureDate)}</span>
                    <span>·</span>
                    <Link
                      to="/fornecedores/$supplierId"
                      params={{ supplierId: contract.supplier.id }}
                      className="hover:underline"
                    >
                      {contract.supplier.tradeName}
                    </Link>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {contract.anomalyScore ? (
                    <ScoreBadge
                      score={contract.anomalyScore.totalScore}
                      category={contract.anomalyScore.category}
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
