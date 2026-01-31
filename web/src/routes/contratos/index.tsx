import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ContractFilters,
  ContractsTable,
  Pagination,
} from "@/components/contracts";
import { useContracts, useAgencies, useSuppliers } from "@/hooks/queries";
import type {
  ContractFilters as Filters,
  ContractSortField,
  SortOrder,
} from "@/lib/types";

export const Route = createFileRoute("/contratos/")({
  component: ContractsPage,
});

function ContractsPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<ContractSortField>("signatureDate");
  const [order, setOrder] = useState<SortOrder>("desc");

  const { data: contractsData, isLoading: isLoadingContracts } = useContracts({
    ...filters,
    page,
    pageSize: 20,
    sortBy,
    order,
  });

  const { data: agenciesData, isLoading: isLoadingAgencies } = useAgencies({
    pageSize: 100,
  });
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useSuppliers({
    pageSize: 100,
  });

  const handleSort = (field: ContractSortField) => {
    if (sortBy === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setOrder("desc");
    }
    setPage(1);
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
        <p className="text-muted-foreground">
          Lista de contratos publicos com filtros e ordenacao
        </p>
      </div>

      <ContractFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        agencies={agenciesData?.data}
        suppliers={suppliersData?.data}
        isLoadingAgencies={isLoadingAgencies}
        isLoadingSuppliers={isLoadingSuppliers}
      />

      <ContractsTable
        contracts={contractsData?.data ?? []}
        sortBy={sortBy}
        order={order}
        onSort={handleSort}
        isLoading={isLoadingContracts}
      />

      {contractsData?.pagination && (
        <Pagination
          pagination={contractsData.pagination}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
