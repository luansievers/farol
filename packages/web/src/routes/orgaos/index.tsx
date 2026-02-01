import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AgenciesTable } from "@/components/agencies";
import { Pagination } from "@/components/contracts";
import { SearchInput } from "@/components/shared";
import { useAgencies } from "@/hooks/queries";
import type { AgencySortField, SortOrder } from "@/lib/types";

export const Route = createFileRoute("/orgaos/")({
  component: AgenciesPage,
});

function AgenciesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<AgencySortField>("name");
  const [order, setOrder] = useState<SortOrder>("asc");

  const { data, isLoading } = useAgencies({
    page,
    pageSize: 20,
    search: search || undefined,
    sortBy,
    order,
  });

  const handleSort = (field: AgencySortField) => {
    if (sortBy === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setOrder(field === "name" ? "asc" : "desc");
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
        <h1 className="text-3xl font-bold tracking-tight">Orgaos</h1>
        <p className="text-muted-foreground">
          Lista de orgaos publicos e suas contratacoes
        </p>
      </div>

      <div className="max-w-sm">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Buscar por nome ou codigo..."
        />
      </div>

      <AgenciesTable
        agencies={data?.data ?? []}
        sortBy={sortBy}
        order={order}
        onSort={handleSort}
        isLoading={isLoading}
      />

      {data?.pagination && (
        <Pagination
          pagination={data.pagination}
          onPageChange={setPage}
          itemLabel="orgaos"
        />
      )}
    </div>
  );
}
