import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AgencyListItemDto,
  AgencyDetailDto,
  PaginatedResponse,
  AgencySortField,
  SortOrder,
} from "@/lib/types";

export interface AgenciesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: AgencySortField;
  order?: SortOrder;
}

export const agencyKeys = {
  all: ["agencies"] as const,
  lists: () => [...agencyKeys.all, "list"] as const,
  list: (params?: AgenciesParams) => [...agencyKeys.lists(), params] as const,
  details: () => [...agencyKeys.all, "detail"] as const,
  detail: (id: string) => [...agencyKeys.details(), id] as const,
};

async function fetchAgencies(
  params?: AgenciesParams
): Promise<PaginatedResponse<AgencyListItemDto>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.order) searchParams.set("order", params.order);

  const response = await api.get<PaginatedResponse<AgencyListItemDto>>(
    `/agencies?${searchParams.toString()}`
  );
  return response.data;
}

async function fetchAgencyDetail(id: string): Promise<AgencyDetailDto> {
  const response = await api.get<AgencyDetailDto>(`/agencies/${id}`);
  return response.data;
}

export function useAgencies(params?: AgenciesParams) {
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
