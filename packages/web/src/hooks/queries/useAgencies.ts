import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AgencyDto, AgencyDetailDto, PaginatedResponse } from "@/lib/types";

export const agencyKeys = {
  all: ["agencies"] as const,
  lists: () => [...agencyKeys.all, "list"] as const,
  list: (params?: { page?: number; pageSize?: number }) =>
    [...agencyKeys.lists(), params] as const,
  details: () => [...agencyKeys.all, "detail"] as const,
  detail: (id: string) => [...agencyKeys.details(), id] as const,
};

async function fetchAgencies(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<AgencyDto>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));

  const response = await api.get<PaginatedResponse<AgencyDto>>(
    `/agencies?${searchParams.toString()}`
  );
  return response.data;
}

async function fetchAgencyDetail(id: string): Promise<AgencyDetailDto> {
  const response = await api.get<AgencyDetailDto>(`/agencies/${id}`);
  return response.data;
}

export function useAgencies(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: agencyKeys.list(params),
    queryFn: () => fetchAgencies(params),
  });
}

export function useAgencyDetail(id: string) {
  return useQuery({
    queryKey: agencyKeys.detail(id),
    queryFn: () => fetchAgencyDetail(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
