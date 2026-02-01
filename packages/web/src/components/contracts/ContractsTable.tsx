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
} from "@/components/ui";
import { ScoreBadge } from "./ScoreBadge";
import type {
  ContractListItemDto,
  ContractSortField,
  SortOrder,
} from "@/lib/types";
import { categoryLabels } from "@/lib/types";

interface ContractsTableProps {
  contracts: ContractListItemDto[];
  sortBy?: ContractSortField;
  order?: SortOrder;
  onSort: (field: ContractSortField) => void;
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

function SortIcon({
  field,
  sortBy,
  order,
}: {
  field: ContractSortField;
  sortBy?: ContractSortField;
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

export function ContractsTable({
  contracts,
  sortBy,
  order,
  onSort,
  isLoading,
}: ContractsTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Carregando contratos...
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Nenhum contrato encontrado.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[35%]">Objeto</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => onSort("value")}
              >
                Valor
                <SortIcon field="value" sortBy={sortBy} order={order} />
              </Button>
            </TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Orgao</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => onSort("signatureDate")}
              >
                Data
                <SortIcon field="signatureDate" sortBy={sortBy} order={order} />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8"
                onClick={() => onSort("totalScore")}
              >
                Score
                <SortIcon field="totalScore" sortBy={sortBy} order={order} />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell>
                <Link
                  to="/contratos/$contractId"
                  params={{ contractId: contract.id }}
                  className="hover:underline"
                >
                  <div className="font-medium">
                    {truncateText(contract.object, 80)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {categoryLabels[contract.category]} · {contract.number}
                  </div>
                </Link>
              </TableCell>
              <TableCell className="tabular-nums">
                {formatCurrency(contract.value)}
              </TableCell>
              <TableCell>
                <Link
                  to="/fornecedores/$supplierId"
                  params={{ supplierId: contract.supplier.id }}
                  className="hover:underline max-w-[150px] truncate block"
                >
                  {contract.supplier.tradeName}
                </Link>
              </TableCell>
              <TableCell>
                {contract.agency.acronym || contract.agency.name}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDate(contract.signatureDate)}
              </TableCell>
              <TableCell>
                {contract.anomalyScore ? (
                  <ScoreBadge
                    score={contract.anomalyScore.totalScore}
                    category={contract.anomalyScore.category}
                  />
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
