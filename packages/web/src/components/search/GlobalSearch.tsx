import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  FileText,
  Building2,
  Building,
  Loader2,
  Command,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSearchAutocomplete } from "@/hooks/queries/useSearch";
import type {
  SearchResultItem,
  ContractSearchResult,
  SupplierSearchResult,
  AgencySearchResult,
} from "@/lib/types";

interface GlobalSearchProps {
  className?: string;
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data, isLoading } = useSearchAutocomplete(query, open);

  // Flatten results for keyboard navigation
  const allResults = React.useMemo(() => {
    if (!data) return [];
    return [
      ...data.contracts,
      ...data.suppliers,
      ...data.agencies,
    ] as SearchResultItem[];
  }, [data]);

  // Reset selected index when results change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [allResults]);

  // Keyboard shortcut to open search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when dialog opens
  React.useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  const handleSelect = (item: SearchResultItem) => {
    setOpen(false);
    switch (item.type) {
      case "contract":
        navigate({ to: "/contratos/$contractId", params: { contractId: item.id } });
        break;
      case "supplier":
        navigate({ to: "/fornecedores/$supplierId", params: { supplierId: item.id } });
        break;
      case "agency":
        navigate({ to: "/orgaos/$agencyId", params: { agencyId: item.id } });
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (allResults[selectedIndex]) {
          handleSelect(allResults[selectedIndex]);
        } else if (query.length >= 2) {
          // Navigate to search results page
          setOpen(false);
          navigate({ to: "/busca", search: { q: query } });
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  const handleSearchClick = () => {
    if (query.length >= 2) {
      setOpen(false);
      navigate({ to: "/busca", search: { q: query } });
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        className={cn("gap-2 text-muted-foreground", className)}
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline-flex">Buscar</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">
            <Command className="h-3 w-3" />
          </span>
          K
        </kbd>
      </Button>

      {/* Search Dialog - Portal to body */}
      {open && createPortal(
        <div className="fixed inset-0 z-[100]">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="fixed left-1/2 top-[15vh] z-[101] w-full max-w-lg -translate-x-1/2 px-4">
            <div className="overflow-hidden rounded-xl border bg-background shadow-2xl">
              {/* Search Input */}
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Buscar contratos, fornecedores, órgãos..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Fechar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-[300px] overflow-y-auto p-2">
                {query.length < 2 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Digite pelo menos 2 caracteres para buscar
                  </div>
                ) : data && data.totalCount === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum resultado encontrado
                  </div>
                ) : data ? (
                  <div className="space-y-4">
                    {/* Contracts */}
                    {data.contracts.length > 0 && (
                      <ResultGroup
                        title="Contratos"
                        icon={<FileText className="h-4 w-4" />}
                        items={data.contracts}
                        selectedId={allResults[selectedIndex]?.id}
                        onSelect={handleSelect}
                        renderItem={(item) => (
                          <ContractResultItem item={item} />
                        )}
                      />
                    )}

                    {/* Suppliers */}
                    {data.suppliers.length > 0 && (
                      <ResultGroup
                        title="Fornecedores"
                        icon={<Building2 className="h-4 w-4" />}
                        items={data.suppliers}
                        selectedId={allResults[selectedIndex]?.id}
                        onSelect={handleSelect}
                        renderItem={(item) => (
                          <SupplierResultItem item={item} />
                        )}
                      />
                    )}

                    {/* Agencies */}
                    {data.agencies.length > 0 && (
                      <ResultGroup
                        title="Órgãos"
                        icon={<Building className="h-4 w-4" />}
                        items={data.agencies}
                        selectedId={allResults[selectedIndex]?.id}
                        onSelect={handleSelect}
                        renderItem={(item) => <AgencyResultItem item={item} />}
                      />
                    )}
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2">
                {query.length >= 2 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-muted-foreground hover:text-foreground"
                    onClick={handleSearchClick}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Ver todos os resultados para "{query}"
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Digite para buscar
                  </span>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]">
                    ESC
                  </kbd>
                  <span>para fechar</span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Result Group Component
interface ResultGroupProps<T extends SearchResultItem> {
  title: string;
  icon: React.ReactNode;
  items: T[];
  selectedId?: string;
  onSelect: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
}

function ResultGroup<T extends SearchResultItem>({
  title,
  icon,
  items,
  selectedId,
  onSelect,
  renderItem,
}: ResultGroupProps<T>) {
  return (
    <div>
      <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              "flex w-full cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors",
              selectedId === item.id
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
          >
            {renderItem(item)}
          </button>
        ))}
      </div>
    </div>
  );
}

// Contract Result Item
function ContractResultItem({ item }: { item: ContractSearchResult }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="truncate font-medium">{item.label}</div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{item.sublabel}</span>
        <span>•</span>
        <span>{formatCurrency(item.value)}</span>
        {item.anomalyScore !== null && (
          <>
            <span>•</span>
            <Badge
              variant={
                item.anomalyScore >= 70
                  ? "danger"
                  : item.anomalyScore >= 40
                    ? "warning"
                    : "success"
              }
              className="h-5 text-[10px]"
            >
              {item.anomalyScore}
            </Badge>
          </>
        )}
      </div>
    </div>
  );
}

// Supplier Result Item
function SupplierResultItem({ item }: { item: SupplierSearchResult }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="truncate font-medium">{item.label}</div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{item.sublabel}</span>
        <span>•</span>
        <span>{item.totalContracts} contratos</span>
        <span>•</span>
        <span>{formatCurrency(item.totalValue)}</span>
      </div>
    </div>
  );
}

// Agency Result Item
function AgencyResultItem({ item }: { item: AgencySearchResult }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="truncate font-medium">{item.label}</div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{item.sublabel}</span>
        <span>•</span>
        <span>{item.totalContracts} contratos</span>
        <span>•</span>
        <span>{formatCurrency(item.totalValue)}</span>
      </div>
    </div>
  );
}

// Format currency helper
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}
