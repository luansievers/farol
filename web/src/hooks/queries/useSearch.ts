import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  GroupedSearchResults,
  FullSearchResults,
  SearchParams,
} from "@/lib/types";

export const searchKeys = {
  all: ["search"] as const,
  autocomplete: (query: string) => [...searchKeys.all, "autocomplete", query] as const,
  full: (params: SearchParams) => [...searchKeys.all, "full", params] as const,
};

// Fetch autocomplete results
async function fetchAutocomplete(
  params: SearchParams
): Promise<GroupedSearchResults> {
  const searchParams = new URLSearchParams();
  searchParams.set("q", params.query);
  if (params.types?.length) {
    searchParams.set("types", params.types.join(","));
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const response = await api.get<GroupedSearchResults>(
    `/search/autocomplete?${searchParams.toString()}`
  );
  return response.data;
}

// Hook for autocomplete
export function useSearchAutocomplete(query: string, enabled = true) {
  return useQuery({
    queryKey: searchKeys.autocomplete(query),
    queryFn: () => fetchAutocomplete({ query }),
    enabled: enabled && query.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30000, // 30 seconds
  });
}

// Fetch full search results
async function fetchFullSearch(
  params: SearchParams
): Promise<FullSearchResults> {
  const searchParams = new URLSearchParams();
  searchParams.set("q", params.query);
  if (params.types?.length) {
    searchParams.set("types", params.types.join(","));
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const response = await api.get<FullSearchResults>(
    `/search?${searchParams.toString()}`
  );
  return response.data;
}

// Hook for full search
export function useFullSearch(params: SearchParams, enabled = true) {
  return useQuery({
    queryKey: searchKeys.full(params),
    queryFn: () => fetchFullSearch(params),
    enabled: enabled && params.query.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30000, // 30 seconds
  });
}
