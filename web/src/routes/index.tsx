import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Radar de Contratos Publicos
        </h1>
        <p className="text-muted-foreground">
          Analise automatica de contratos publicos com deteccao de anomalias
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">
            Total de Contratos
          </div>
          <div className="text-2xl font-bold">-</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">
            Com Anomalias
          </div>
          <div className="text-2xl font-bold">-</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">
            Fornecedores
          </div>
          <div className="text-2xl font-bold">-</div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">Orgaos</div>
          <div className="text-2xl font-bold">-</div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Contratos Recentes</h2>
        <p className="text-muted-foreground">
          Os contratos serao exibidos aqui quando a aplicacao estiver conectada a
          API.
        </p>
      </div>
    </div>
  );
}
