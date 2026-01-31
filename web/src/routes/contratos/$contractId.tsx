import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/contratos/$contractId")({
  component: ContractDetailPage,
});

function ContractDetailPage() {
  const { contractId } = Route.useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/contratos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          Detalhes do Contrato
        </h1>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p>Detalhes do contrato {contractId} serao exibidos aqui.</p>
        <p className="text-sm mt-2">Esta pagina sera implementada na proxima user story.</p>
      </div>
    </div>
  );
}
