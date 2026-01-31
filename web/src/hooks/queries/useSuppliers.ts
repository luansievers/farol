import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SupplierDto, PaginatedResponse } from "@/lib/types";

export const supplierKeys = {
  all: ["suppliers"] as const,
  lists: () => [...supplierKeys.all, "list"] as const,
  list: (params?: { page?: number; pageSize?: number }) =>
    [...supplierKeys.lists(), params] as const,
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

export function useSuppliers(params?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: () => fetchSuppliers(params),
  });
}
