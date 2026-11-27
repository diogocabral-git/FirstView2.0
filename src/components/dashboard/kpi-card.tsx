import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/utils";

type Props = {
  label: string;
  value: number;
  format: "currency" | "multiplier" | "percent";
  delta: number;
  deltaLabel: string;
};

function formatValue(value: number, format: Props["format"]) {
  if (format === "currency") return formatCurrency(value);
  if (format === "multiplier") return `${value.toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}×`;
  return formatPercent(value);
}

function formatDelta(delta: number, format: Props["format"]) {
  const sign = delta > 0 ? "+" : "";
  const n = (d: number) => delta.toLocaleString("pt-PT", { minimumFractionDigits: d, maximumFractionDigits: d });
  if (format === "multiplier") return `${sign}${n(2)}×`;
  if (format === "percent") return `${sign}${n(1)} pp`;
  return `${sign}${n(1)}%`;
}

export function KpiCard({ label, value, format, delta, deltaLabel }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <span className="text-xs text-muted-foreground">Este mês</span>
      </CardHeader>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">{formatValue(value, format)}</span>
        <Badge variant={delta >= 0 ? "positive" : "negative"}>{formatDelta(delta, format)}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{deltaLabel}</p>
    </Card>
  );
}
