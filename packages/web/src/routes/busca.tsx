import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  Search,
  FileText,
  Building2,
  Building,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useFullSearch } from "@/hooks/queries/useSearch";
import type {
  SearchResultType,
  ContractSearchResult,
  SupplierSearchResult,
  AgencySearchResult,
} from "@/lib/types";

const searchSchema = z.object({
  q: z.string().default(""),
  type: z.enum(["all", "contract", "supplier", "agency"]).default("all"),
});

export const Route = createFileRoute("/busca")({
  validateSearch: searchSchema,
  component: SearchResultsPage,
});

function SearchResultsPage() {
  const { q, type } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [inputValue, setInputValue] = useState(q);

  const types: SearchResultType[] | undefined =
    type === "all" ? undefined : [type];

  const { data, isLoading } = useFullSearch(
    { query: q, types, limit: 50 },
    q.length >= 2
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.length >= 2) {
      navigate({ search: { q: inputValue, type } });
    }
  };

  const handleTypeChange = (newType: "all" | SearchResultType) => {
    navigate({ search: { q, type: newType } });
  };

  const totalResults =
    (data?.contracts.total ?? 0) +
    (data?.suppliers.total ?? 0) +
    (data?.agencies.total ?? 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Busca</h1>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Buscar contratos, fornecedores, órgãos..."
              className="pl-10"
            />
          </div>
          <Button type="submit">Buscar</Button>
        </form>

        {/* Type Filter */}
        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={type === "all"}
            onClick={() => handleTypeChange("all")}
          >
            Todos
          </FilterButton>
          <FilterButton
            active={type === "contract"}
            onClick={() => handleTypeChange("contract")}
            icon={<FileText className="h-4 w-4" />}
          >
            Contratos
            {data && <span className="ml-1">({data.contracts.total})</span>}
          </FilterButton>
          <FilterButton
            active={type === "supplier"}
            onClick={() => handleTypeChange("supplier")}
            icon={<Building2 className="h-4 w-4" />}
          >
            Fornecedores
            {data && <span className="ml-1">({data.suppliers.total})</span>}
          </FilterButton>
          <FilterButton
            active={type === "agency"}
            onClick={() => handleTypeChange("agency")}
            icon={<Building className="h-4 w-4" />}
          >
            Órgãos
            {data && <span className="ml-1">({data.agencies.total})</span>}
          </FilterButton>
        </div>
      </div>

      {/* Results */}
      {q.length < 2 ? (
        <div className="py-12 text-center text-muted-foreground">
          Digite pelo menos 2 caracteres para buscar
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : totalResults === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg font-medium">Nenhum resultado encontrado</p>
          <p className="text-muted-foreground">
            Tente buscar com outros termos
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary */}
          <p className="text-sm text-muted-foreground">
            {totalResults} resultado{totalResults !== 1 ? "s" : ""} para "{q}"
          </p>

          {/* Contracts */}
          {(type === "all" || type === "contract") &&
            data &&
            data.contracts.items.length > 0 && (
              <ResultSection
                title="Contratos"
                icon={<FileText className="h-5 w-5" />}
                total={data.contracts.total}
                showAll={type !== "contract"}
                onShowAll={() => handleTypeChange("contract")}
              >
                {data.contracts.items.map((contract) => (
                  <ContractResultCard key={contract.id} contract={contract} />
                ))}
              </ResultSection>
            )}

          {/* Suppliers */}
          {(type === "all" || type === "supplier") &&
            data &&
            data.suppliers.items.length > 0 && (
              <ResultSection
                title="Fornecedores"
                icon={<Building2 className="h-5 w-5" />}
                total={data.suppliers.total}
                showAll={type !== "supplier"}
                onShowAll={() => handleTypeChange("supplier")}
              >
                {data.suppliers.items.map((supplier) => (
                  <SupplierResultCard key={supplier.id} supplier={supplier} />
                ))}
              </ResultSection>
            )}

          {/* Agencies */}
          {(type === "all" || type === "agency") &&
            data &&
            data.agencies.items.length > 0 && (
              <ResultSection
                title="Órgãos"
                icon={<Building className="h-5 w-5" />}
                total={data.agencies.total}
                showAll={type !== "agency"}
                onShowAll={() => handleTypeChange("agency")}
              >
                {data.agencies.items.map((agency) => (
                  <AgencyResultCard key={agency.id} agency={agency} />
                ))}
              </ResultSection>
            )}
        </div>
      )}
    </div>
  );
}

// Filter Button
interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function FilterButton({ active, onClick, icon, children }: FilterButtonProps) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className="gap-1.5"
    >
      {icon}
      {children}
    </Button>
  );
}

// Result Section
interface ResultSectionProps {
  title: string;
  icon: React.ReactNode;
  total: number;
  showAll: boolean;
  onShowAll: () => void;
  children: React.ReactNode;
}

function ResultSection({
  title,
  icon,
  total,
  showAll,
  onShowAll,
  children,
}: ResultSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold">
          {icon}
          {title}
          <span className="text-sm font-normal text-muted-foreground">
            ({total})
          </span>
        </div>
        {showAll && total > 5 && (
          <Button variant="ghost" size="sm" onClick={onShowAll}>
            Ver todos
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

// Contract Result Card
function ContractResultCard({ contract }: { contract: ContractSearchResult }) {
  return (
    <Link
      to="/contratos/$contractId"
      params={{ contractId: contract.id }}
      className="block rounded-lg border p-4 transition-colors hover:bg-accent/50"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="font-medium">{contract.label}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{contract.sublabel}</span>
            <span>•</span>
            <span>{formatCurrency(contract.value)}</span>
            <span>•</span>
            <Badge variant="outline">{formatCategory(contract.category)}</Badge>
          </div>
        </div>
        {contract.anomalyScore !== null && (
          <Badge
            variant={
              contract.anomalyScore >= 70
                ? "danger"
                : contract.anomalyScore >= 40
                  ? "warning"
                  : "success"
            }
          >
            Score: {contract.anomalyScore}
          </Badge>
        )}
      </div>
    </Link>
  );
}

// Supplier Result Card
function SupplierResultCard({ supplier }: { supplier: SupplierSearchResult }) {
  return (
    <Link
      to="/fornecedores/$supplierId"
      params={{ supplierId: supplier.id }}
      className="block rounded-lg border p-4 transition-colors hover:bg-accent/50"
    >
      <div className="font-medium">{supplier.label}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>{supplier.sublabel}</span>
        <span>•</span>
        <span>{supplier.totalContracts} contratos</span>
        <span>•</span>
        <span>Total: {formatCurrency(supplier.totalValue)}</span>
      </div>
    </Link>
  );
}

// Agency Result Card
function AgencyResultCard({ agency }: { agency: AgencySearchResult }) {
  return (
    <Link
      to="/orgaos/$agencyId"
      params={{ agencyId: agency.id }}
      className="block rounded-lg border p-4 transition-colors hover:bg-accent/50"
    >
      <div className="font-medium">{agency.label}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>{agency.sublabel}</span>
        <span>•</span>
        <span>{agency.totalContracts} contratos</span>
        <span>•</span>
        <span>Total: {formatCurrency(agency.totalValue)}</span>
      </div>
    </Link>
  );
}

// Helpers
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}

function formatCategory(category: string): string {
  const labels: Record<string, string> = {
    OBRAS: "Obras",
    SERVICOS: "Serviços",
    TI: "TI",
    SAUDE: "Saúde",
    EDUCACAO: "Educação",
    OUTROS: "Outros",
  };
  return labels[category] ?? category;
}
