import { Input, Select, Slider } from "@/components/ui";
import {
  ContractCategory,
  categoryLabels,
  type ContractFilters as Filters,
} from "@/lib/types";
import type { AgencyDto, SupplierDto } from "@/lib/types";

interface ContractFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  agencies?: AgencyDto[];
  suppliers?: SupplierDto[];
  isLoadingAgencies?: boolean;
  isLoadingSuppliers?: boolean;
}

export function ContractFilters({
  filters,
  onFiltersChange,
  agencies = [],
  suppliers = [],
  isLoadingAgencies,
  isLoadingSuppliers,
}: ContractFiltersProps) {
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
  };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <h3 className="font-semibold mb-4">Filtros</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Categoria
          </label>
          <Select
            value={filters.category || ""}
            onChange={(e) =>
              updateFilter(
                "category",
                e.target.value as ContractCategory | undefined
              )
            }
          >
            <option value="">Todas</option>
            {Object.entries(ContractCategory).map(([key, value]) => (
              <option key={key} value={value}>
                {categoryLabels[value]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Orgao
          </label>
          <Select
            value={filters.agencyId || ""}
            onChange={(e) => updateFilter("agencyId", e.target.value)}
            disabled={isLoadingAgencies}
          >
            <option value="">Todos</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.acronym || agency.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Fornecedor
          </label>
          <Select
            value={filters.supplierId || ""}
            onChange={(e) => updateFilter("supplierId", e.target.value)}
            disabled={isLoadingSuppliers}
          >
            <option value="">Todos</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.tradeName}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Data Inicio
          </label>
          <Input
            type="date"
            value={filters.startDate || ""}
            onChange={(e) => updateFilter("startDate", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Data Fim
          </label>
          <Input
            type="date"
            value={filters.endDate || ""}
            onChange={(e) => updateFilter("endDate", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Score Minimo: {filters.minScore ?? 0}
          </label>
          <Slider
            min={0}
            max={100}
            value={filters.minScore ?? 0}
            onChange={(e) => updateFilter("minScore", Number(e.target.value))}
            showValue
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Valor Minimo (R$)
          </label>
          <Input
            type="number"
            min={0}
            step={1000}
            placeholder="0"
            value={filters.minValue ?? ""}
            onChange={(e) =>
              updateFilter(
                "minValue",
                e.target.value ? Number(e.target.value) : undefined
              )
            }
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Valor Maximo (R$)
          </label>
          <Input
            type="number"
            min={0}
            step={1000}
            placeholder="Sem limite"
            value={filters.maxValue ?? ""}
            onChange={(e) =>
              updateFilter(
                "maxValue",
                e.target.value ? Number(e.target.value) : undefined
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
