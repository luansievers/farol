import { Badge } from "@/components/ui";
import type { AnomalyScoreDto, ScoreBreakdownItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ScoreBreakdownProps {
  anomalyScore: AnomalyScoreDto;
}

const criterionLabels: Record<ScoreBreakdownItem["criterion"], string> = {
  value: "Valor",
  amendment: "Aditivos",
  concentration: "Concentração",
  duration: "Duração",
  timing: "Timing",
  roundNumber: "Valor Redondo",
  fragmentation: "Fracionamento",
  description: "Descrição",
};

const criterionDescriptions: Record<ScoreBreakdownItem["criterion"], string> = {
  value: "Comparação com contratos similares",
  amendment: "Quantidade e impacto de aditivos",
  concentration: "Concentração de fornecedor",
  duration: "Prazo do contrato",
  timing: "Padrões temporais suspeitos",
  roundNumber: "Valores redondos suspeitos",
  fragmentation: "Fracionamento de contratos",
  description: "Qualidade da descrição",
};

function getScoreColor(score: number): string {
  if (score <= 5) return "bg-green-500";
  if (score <= 12) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreTextColor(score: number): string {
  if (score <= 5) return "text-green-700 dark:text-green-400";
  if (score <= 12) return "text-yellow-700 dark:text-yellow-400";
  return "text-red-700 dark:text-red-400";
}

function getCategoryVariant(
  category: AnomalyScoreDto["category"]
): "success" | "warning" | "danger" {
  switch (category) {
    case "LOW":
      return "success";
    case "MEDIUM":
      return "warning";
    case "HIGH":
      return "danger";
  }
}

function getCategoryLabel(category: AnomalyScoreDto["category"]): string {
  switch (category) {
    case "LOW":
      return "Baixo Risco";
    case "MEDIUM":
      return "Médio Risco";
    case "HIGH":
      return "Alto Risco";
  }
}

export function ScoreBreakdown({ anomalyScore }: ScoreBreakdownProps) {
  return (
    <div className="space-y-4">
      {/* Total Score Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-4xl font-bold tabular-nums",
              getScoreTextColor(anomalyScore.totalScore)
            )}
          >
            {anomalyScore.totalScore}
          </span>
          <span className="text-muted-foreground text-sm">/200</span>
        </div>
        <Badge variant={getCategoryVariant(anomalyScore.category)} className="text-sm">
          {getCategoryLabel(anomalyScore.category)}
        </Badge>
      </div>

      {/* Breakdown Items */}
      <div className="space-y-3">
        {anomalyScore.breakdown.map((item) => (
          <div key={item.criterion} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">
                  {criterionLabels[item.criterion]}
                </span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {criterionDescriptions[item.criterion]}
                </span>
              </div>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  getScoreTextColor(item.score)
                )}
              >
                {item.score}/25
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", getScoreColor(item.score))}
                style={{ width: `${(item.score / 25) * 100}%` }}
              />
            </div>

            {/* Reason */}
            {item.reason && item.isContributing && (
              <p className="text-xs text-muted-foreground">{item.reason}</p>
            )}
          </div>
        ))}
      </div>

      {/* Calculated at */}
      <p className="text-xs text-muted-foreground pt-2 border-t">
        Calculado em{" "}
        {new Date(anomalyScore.calculatedAt).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}
