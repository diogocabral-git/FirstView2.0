import { Card, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Props = {
  total: number;
  budget: number;
  categories: { label: string; value: number }[];
};

// Medidor semicircular simples em SVG: total gasto face ao orçamento mensal.
function Gauge({ ratio }: { ratio: number }) {
  const r = 80;
  const circumference = Math.PI * r;
  const filled = Math.min(Math.max(ratio, 0), 1) * circumference;
  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-60" role="img" aria-label={`${Math.round(ratio * 100)}% do orçamento`}>
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--muted)" strokeWidth="16" strokeLinecap="round" />
      <path
        d="M20 100 A80 80 0 0 1 180 100"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
      />
    </svg>
  );
}

export function ExpensesCard({ total, budget, categories }: Props) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-base font-semibold">Despesas</h3>
        <span className="text-xs text-muted-foreground">Este mês · todas as lojas</span>
      </CardHeader>
      <div className="relative flex justify-center">
        <Gauge ratio={total / budget} />
        <div className="absolute bottom-0 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-semibold tabular-nums">{formatCurrency(total)}</p>
        </div>
      </div>
      <p className="mt-1 text-center text-xs text-muted-foreground">Orçamento {formatCurrency(budget)}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {categories.map((c) => (
          <div key={c.label} className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="font-medium tabular-nums">{formatCurrency(c.value)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
