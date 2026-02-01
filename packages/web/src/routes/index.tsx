import { createFileRoute } from "@tanstack/react-router";
import { useStats, useContracts } from "@/hooks/queries";
import { StatsCards, RecentContracts } from "@/components/dashboard";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: stats, isLoading: isLoadingStats } = useStats();
  const { data: contractsData, isLoading: isLoadingContracts } = useContracts({
    page: 1,
    pageSize: 5,
    sortBy: "signatureDate",
    order: "desc",
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Radar de Contratos Publicos
        </h1>
        <p className="text-muted-foreground">
          Analise automatica de contratos publicos com deteccao de anomalias
        </p>
      </div>

      <StatsCards stats={stats} isLoading={isLoadingStats} />

      <RecentContracts
        contracts={contractsData?.data}
        isLoading={isLoadingContracts}
      />
    </div>
  );
}
