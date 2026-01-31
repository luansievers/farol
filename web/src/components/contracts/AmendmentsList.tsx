import type { AmendmentDto } from "@/lib/types";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

interface AmendmentsListProps {
  amendments: AmendmentDto[];
  isLoading?: boolean;
}

const typeLabels: Record<string, string> = {
  value: "Valor",
  duration: "Prazo",
  object: "Objeto",
  both: "Valor e Prazo",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDuration(days: number): string {
  if (days === 0) return "0 dias";
  const absdays = Math.abs(days);
  if (absdays === 1) return `${days > 0 ? "+" : "-"}1 dia`;
  return `${days > 0 ? "+" : ""}${days} dias`;
}

export function AmendmentsList({ amendments, isLoading }: AmendmentsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (amendments.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Este contrato não possui aditivos registrados.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {amendments.map((amendment) => (
        <div
          key={amendment.id}
          className="rounded-lg border bg-card p-4 space-y-2"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">#{amendment.number}</Badge>
              <Badge variant="secondary">
                {typeLabels[amendment.type] || amendment.type}
              </Badge>
            </div>
            {amendment.signatureDate && (
              <span className="text-sm text-muted-foreground">
                {new Date(amendment.signatureDate).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>

          {amendment.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {amendment.description}
            </p>
          )}

          <div className="flex gap-4 text-sm">
            {amendment.valueChange !== null && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Valor:</span>
                <span
                  className={cn(
                    "font-medium",
                    amendment.valueChange > 0
                      ? "text-red-600 dark:text-red-400"
                      : amendment.valueChange < 0
                        ? "text-green-600 dark:text-green-400"
                        : ""
                  )}
                >
                  {amendment.valueChange > 0 ? "+" : ""}
                  {formatCurrency(amendment.valueChange)}
                </span>
              </div>
            )}
            {amendment.durationChange !== null && amendment.durationChange !== 0 && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Prazo:</span>
                <span
                  className={cn(
                    "font-medium",
                    amendment.durationChange > 0
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-green-600 dark:text-green-400"
                  )}
                >
                  {formatDuration(amendment.durationChange)}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
