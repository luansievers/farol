import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardStats } from "@/lib/types";

export const statsKeys = {
  all: ["stats"] as const,
  dashboard: () => [...statsKeys.all, "dashboard"] as const,
};

async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await api.get<DashboardStats>("/stats");
  return response.data;
}

export function useStats() {
  return useQuery({
    queryKey: statsKeys.dashboard(),
    queryFn: fetchDashboardStats,
    staleTime: 60 * 1000, // 1 minute
  });
}
