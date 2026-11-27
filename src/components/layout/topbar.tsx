import { Bell, Search } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        {/* Seletor de loja: será preenchido a partir da tabela `stores` */}
        <select className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm" defaultValue="all">
          <option value="all">Todas as lojas</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button aria-label="Pesquisar" className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
          <Search className="size-4" />
        </button>
        <button aria-label="Notificações" className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
          <Bell className="size-4" />
        </button>
      </div>
    </header>
  );
}
