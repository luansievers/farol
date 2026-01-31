import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ContractListItemDto,
  ContractDetailDto,
  ContractListParams,
  PaginatedResponse,
  AmendmentDto,
  SimilarContractsResponseDto,
} from "@/lib/types";

export const contractKeys = {
  all: ["contracts"] as const,
  lists: () => [...contractKeys.all, "list"] as const,
  list: (params: ContractListParams) =>
    [...contractKeys.lists(), params] as const,
  details: () => [...contractKeys.all, "detail"] as const,
  detail: (id: string) => [...contractKeys.details(), id] as const,
  amendments: (id: string) => [...contractKeys.detail(id), "amendments"] as const,
  similar: (id: string) => [...contractKeys.detail(id), "similar"] as const,
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

// Fetch single contract detail
async function fetchContractDetail(id: string): Promise<ContractDetailDto> {
  const response = await api.get<ContractDetailDto>(`/contracts/${id}`);
  return response.data;
}

export function useContractDetail(id: string) {
  return useQuery({
    queryKey: contractKeys.detail(id),
    queryFn: () => fetchContractDetail(id),
    enabled: !!id,
  });
}

// Fetch contract amendments
async function fetchContractAmendments(id: string): Promise<AmendmentDto[]> {
  const response = await api.get<AmendmentDto[]>(`/contracts/${id}/amendments`);
  return response.data;
}

export function useContractAmendments(id: string) {
  return useQuery({
    queryKey: contractKeys.amendments(id),
    queryFn: () => fetchContractAmendments(id),
    enabled: !!id,
  });
}

// Fetch similar contracts
async function fetchSimilarContracts(
  id: string
): Promise<SimilarContractsResponseDto> {
  const response = await api.get<SimilarContractsResponseDto>(
    `/contracts/${id}/similar`
  );
  return response.data;
}

export function useSimilarContracts(id: string) {
  return useQuery({
    queryKey: contractKeys.similar(id),
    queryFn: () => fetchSimilarContracts(id),
    enabled: !!id,
  });
}
