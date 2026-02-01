import { Link } from "@tanstack/react-router";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { ThemeToggle } from "@/components/theme";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center px-4 md:px-6">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl">Farol</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm lg:gap-6">
            <Link
              to="/"
              className="text-foreground/60 transition-colors hover:text-foreground/80 [&.active]:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              to="/contratos"
              className="text-foreground/60 transition-colors hover:text-foreground/80 [&.active]:text-foreground"
            >
              Contratos
            </Link>
            <Link
              to="/fornecedores"
              className="text-foreground/60 transition-colors hover:text-foreground/80 [&.active]:text-foreground"
            >
              Fornecedores
            </Link>
            <Link
              to="/orgaos"
              className="text-foreground/60 transition-colors hover:text-foreground/80 [&.active]:text-foreground"
            >
              Orgaos
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <GlobalSearch />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
