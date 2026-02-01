import { Link } from "@tanstack/react-router";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
} from "@/components/ui";
import type {
  AgencyListItemDto,
  AgencySortField,
  SortOrder,
  ScoreCategory,
} from "@/lib/types";

interface AgenciesTableProps {
  agencies: AgencyListItemDto[];
  sortBy?: AgencySortField;
  order?: SortOrder;
  onSort: (field: AgencySortField) => void;
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function getScoreCategory(score: number | null): ScoreCategory | null {
  if (score === null) return null;
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

const categoryVariant: Record<ScoreCategory, "success" | "warning" | "danger"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
};

function SortIcon({
  field,
  sortBy,
  order,
}: {
  field: AgencySortField;
  sortBy?: AgencySortField;
  order?: SortOrder;
}) {
  if (sortBy !== field) {
    return <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />;
  }
  return order === "asc" ? (
    <ArrowUp className="ml-1 h-4 w-4" />
  ) : (
    <ArrowDown className="ml-1 h-4 w-4" />
  );
}

export function AgenciesTable({
  agencies,
  sortBy,
  order,
  onSort,
  isLoading,
}: AgenciesTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Carregando orgaos...
      </div>
    );
  }

  if (agencies.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Nenhum orgao encontrado.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => onSort("name")}
              >
                Orgao
                <SortIcon field="name" sortBy={sortBy} order={order} />
              </Button>
            </TableHead>
            <TableHead>Codigo</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => onSort("totalContracts")}
              >
                Contratos
                <SortIcon field="totalContracts" sortBy={sortBy} order={order} />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => onSort("totalValue")}
              >
                Valor Total
                <SortIcon field="totalValue" sortBy={sortBy} order={order} />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => onSort("averageScore")}
              >
                Score Medio
                <SortIcon field="averageScore" sortBy={sortBy} order={order} />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agencies.map((agency) => {
            const scoreCategory = getScoreCategory(agency.metrics.averageScore);
            return (
              <TableRow key={agency.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link
                    to="/orgaos/$agencyId"
                    params={{ agencyId: agency.id }}
                    className="block hover:underline"
                  >
                    <div className="font-medium">{agency.name}</div>
                    {agency.acronym && (
                      <div className="text-xs text-muted-foreground">
                        {agency.acronym}
                      </div>
                    )}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-sm">{agency.code}</TableCell>
                <TableCell className="tabular-nums">
                  {agency.metrics.totalContracts}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatCurrency(agency.metrics.totalValue)}
                </TableCell>
                <TableCell>
                  {scoreCategory !== null ? (
                    <Badge variant={categoryVariant[scoreCategory]} className="tabular-nums">
                      {Math.round(agency.metrics.averageScore!)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
