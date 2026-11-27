"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useMounted, useStoreTick } from "@/lib/store";
import { MONTHS_LONG, todayInLisbon } from "@/lib/dates";
import { lastMonths, lastWeeks, type PeriodStats } from "@/lib/period-stats";
import { fmtMoney, fmtPct, fmtX } from "@/components/profit-sheet/format";

type Props = { period: "week" | "month" };

export function PeriodReports(props: Props) {
  const mounted = useMounted();
  if (!mounted) return <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />;
  return <PeriodReportsInner {...props} />;
}

const pct = (a: number, b: number) => (b ? ((a - b) / Math.abs(b)) * 100 : null);

function PeriodReportsInner({ period }: Props) {
  const [today] = useState(todayInLisbon);
  const tick = useStoreTick();
  const rows = useMemo(() => {
    void tick;
    const list = period === "week" ? lastWeeks(today, 12) : lastMonths(today, 12);
    return list.map((r) =>
      period === "month" ? { ...r, label: `${MONTHS_LONG[Number(r.key.slice(5, 7)) - 1]} ${r.key.slice(0, 4)}` } : r,
    );
  }, [period, today, tick]);

  const [selected, setSelected] = useState(0);
  const current = rows[selected];
  const previous = rows[selected + 1];
  const title = period === "week" ? "Week Reports" : "Monthly Reports";
  const unit = period === "week" ? "semana" : "mês";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">
          Resumo por {unit}, calculado a partir da Profit Sheet, das despesas e dos Daily Reports.
        </p>
      </div>

      {current && (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {period === "week" ? "Semana selecionada" : "Mês selecionado"}: <b className="text-foreground">{current.label}</b>
            {selected === 0 && <span> (em curso)</span>}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Stat label="Receita líquida" value={fmtMoney(current.totals.netRev)} delta={previous && pct(current.totals.netRev, previous.totals.netRev)} />
            <Stat label="Lucro (Profit Sheet)" value={fmtMoney(current.totals.profit)} delta={previous && pct(current.totals.profit, previous.totals.profit)} />
            <Stat label="Despesas" value={fmtMoney(current.expenses)} delta={previous && pct(current.expenses, previous.expenses)} goodWhenUp={false} />
            <Stat label="Lucro final" hint="Lucro da Profit Sheet menos despesas" value={fmtMoney(current.finalProfit)} delta={previous && pct(current.finalProfit, previous.finalProfit)} strong />
            <Stat label="ROAS" value={fmtX(current.totals.roas)} sub={`break-even ${fmtX(current.breakEven)}`} />
            <Stat label="Daily Reports" value={`${current.reportsSent} / ${current.reportDays}`} sub="dias com report" />
          </div>
        </section>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              {[period === "week" ? "Semana" : "Mês", "Receita líq.", "COGS", "Anúncios", "Taxas", "ROAS", "Lucro", "Margem", "Reembolsos", "Despesas", "Lucro final", "Reports"].map((h, i) => (
                <th key={h} className={cn("px-4 py-3 font-medium", i === 0 ? "text-left" : "text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r: PeriodStats, i) => {
              const t = r.totals;
              const fees = t.metaAgency + t.googleAgency + t.txFee - t.cashback;
              const empty = t.days === 0;
              return (
                <tr
                  key={r.key}
                  onClick={() => setSelected(i)}
                  className={cn("cursor-pointer border-b border-border last:border-0 hover:bg-muted/50", i === selected && "bg-primary/10")}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{r.label}</td>
                  {empty ? (
                    <td colSpan={11} className="px-4 py-3 text-right text-muted-foreground">Sem dados</td>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(t.netRev)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(t.cogs)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(t.adSpend)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(fees)}</td>
                      <td className={cn("px-4 py-3 text-right tabular-nums", r.breakEven && t.roas !== null && (t.roas >= r.breakEven ? "text-emerald-400" : "text-red-400"))}>{fmtX(t.roas)}</td>
                      <td className={cn("px-4 py-3 text-right tabular-nums", t.profit >= 0 ? "text-emerald-400" : "text-red-400")}>{fmtMoney(t.profit)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtPct(t.margin)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(t.reversals)} <span className="text-muted-foreground">({fmtPct(r.refundRate)})</span></td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(r.expenses)}</td>
                      <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", r.finalProfit >= 0 ? "text-emerald-400" : "text-red-400")}>{fmtMoney(r.finalProfit)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.reportsSent}/{r.reportDays}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat(props: { label: string; value: string; delta?: number | null | undefined; goodWhenUp?: boolean; sub?: string; hint?: string; strong?: boolean }) {
  const d = props.delta;
  const good = d === null || d === undefined ? null : (props.goodWhenUp ?? true) ? d >= 0 : d <= 0;
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", props.strong && "border-primary/50")} title={props.hint}>
      <p className="text-sm text-muted-foreground">{props.label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{props.value}</p>
      {d !== null && d !== undefined && Number.isFinite(d) ? (
        <p className={cn("text-xs", good ? "text-emerald-400" : "text-red-400")}>
          {d > 0 ? "+" : ""}{d.toFixed(1).replace(".", ",")}% vs anterior
        </p>
      ) : (
        props.sub && <p className="text-xs text-muted-foreground">{props.sub}</p>
      )}
    </div>
  );
}
