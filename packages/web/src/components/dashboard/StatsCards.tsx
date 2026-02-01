import { FileText, AlertTriangle, Building2, Landmark } from "lucide-react";
import type { DashboardStats } from "@/lib/types";

interface StatsCardsProps {
  stats?: DashboardStats;
  isLoading?: boolean;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function StatCard({
  label,
  value,
  icon: Icon,
  isLoading,
}: {
  label: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-2 text-2xl font-bold">
        {isLoading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        ) : (
          formatNumber(value ?? 0)
        )}
      </div>
    </div>
  );
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total de Contratos"
        value={stats?.totalContracts}
        icon={FileText}
        isLoading={isLoading}
      />
      <StatCard
        label="Com Anomalias"
        value={stats?.contractsWithAnomalies}
        icon={AlertTriangle}
        isLoading={isLoading}
      />
      <StatCard
        label="Fornecedores"
        value={stats?.totalSuppliers}
        icon={Building2}
        isLoading={isLoading}
      />
      <StatCard
        label="Orgaos"
        value={stats?.totalAgencies}
        icon={Landmark}
        isLoading={isLoading}
      />
    </div>
  );
}
