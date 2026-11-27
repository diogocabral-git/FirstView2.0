import { cn } from "@/lib/utils";
import { breakEvenRoas, type Totals } from "@/lib/profit-sheet";
import { fmtDelta, fmtMoney, fmtPct, fmtX } from "./format";

type Props = { current: Totals; previous: Totals; daysInMonth: number };

const pctChange = (a: number | null, b: number | null) => (a === null || b === null || b === 0 ? null : ((a - b) / Math.abs(b)) * 100);

function Delta({ value, goodWhenUp = true }: { value: number | null; goodWhenUp?: boolean }) {
  const text = fmtDelta(value);
  if (!text || value === null) return null;
  const good = goodWhenUp ? value >= 0 : value <= 0;
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", good ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>
      {text}
    </span>
  );
}

function Tile(props: { label: string; value: string; delta: number | null; goodWhenUp?: boolean; footLabel: string; footValue: string }) {
  return (
    <div className="flex flex-col justify-between gap-4 p-5">
      <div>
        <p className="text-sm text-muted-foreground">{props.label}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums">{props.value}</span>
          <Delta value={props.delta} goodWhenUp={props.goodWhenUp} />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">{props.footLabel}</span>
        <span className="font-medium tabular-nums">{props.footValue}</span>
      </div>
    </div>
  );
}

export function ProfitSummary({ current: c, previous: p, daysInMonth }: Props) {
  return (
    <section className="grid divide-y divide-border rounded-xl border border-border bg-card sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
      <Tile label="Lucro" value={fmtMoney(c.profit)} delta={pctChange(c.profit, p.profit)} footLabel="Margem" footValue={fmtPct(c.margin)} />
      <Tile label="Receita líquida" value={fmtMoney(c.netRev)} delta={pctChange(c.netRev, p.netRev)} footLabel="Dias registados" footValue={`${c.days} / ${daysInMonth}`} />
      <Tile label="Custo dos produtos" value={fmtMoney(c.cogs)} delta={pctChange(c.cogs, p.cogs)} goodWhenUp={false} footLabel="Da receita" footValue={fmtPct(c.cogPct)} />
      <Tile label="Gasto em anúncios" value={fmtMoney(c.adSpend)} delta={pctChange(c.adSpend, p.adSpend)} goodWhenUp={false} footLabel="Da receita" footValue={fmtPct(c.netRev ? (c.adSpend / c.netRev) * 100 : null)} />
      <Tile label="ROAS" value={fmtX(c.roas)} delta={pctChange(c.roas, p.roas)} footLabel="Break-even" footValue={fmtX(breakEvenRoas(c))} />
    </section>
  );
}
