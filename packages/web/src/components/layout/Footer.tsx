export function Footer() {
  return (
    <footer className="border-t border-border/40 py-6 md:py-0">
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-4 px-4 md:h-14 md:flex-row md:px-6">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Farol - Radar de Contratos Publicos
        </p>
        <p className="text-center text-sm text-muted-foreground md:text-right">
          Dados do Portal da Transparencia
        </p>
      </div>
    </footer>
  );
}
