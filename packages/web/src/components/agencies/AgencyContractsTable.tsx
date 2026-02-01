import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { ScoreBadge } from "@/components/contracts";
import { categoryLabels } from "@/lib/types";
import type { AgencyContractDto } from "@/lib/types";

interface AgencyContractsTableProps {
  contracts: AgencyContractDto[];
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function AgencyContractsTable({
  contracts,
  isLoading,
}: AgencyContractsTableProps) {
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
        Nenhum contrato encontrado para este órgão.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Objeto</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Score</TableHead>
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
                  className="hover:underline"
                >
                  {contract.supplier.tradeName}
                </Link>
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
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
