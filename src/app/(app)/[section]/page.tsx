import { notFound } from "next/navigation";
import { Construction } from "lucide-react";
import { Card } from "@/components/ui/card";
import { allNavItems, findNavItem } from "@/lib/nav";

// Página genérica para as secções ainda por construir.
// Quando uma secção ganhar conteúdo, cria-se a pasta própria
// (ex.: src/app/(app)/refunds/page.tsx), que tem prioridade sobre esta rota.
export function generateStaticParams() {
  return allNavItems.filter((i) => i.href !== "/dashboard").map((i) => ({ section: i.href.slice(1) }));
}

export default async function SectionPage({ params }: PageProps<"/[section]">) {
  const { section } = await params;
  const item = findNavItem(section);
  if (!item) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-semibold">
          <item.icon className="size-7 text-primary" />
          {item.label}
        </h1>
        {item.description && <p className="mt-1 text-muted-foreground">{item.description}</p>}
      </div>
      <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <Construction className="size-8 text-muted-foreground" />
        <p className="font-medium">Secção em construção</p>
        <p className="text-sm text-muted-foreground">O conteúdo desta página será definido nas próximas etapas.</p>
      </Card>
    </div>
  );
}
