import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  SupplierListItemDto,
  PaginatedResponse,
  SupplierDetailDto,
  SupplierSortField,
  SortOrder,
} from "@/lib/types";

export interface SuppliersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: SupplierSortField;
  order?: SortOrder;
}

export const supplierKeys = {
  all: ["suppliers"] as const,
  lists: () => [...supplierKeys.all, "list"] as const,
  list: (params?: SuppliersParams) => [...supplierKeys.lists(), params] as const,
  details: () => [...supplierKeys.all, "detail"] as const,
  detail: (id: string) => [...supplierKeys.details(), id] as const,
  contracts: (id: string) => [...supplierKeys.detail(id), "contracts"] as const,
};

async function fetchSuppliers(
  params?: SuppliersParams
): Promise<PaginatedResponse<SupplierListItemDto>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
  if (params?.order) searchParams.set("order", params.order);

  const response = await api.get<PaginatedResponse<SupplierListItemDto>>(
    `/suppliers?${searchParams.toString()}`
  );
  return response.data;
}

async function fetchSupplierDetail(id: string): Promise<SupplierDetailDto> {
  const response = await api.get<SupplierDetailDto>(`/suppliers/${id}`);
  return response.data;
}

export function useSuppliers(params?: SuppliersParams) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: () => fetchSuppliers(params),
  });
}

export function useSupplierDetail(id: string) {
  return useQuery({
    queryKey: supplierKeys.detail(id),
    queryFn: () => fetchSupplierDetail(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
