import { Button } from "@/components/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationInfo } from "@/lib/types";

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function Pagination({ pagination, onPageChange, itemLabel = "contratos" }: PaginationProps) {
  const { page, totalPages, total, pageSize } = pagination;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Mostrando {start} a {end} de {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Pagina {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Proxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
