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
  if (params.minValue !== undefined)
    searchParams.set("minValue", String(params.minValue));
  if (params.maxValue !== undefined)
    searchParams.set("maxValue", String(params.maxValue));
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

// Similar contracts filter options
export interface SimilarContractsParams {
  startDate?: string;
  endDate?: string;
}

// Fetch similar contracts
async function fetchSimilarContracts(
  id: string,
  params?: SimilarContractsParams
): Promise<SimilarContractsResponseDto> {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.endDate) searchParams.set("endDate", params.endDate);

  const queryString = searchParams.toString();
  const url = queryString
    ? `/contracts/${id}/similar?${queryString}`
    : `/contracts/${id}/similar`;

  const response = await api.get<SimilarContractsResponseDto>(url);
  return response.data;
}

export function useSimilarContracts(id: string, params?: SimilarContractsParams) {
  return useQuery({
    queryKey: [...contractKeys.similar(id), params] as const,
    queryFn: () => fetchSimilarContracts(id, params),
    enabled: !!id,
  });
}
