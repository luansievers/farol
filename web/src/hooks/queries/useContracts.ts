import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ContractListItemDto,
  ContractListParams,
  PaginatedResponse,
} from "@/lib/types";

export const contractKeys = {
  all: ["contracts"] as const,
  lists: () => [...contractKeys.all, "list"] as const,
  list: (params: ContractListParams) =>
    [...contractKeys.lists(), params] as const,
  details: () => [...contractKeys.all, "detail"] as const,
  detail: (id: string) => [...contractKeys.details(), id] as const,
};

async function fetchContracts(
  params: ContractListParams
): Promise<PaginatedResponse<ContractListItemDto>> {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.category) searchParams.set("category", params.category);
  if (params.agencyId) searchParams.set("agencyId", params.agencyId);
  if (params.supplierId) searchParams.set("supplierId", params.supplierId);
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);
  if (params.minScore !== undefined)
    searchParams.set("minScore", String(params.minScore));
  if (params.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params.order) searchParams.set("order", params.order);

  const response = await api.get<PaginatedResponse<ContractListItemDto>>(
    `/contracts?${searchParams.toString()}`
  );
  return response.data;
}

export function useContracts(params: ContractListParams = {}) {
  return useQuery({
    queryKey: contractKeys.list(params),
    queryFn: () => fetchContracts(params),
    placeholderData: keepPreviousData,
  });
}
