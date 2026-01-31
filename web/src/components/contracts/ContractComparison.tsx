import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import type {
  SimilarContractsResponseDto,
  SimilarContractDto,
} from "@/lib/types";
import { ScoreBadge } from "./ScoreBadge";
import { Button } from "@/components/ui";
import {
  ArrowRight,
  BarChart3,
  List,
  Calendar,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";

// Period options for filtering similar contracts
export type PeriodFilter = "1y" | "2y" | "5y" | "all";

interface ContractComparisonProps {
  data: SimilarContractsResponseDto;
  onPeriodChange?: (period: PeriodFilter) => void;
  selectedPeriod?: PeriodFilter;
  isLoading?: boolean;
}

const periodLabels: Record<PeriodFilter, string> = {
  "1y": "1 ano",
  "2y": "2 anos",
  "5y": "5 anos",
  all: "Todos",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: value >= 1000000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000000 ? 1 : 2,
  }).format(value);
}

function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

// Calculate percentile position of a value within a dataset
function calculatePercentile(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.round(((value - min) / (max - min)) * 100);
}

export function ContractComparison({
  data,
  onPeriodChange,
  selectedPeriod = "all",
  isLoading,
}: ContractComparisonProps) {
  const [viewMode, setViewMode] = useState<"chart" | "list">("chart");

  const { statistics, similarContracts, referenceContract } = data;

  // Calculate reference contract position
  const referencePercentile = useMemo(() => {
    if (statistics.max === statistics.min) return 50;
    return calculatePercentile(
      referenceContract.value,
      statistics.min,
      statistics.max
    );
  }, [referenceContract.value, statistics.min, statistics.max]);

  // Determine if above or below average
  const deviationFromAverage = useMemo(() => {
    if (statistics.average === 0) return 0;
    return ((referenceContract.value - statistics.average) / statistics.average) * 100;
  }, [referenceContract.value, statistics.average]);

  const deviationFromMedian = useMemo(() => {
    if (statistics.median === 0) return 0;
    return ((referenceContract.value - statistics.median) / statistics.median) * 100;
  }, [referenceContract.value, statistics.median]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Período:</span>
          <div className="flex gap-1">
            {(["1y", "2y", "5y", "all"] as PeriodFilter[]).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => onPeriodChange?.(period)}
                className="h-7 px-2 text-xs"
              >
                {periodLabels[period]}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === "chart" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("chart")}
            className="h-7 px-2"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="h-7 px-2"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Statistics cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Contratos"
          value={statistics.count.toString()}
          sublabel="na categoria"
        />
        <StatCard
          label="Média"
          value={formatCurrency(statistics.average)}
          sublabel="por contrato"
        />
        <StatCard
          label="Mediana"
          value={formatCurrency(statistics.median)}
          sublabel="valor central"
        />
        <StatCard
          label="Desvio"
          value={formatCurrency(statistics.standardDeviation)}
          sublabel="padrão"
        />
      </div>

      {/* Min/Max range */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-muted-foreground">Mín:</span>{" "}
          <span className="font-medium">{formatCurrency(statistics.min)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Máx:</span>{" "}
          <span className="font-medium">{formatCurrency(statistics.max)}</span>
        </div>
      </div>

      {viewMode === "chart" ? (
        <ChartView
          referenceValue={referenceContract.value}
          statistics={statistics}
          similarContracts={similarContracts}
          referencePercentile={referencePercentile}
          deviationFromAverage={deviationFromAverage}
          deviationFromMedian={deviationFromMedian}
        />
      ) : (
        <ListView
          similarContracts={similarContracts}
          referenceValue={referenceContract.value}
          averageValue={statistics.average}
        />
      )}
    </div>
  );
}

// Statistics card component
function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}

// Chart view with visual comparison
function ChartView({
  referenceValue,
  statistics,
  similarContracts,
  referencePercentile,
  deviationFromAverage,
  deviationFromMedian,
}: {
  referenceValue: number;
  statistics: SimilarContractsResponseDto["statistics"];
  similarContracts: SimilarContractDto[];
  referencePercentile: number;
  deviationFromAverage: number;
  deviationFromMedian: number;
}) {
  // Get deviation icon and color
  const getDeviationDisplay = (deviation: number) => {
    if (Math.abs(deviation) < 5) {
      return {
        icon: <Minus className="h-3 w-3" />,
        color: "text-muted-foreground",
        label: "na média",
      };
    }
    if (deviation > 0) {
      return {
        icon: <TrendingUp className="h-3 w-3" />,
        color: deviation > 20 ? "text-amber-500" : "text-amber-400",
        label: `${Math.abs(deviation).toFixed(0)}% acima`,
      };
    }
    return {
      icon: <TrendingDown className="h-3 w-3" />,
      color: "text-green-500",
      label: `${Math.abs(deviation).toFixed(0)}% abaixo`,
    };
  };

  const avgDisplay = getDeviationDisplay(deviationFromAverage);
  const medDisplay = getDeviationDisplay(deviationFromMedian);

  return (
    <div className="space-y-6">
      {/* Reference contract highlight */}
      <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Este contrato</span>
          <span className="text-lg font-bold">
            {formatFullCurrency(referenceValue)}
          </span>
        </div>

        {/* Comparison badges */}
        <div className="flex flex-wrap gap-3">
          <div className={`flex items-center gap-1 text-sm ${avgDisplay.color}`}>
            {avgDisplay.icon}
            <span>{avgDisplay.label} da média</span>
          </div>
          <div className={`flex items-center gap-1 text-sm ${medDisplay.color}`}>
            {medDisplay.icon}
            <span>{medDisplay.label} da mediana</span>
          </div>
        </div>
      </div>

      {/* Visual bar chart */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Posição na distribuição de valores
        </p>

        {/* Distribution bar */}
        <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
          {/* Background gradient showing distribution */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-amber-500/20 to-red-500/20" />

          {/* Average marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500"
            style={{
              left: `${calculatePercentile(statistics.average, statistics.min, statistics.max)}%`,
            }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-blue-500 whitespace-nowrap">
              Média
            </div>
          </div>

          {/* Median marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-purple-500"
            style={{
              left: `${calculatePercentile(statistics.median, statistics.min, statistics.max)}%`,
            }}
          >
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-purple-500 whitespace-nowrap">
              Mediana
            </div>
          </div>

          {/* Reference contract marker (highlighted) */}
          <div
            className="absolute top-1 bottom-1 w-3 bg-primary rounded shadow-lg transition-all"
            style={{
              left: `calc(${referencePercentile}% - 6px)`,
            }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-primary" />
            </div>
          </div>
        </div>

        {/* Scale labels */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Menor valor</span>
          <span>Maior valor</span>
        </div>
      </div>

      {/* Top similar contracts preview */}
      {similarContracts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Contratos similares mais recentes
          </p>
          <div className="space-y-2">
            {similarContracts.slice(0, 5).map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                referenceValue={referenceValue}
                compact
              />
            ))}
          </div>
          {similarContracts.length > 5 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{similarContracts.length - 5} contratos similares
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// List view with all similar contracts
function ListView({
  similarContracts,
  referenceValue,
}: {
  similarContracts: SimilarContractDto[];
  referenceValue: number;
}) {
  if (similarContracts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Não foram encontrados contratos similares nesta categoria para o período
        selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        {similarContracts.length} contratos na categoria
      </p>
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {similarContracts.map((contract) => (
          <ContractCard
            key={contract.id}
            contract={contract}
            referenceValue={referenceValue}
          />
        ))}
      </div>
    </div>
  );
}

// Individual contract card
function ContractCard({
  contract,
  referenceValue,
  compact = false,
}: {
  contract: SimilarContractDto;
  referenceValue: number;
  compact?: boolean;
}) {
  const deviation = ((contract.value - referenceValue) / referenceValue) * 100;
  const isHigher = deviation > 5;
  const isLower = deviation < -5;

  return (
    <Link
      to="/contratos/$contractId"
      params={{ contractId: contract.id }}
      className="flex items-center justify-between rounded-lg border bg-card p-3 hover:bg-muted/50 transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <p className={`font-medium truncate ${compact ? "text-sm" : ""}`}>
          {contract.object}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{contract.supplier.tradeName}</span>
          {!compact && (
            <>
              <span>•</span>
              <span>{formatDate(contract.signatureDate)}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <div className="text-right">
          <span
            className={`font-medium tabular-nums ${compact ? "text-sm" : ""}`}
          >
            {formatCurrency(contract.value)}
          </span>
          {!compact && (
            <div
              className={`text-xs ${
                isHigher
                  ? "text-amber-500"
                  : isLower
                    ? "text-green-500"
                    : "text-muted-foreground"
              }`}
            >
              {isHigher
                ? `+${deviation.toFixed(0)}%`
                : isLower
                  ? `${deviation.toFixed(0)}%`
                  : "≈ igual"}
            </div>
          )}
        </div>
        {contract.anomalyScore && (
          <ScoreBadge
            score={contract.anomalyScore.totalScore}
            category={contract.anomalyScore.category}
          />
        )}
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}
