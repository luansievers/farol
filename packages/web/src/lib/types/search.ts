/**
 * Search Types
 */

// Search result types
export type SearchResultType = "contract" | "supplier" | "agency";

// Base search result item
export interface SearchResultItemBase {
  id: string;
  type: SearchResultType;
  label: string;
  sublabel: string;
}

// Contract search result
export interface ContractSearchResult extends SearchResultItemBase {
  type: "contract";
  value: number;
  category: string;
  anomalyScore: number | null;
}

// Supplier search result
export interface SupplierSearchResult extends SearchResultItemBase {
  type: "supplier";
  cnpj: string;
  totalContracts: number;
  totalValue: number;
}

// Agency search result
export interface AgencySearchResult extends SearchResultItemBase {
  type: "agency";
  code: string;
  totalContracts: number;
  totalValue: number;
}

// Union type for search results
export type SearchResultItem =
  | ContractSearchResult
  | SupplierSearchResult
  | AgencySearchResult;

// Grouped search results (autocomplete)
export interface GroupedSearchResults {
  contracts: ContractSearchResult[];
  suppliers: SupplierSearchResult[];
  agencies: AgencySearchResult[];
  totalCount: number;
}

// Full search results with totals
export interface FullSearchResults {
  contracts: {
    items: ContractSearchResult[];
    total: number;
  };
  suppliers: {
    items: SupplierSearchResult[];
    total: number;
  };
  agencies: {
    items: AgencySearchResult[];
    total: number;
  };
}

// Search params
export interface SearchParams {
  query: string;
  types?: SearchResultType[];
  limit?: number;
}
