import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button, Badge } from "@/components/ui";
import {
  ScoreBadge,
  ScoreBreakdown,
  AmendmentsList,
  ContractComparison,
  type PeriodFilter,
} from "@/components/contracts";
import {
  useContractDetail,
  useContractAmendments,
  useSimilarContracts,
} from "@/hooks/queries/useContracts";
import { categoryLabels, statusLabels } from "@/lib/types";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  Sparkles,
  TrendingUp,
  Scale,
} from "lucide-react";

export const Route = createFileRoute("/contratos/$contractId")({
  component: ContractDetailPage,
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

function formatCNPJ(cnpj: string): string {
  return cnpj.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

// Calculate date range for period filter
function getPeriodDates(period: PeriodFilter): { startDate?: string; endDate?: string } {
  if (period === "all") return {};

  const now = new Date();
  const years = parseInt(period.replace("y", ""), 10);
  const startDate = new Date(now);
  startDate.setFullYear(startDate.getFullYear() - years);

  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
  };
}

function ContractDetailPage() {
  const { contractId } = Route.useParams();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("all");

  // Calculate date filters based on selected period
  const periodDates = useMemo(() => getPeriodDates(selectedPeriod), [selectedPeriod]);

  const { data: contract, isLoading, error } = useContractDetail(contractId);
  const { data: amendments, isLoading: amendmentsLoading } =
    useContractAmendments(contractId);
  const { data: similarContracts, isLoading: similarLoading } =
    useSimilarContracts(contractId, periodDates);

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

  if (error || !contract) {
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
            Contrato não encontrado
          </h1>
        </div>
        <div className="rounded-lg border bg-destructive/10 p-8 text-center text-destructive">
          <p>Não foi possível carregar os detalhes deste contrato.</p>
          <p className="text-sm mt-2">
            O contrato pode ter sido removido ou o ID está incorreto.
          </p>
        </div>
      </div>
    );
  }

  const portalUrl = `https://pncp.gov.br/app/contrato/${contract.externalId}`;

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
              Contrato {contract.number}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{categoryLabels[contract.category]}</Badge>
              <Badge variant="outline">{statusLabels[contract.status]}</Badge>
            </div>
          </div>
        </div>
        <a href={portalUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver no PNCP
          </Button>
        </a>
      </div>

      {/* AI Summary */}
      {contract.summary && (
        <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Resumo AI</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {contract.summary}
          </p>
          {contract.summaryGeneratedAt && (
            <p className="text-xs text-muted-foreground mt-3">
              Gerado em {formatDate(contract.summaryGeneratedAt)}
            </p>
          )}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Contract Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Object */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Objeto do Contrato
            </h2>
            <p className="text-muted-foreground">{contract.object}</p>
          </div>

          {/* Parties */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Agency */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Órgão Contratante
              </h3>
              <p className="font-medium">
                {contract.agency.acronym
                  ? `${contract.agency.acronym} - ${contract.agency.name}`
                  : contract.agency.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Código: {contract.agency.code}
              </p>
            </div>

            {/* Supplier */}
            <div className="rounded-lg border bg-card p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Fornecedor
              </h3>
              <p className="font-medium">{contract.supplier.tradeName}</p>
              <p className="text-sm text-muted-foreground">
                {contract.supplier.legalName}
              </p>
              <p className="text-sm text-muted-foreground">
                CNPJ: {formatCNPJ(contract.supplier.cnpj)}
              </p>
            </div>
          </div>

          {/* Value and Dates */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Dados do Contrato
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-xl font-bold">
                  {formatCurrency(contract.value)}
                </p>
              </div>
              {contract.modalidade && (
                <div>
                  <p className="text-sm text-muted-foreground">Modalidade</p>
                  <p className="font-medium">{contract.modalidade}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Aditivos</p>
                <p className="font-medium">{contract.amendmentCount}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Assinatura</p>
                  <p className="text-sm font-medium">
                    {formatDate(contract.signatureDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Início</p>
                  <p className="text-sm font-medium">
                    {formatDate(contract.startDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Término</p>
                  <p className="text-sm font-medium">
                    {formatDate(contract.endDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Publicação</p>
                  <p className="text-sm font-medium">
                    {formatDate(contract.publicationDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Amendments */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Aditivos ({contract.amendmentCount})
            </h2>
            <AmendmentsList
              amendments={amendments || []}
              isLoading={amendmentsLoading}
            />
          </div>
        </div>

        {/* Right Column - Score & Similar */}
        <div className="space-y-6">
          {/* Anomaly Score */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Score de Anomalia
            </h2>
            {contract.anomalyScore ? (
              <ScoreBreakdown anomalyScore={contract.anomalyScore} />
            ) : (
              <div className="text-center py-8">
                <ScoreBadge score={0} category="LOW" />
                <p className="text-sm text-muted-foreground mt-2">
                  Score ainda não calculado para este contrato.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Contract Comparison Section - Full Width */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Comparação com Contratos Similares
        </h2>
        {similarContracts ? (
          <ContractComparison
            data={similarContracts}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            isLoading={similarLoading}
          />
        ) : similarLoading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Não foi possível carregar contratos similares.
          </p>
        )}
      </div>
    </div>
  );
}
