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
  SupplierListItemDto,
  SupplierSortField,
  SortOrder,
  ScoreCategory,
} from "@/lib/types";

interface SuppliersTableProps {
  suppliers: SupplierListItemDto[];
  sortBy?: SupplierSortField;
  order?: SortOrder;
  onSort: (field: SupplierSortField) => void;
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

function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return cnpj;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
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
  field: SupplierSortField;
  sortBy?: SupplierSortField;
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

export function SuppliersTable({
  suppliers,
  sortBy,
  order,
  onSort,
  isLoading,
}: SuppliersTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Carregando fornecedores...
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Nenhum fornecedor encontrado.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => onSort("tradeName")}
              >
                Fornecedor
                <SortIcon field="tradeName" sortBy={sortBy} order={order} />
              </Button>
            </TableHead>
            <TableHead>CNPJ</TableHead>
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
          {suppliers.map((supplier) => {
            const scoreCategory = getScoreCategory(supplier.metrics.averageScore);
            return (
              <TableRow key={supplier.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link
                    to="/fornecedores/$supplierId"
                    params={{ supplierId: supplier.id }}
                    className="block hover:underline"
                  >
                    <div className="font-medium">{supplier.tradeName}</div>
                    <div className="text-xs text-muted-foreground">
                      {supplier.legalName}
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatCnpj(supplier.cnpj)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {supplier.metrics.totalContracts}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatCurrency(supplier.metrics.totalValue)}
                </TableCell>
                <TableCell>
                  {scoreCategory !== null ? (
                    <Badge variant={categoryVariant[scoreCategory]} className="tabular-nums">
                      {Math.round(supplier.metrics.averageScore!)}
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
