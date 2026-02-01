import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SuppliersTable } from "@/components/suppliers";
import { Pagination } from "@/components/contracts";
import { SearchInput } from "@/components/shared";
import { useSuppliers } from "@/hooks/queries";
import type { SupplierSortField, SortOrder } from "@/lib/types";

export const Route = createFileRoute("/fornecedores/")({
  component: SuppliersPage,
});

function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SupplierSortField>("tradeName");
  const [order, setOrder] = useState<SortOrder>("asc");

  const { data, isLoading } = useSuppliers({
    page,
    pageSize: 20,
    search: search || undefined,
    sortBy,
    order,
  });

  const handleSort = (field: SupplierSortField) => {
    if (sortBy === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setOrder(field === "tradeName" ? "asc" : "desc");
    }
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
        <p className="text-muted-foreground">
          Lista de fornecedores com contratos publicos
        </p>
      </div>

      <div className="max-w-sm">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Buscar por nome ou CNPJ..."
        />
      </div>

      <SuppliersTable
        suppliers={data?.data ?? []}
        sortBy={sortBy}
        order={order}
        onSort={handleSort}
        isLoading={isLoading}
      />

      {data?.pagination && (
        <Pagination
          pagination={data.pagination}
          onPageChange={setPage}
          itemLabel="fornecedores"
        />
      )}
    </div>
  );
}
