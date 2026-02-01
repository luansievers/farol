import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SupplierDto, PaginatedResponse, SupplierDetailDto } from "@/lib/types";

export const supplierKeys = {
  all: ["suppliers"] as const,
  lists: () => [...supplierKeys.all, "list"] as const,
  list: (params?: { page?: number; pageSize?: number }) =>
    [...supplierKeys.lists(), params] as const,
  details: () => [...supplierKeys.all, "detail"] as const,
  detail: (id: string) => [...supplierKeys.details(), id] as const,
  contracts: (id: string) => [...supplierKeys.detail(id), "contracts"] as const,
};

async function fetchSuppliers(params?: {
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResponse<SupplierDto>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));

  const response = await api.get<PaginatedResponse<SupplierDto>>(
    `/suppliers?${searchParams.toString()}`
  );
  return response.data;
}

async function fetchSupplierDetail(id: string): Promise<SupplierDetailDto> {
  const response = await api.get<SupplierDetailDto>(`/suppliers/${id}`);
  return response.data;
}

export function useSuppliers(params?: { page?: number; pageSize?: number }) {
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
