"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn, formatCurrency } from "@/lib/utils";
import { useMounted, useStoreTick } from "@/lib/store";
import { addDays, MONTHS_SHORT, todayInLisbon, WEEKDAYS_LONG, weekStart } from "@/lib/dates";
import { getDays, getExpenses, getFeeSettings, getSubscriptions } from "@/lib/data";
import { computeDay, isTracked, sumDays } from "@/lib/profit-sheet";
import { expenseCategories, monthExpenses } from "@/lib/expenses";
import { lastMonths, statsBetween } from "@/lib/period-stats";
import { fmtMoney, fmtPct, fmtX } from "@/components/profit-sheet/format";
import { Greeting } from "./greeting";
import { CommandCenter } from "./command-center";

type Range = "month" | "7" | "30" | "90";
const ranges: { key: Range; label: string }[] = [
  { key: "month", label: "Este mês" },
  { key: "7", label: "7 dias" },
  { key: "30", label: "30 dias" },
  { key: "90", label: "90 dias" },
];

const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" };
const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };
const CATEGORY_COLORS = ["var(--primary)", "#2dd4bf", "#f59e0b", "#a78bfa"];

export function Dashboard() {
  const mounted = useMounted();
  if (!mounted) return <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />;
  return <DashboardInner />;
}

function DashboardInner() {
  const [today] = useState(todayInLisbon);
  const [tab, setTabState] = useState<"dashboard" | "command">(() =>
    new URLSearchParams(location.search).get("tab") === "command" ? "command" : "dashboard",
  );
  const setTab = (t: "dashboard" | "command") => {
    setTabState(t);
    history.replaceState(null, "", t === "command" ? "?tab=command" : location.pathname);
  };
  return (
    <div className="space-y-6">
      <div>
        <Greeting />
        <p className="mt-1 text-muted-foreground">O ponto de situação das tuas lojas.</p>
      </div>
      <div className="flex w-fit rounded-lg border border-border bg-card p-0.5 text-sm">
        {([
          ["dashboard", "Dashboard"],
          ["command", "Command Center"],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={cn("rounded-md px-4 py-1.5", tab === key ? "bg-muted font-medium" : "text-muted-foreground")}>
            {label}
          </button>
        ))}
      </div>
      {tab === "dashboard" ? <Analytics today={today} /> : <CommandCenter today={today} />}
    </div>
  );
}

function rangeDates(range: Range, today: string) {
  const yesterday = addDays(today, -1);
  if (range === "month") {
    const from = `${today.slice(0, 7)}-01`;
    const len = Number(today.slice(8, 10)) - 1 || 1;
    // comparação: mesmos dias do mês anterior
    const prevStart = new Date(`${from}T12:00:00Z`);
    prevStart.setUTCMonth(prevStart.getUTCMonth() - 1);
    const pf = prevStart.toISOString().slice(0, 10);
    return { from, to: yesterday < from ? from : yesterday, prevFrom: pf, prevTo: addDays(pf, len - 1), label: `vs mesmos dias do mês anterior` };
  }
  const n = Number(range);
  const from = addDays(today, -n);
  return { from, to: yesterday, prevFrom: addDays(from, -n), prevTo: addDays(from, -1), label: `vs ${n} dias anteriores` };
}

function Analytics({ today }: { today: string }) {
  const tick = useStoreTick();
  const [range, setRange] = useState<Range>("month");
  const [metric, setMetric] = useState<"netRev" | "profit" | "cogs">("netRev");
  const [refundWindow, setRefundWindow] = useState<30 | 90>(30);

  const data = useMemo(() => {
    void tick;
    const r = rangeDates(range, today);
    const cur = statsBetween(r.from, r.to, today);
    const prev = statsBetween(r.prevFrom, r.prevTo, today);

    const months = lastMonths(today, 12).reverse().map((s) => ({
      label: MONTHS_SHORT[Number(s.key.slice(5, 7)) - 1].toUpperCase(),
      key: s.key,
      netRev: s.totals.netRev,
      profit: s.totals.profit,
      cogs: s.totals.cogs,
      days: s.totals.days,
    }));

    const fees = getFeeSettings();
    const last30 = sumDays(getDays(addDays(today, -30), addDays(today, -1)), fees);
    const refundsWin = sumDays(getDays(addDays(today, -refundWindow), addDays(today, -1)), fees);

    // reembolsos por semana (últimas 8)
    const monday = weekStart(today);
    const weeklyRefunds = Array.from({ length: 8 }, (_, i) => {
      const from = addDays(monday, -7 * (7 - i));
      const t = sumDays(getDays(from, addDays(from, 6)), fees);
      return { label: `${Number(from.slice(8, 10))}/${Number(from.slice(5, 7))}`, value: t.reversals };
    });

    // desempenho por dia da semana (últimos 90 dias)
    const byWeekday = Array.from({ length: 7 }, () => ({ profit: 0, rev: 0, n: 0 }));
    for (const d of getDays(addDays(today, -90), addDays(today, -1))) {
      if (!isTracked(d)) continue;
      const res = computeDay(d, fees);
      const wd = new Date(`${d.date}T12:00:00Z`).getUTCDay();
      byWeekday[wd].profit += res.profit;
      byWeekday[wd].rev += res.netRev;
      byWeekday[wd].n++;
    }
    const weekdays = [1, 2, 3, 4, 5, 6, 0].map((wd) => ({
      label: WEEKDAYS_LONG[wd].slice(0, 3),
      name: WEEKDAYS_LONG[wd],
      profit: byWeekday[wd].n ? byWeekday[wd].profit / byWeekday[wd].n : 0,
      rev: byWeekday[wd].n ? byWeekday[wd].rev / byWeekday[wd].n : 0,
    }));

    const y = Number(today.slice(0, 4));
    const m = Number(today.slice(5, 7)) - 1;
    const exp = monthExpenses(getExpenses(), getSubscriptions(), y, m);

    return { r, cur, prev, months, last30, refundsWin, weeklyRefunds, weekdays, exp };
  }, [tick, range, today, refundWindow]);

  const { cur, prev, months } = data;
  const pct = (a: number | null, b: number | null) => (a === null || b === null || !b ? null : ((a - b) / Math.abs(b)) * 100);

  const withData = months.filter((mm) => mm.days > 0);
  const best = withData.reduce((a, b) => (b[metric] > a[metric] ? b : a), withData[0] ?? { label: "—", [metric]: 0 });
  const avg = withData.length ? withData.reduce((a, b) => a + b[metric], 0) / withData.length : 0;
  const ytd = months.filter((mm) => mm.key.startsWith(today.slice(0, 4))).reduce((a, b) => a + b[metric], 0);
  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const metricLabel = { netRev: "Receita líquida", profit: "Lucro", cogs: "COGS" }[metric];

  const l30 = data.last30;
  const costRows = [
    { label: "Produto (COGS)", value: l30.cogs },
    { label: "Anúncios", value: l30.adSpend },
    { label: "Taxas", value: l30.metaAgency + l30.googleAgency + l30.txFee - l30.cashback },
    { label: "Reembolsos", value: l30.reversals },
  ];
  const costTotal = costRows.reduce((a, b) => a + b.value, 0);
  const rw = data.refundsWin;
  const refundRate = rw.gross ? (rw.reversals / rw.gross) * 100 : null;

  const bestWd = data.weekdays.reduce((a, b) => (b.profit > a.profit ? b : a));
  const worstWd = data.weekdays.reduce((a, b) => (b.profit < a.profit ? b : a));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Todas as lojas · {data.r.label}</p>
        <div className="flex rounded-lg border border-border bg-card p-0.5 text-sm">
          {ranges.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)} className={cn("rounded-md px-3 py-1", range === r.key ? "bg-muted font-medium" : "text-muted-foreground")}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Receita líquida" value={fmtMoney(cur.totals.netRev)} delta={pct(cur.totals.netRev, prev.totals.netRev)} sub={`${fmtMoney(cur.totals.netRev - prev.totals.netRev)} ${data.r.label}`} />
        <Kpi label="ROAS" value={fmtX(cur.totals.roas)} delta={pct(cur.totals.roas, prev.totals.roas)} sub={`${fmtMoney(cur.totals.adSpend)} em anúncios`} />
        <Kpi label="Lucro" value={fmtMoney(cur.totals.profit)} delta={pct(cur.totals.profit, prev.totals.profit)} sub={`${fmtMoney(cur.totals.profit - prev.totals.profit)} ${data.r.label}`} />
        <Kpi label="Margem" value={fmtPct(cur.totals.margin)} delta={cur.totals.margin !== null && prev.totals.margin !== null ? cur.totals.margin - prev.totals.margin : null} unit="pp" sub="lucro sobre a receita líquida" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{metricLabel} · 12 meses</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{fmtMoney(thisMonth[metric])}</p>
              {lastMonth && (
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    const d = pct(thisMonth[metric], lastMonth[metric]);
                    return d === null ? "" : `${d > 0 ? "+" : ""}${d.toFixed(1).replace(".", ",")}% ${thisMonth.label} vs mês anterior (até agora)`;
                  })()}
                </p>
              )}
            </div>
            <select value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
              <option value="netRev">Receita líquida</option>
              <option value="profit">Lucro</option>
              <option value="cogs">COGS</option>
            </select>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <MiniStat label="Melhor mês" value={`${best.label} · ${formatCurrency(best[metric] ?? 0, { compact: true })}`} />
            <MiniStat label="Média mensal" value={`${formatCurrency(avg, { compact: true })} · ${withData.length} meses`} />
            <MiniStat label={`Acumulado ${today.slice(0, 4)}`} value={fmtMoney(ytd)} />
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis tickLine={false} axisLine={false} width={56} tick={axisTick} tickFormatter={(v: number) => formatCurrency(v, { compact: true })} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} formatter={(v) => [fmtMoney(Number(v)), metricLabel]} />
                {avg > 0 && <ReferenceLine y={avg} stroke="var(--muted-foreground)" strokeDasharray="4 4" />}
                <Bar dataKey={metric} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                  {months.map((mm) => (
                    <Cell key={mm.key} fill={metric === "cogs" ? "#f59e0b" : metric === "profit" && mm.profit < 0 ? "#f87171" : "var(--primary)"} fillOpacity={mm.key === thisMonth.key ? 1 : 0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Estrutura de custos</h3>
            <span className="text-xs text-muted-foreground">últimos 30 dias</span>
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">{fmtMoney(costTotal)}</p>
          <p className="text-sm text-muted-foreground">{l30.netRev ? fmtPct((costTotal / l30.netRev) * 100) : "—"} da receita líquida</p>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
            {costRows.map((c, i) => (
              <div key={c.label} style={{ width: `${costTotal ? (c.value / costTotal) * 100 : 0}%`, background: CATEGORY_COLORS[i] }} className="border-r-2 border-card last:border-0" />
            ))}
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {costRows.map((c, i) => (
              <li key={c.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm" style={{ background: CATEGORY_COLORS[i] }} />
                  {c.label}
                </span>
                <span className="tabular-nums">
                  {fmtMoney(c.value)} <span className="text-muted-foreground">· {costTotal ? fmtPct((c.value / costTotal) * 100) : "—"}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Reembolsos</h3>
            <div className="flex rounded-md border border-border p-0.5 text-xs">
              {([30, 90] as const).map((w) => (
                <button key={w} onClick={() => setRefundWindow(w)} className={cn("rounded px-2 py-0.5", refundWindow === w ? "bg-muted font-medium" : "text-muted-foreground")}>
                  {w} dias
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">{fmtPct(refundRate)}</p>
          <p className="text-sm text-muted-foreground">da receita bruta foi reembolsada · {fmtMoney(rw.reversals)}</p>
          <p className="mt-4 text-xs text-muted-foreground">Valor reembolsado por semana</p>
          <div className="mt-1 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyRefunds} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} formatter={(v) => [fmtMoney(Number(v)), "Reembolsos"]} />
                <Bar dataKey="value" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Despesas</h3>
            <Link href="/expenses" className="text-xs text-primary hover:underline">Ver despesas</Link>
          </div>
          <p className="mt-3 text-3xl font-semibold tabular-nums">{fmtMoney(data.exp.total)}</p>
          <p className="text-sm text-muted-foreground">este mês · todas as lojas</p>
          <div className="mt-2 flex items-center gap-4">
            <div className="size-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategories.map((c) => ({ name: c.label, value: data.exp.byCategory[c.key] }))}
                    dataKey="value"
                    innerRadius={38}
                    outerRadius={60}
                    stroke="var(--card)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {expenseCategories.map((c, i) => <Cell key={c.key} fill={CATEGORY_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [fmtMoney(Number(v)), n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex-1 space-y-2 text-sm">
              {expenseCategories.map((c, i) => (
                <li key={c.key} className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="size-2.5 rounded-sm" style={{ background: CATEGORY_COLORS[i] }} />{c.label}</span>
                  <span className="tabular-nums">{fmtMoney(data.exp.byCategory[c.key])}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Por dia da semana</h3>
            <span className="text-xs text-muted-foreground">lucro médio · 90 dias</span>
          </div>
          <p className="mt-3 text-sm">
            Melhor dia: <b className="text-emerald-400">{bestWd.name}</b> · pior dia: <b className="text-red-400">{worstWd.name}</b>
          </p>
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weekdays} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
                <YAxis tickLine={false} axisLine={false} width={48} tick={axisTick} tickFormatter={(v: number) => formatCurrency(v, { compact: true })} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} formatter={(v, n) => [fmtMoney(Number(v)), n === "profit" ? "Lucro médio" : "Receita média"]} />
                <Bar dataKey="profit" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
                  {data.weekdays.map((w) => (
                    <Cell key={w.label} fill={w.name === bestWd.name ? "#34d399" : w.name === worstWd.name ? "#f87171" : "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>
    </div>
  );
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-xl border border-border bg-card p-5", className)}>{children}</div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
    </div>
  );
}

function Kpi({ label, value, delta, sub, unit = "%" }: { label: string; value: string; delta: number | null; sub: string; unit?: "%" | "pp" }) {
  return (
    <Card>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">{value}</span>
        {delta !== null && Number.isFinite(delta) && (
          <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", delta >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")}>
            {delta > 0 ? "+" : ""}{delta.toFixed(1).replace(".", ",")}{unit === "pp" ? " pp" : "%"}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
    </Card>
  );
}
