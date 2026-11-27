"use client";

import { Fragment, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeDay, daysInMonth, defaultFees, isIncomplete, isTracked, mockMonth, sumDays, weekday,
  type DayInput, type DayResult, type Fees, type Totals,
} from "@/lib/profit-sheet";
import { EditableCell, type Source } from "./editable-cell";
import { ProfitSummary } from "./summary";
import { fmtMoney, fmtPct, fmtX } from "./format";

// ---------- colunas ----------

type GroupKey = "revenue" | "costs" | "ads" | "fees" | "result" | "metrics";
type InputKey = "gross" | "discounts" | "reversals" | "cogs" | "adsMeta" | "adsGoogle" | "txFee";
type Tone = "pos" | "neg" | null;

type Column = {
  key: string;
  group: GroupKey;
  label: string;
  hint?: string;
  input?: { field: InputKey; source: Source };
  cell?: (d: DayInput, r: DayResult) => string;
  total?: (t: Totals) => string;
  tone?: (r: { profit: number; roas: number | null }, breakEven: number | null) => Tone;
};

const groups: { key: GroupKey; label: string; head: string; bar: string }[] = [
  { key: "revenue", label: "Receita", head: "bg-teal-950/70", bar: "bg-teal-400" },
  { key: "costs", label: "Custos", head: "bg-violet-950/60", bar: "bg-violet-400" },
  { key: "ads", label: "Anúncios", head: "bg-blue-950/70", bar: "bg-blue-400" },
  { key: "fees", label: "Taxas", head: "bg-slate-800/60", bar: "bg-slate-400" },
  { key: "result", label: "Resultado", head: "bg-sky-950/70", bar: "bg-sky-400" },
  { key: "metrics", label: "Métricas", head: "bg-zinc-800/60", bar: "bg-zinc-400" },
];

const profitTone = (r: { profit: number }): Tone => (r.profit >= 0 ? "pos" : "neg");

const columns: Column[] = [
  { key: "gross", group: "revenue", label: "Receita bruta", input: { field: "gross", source: "shopify" }, total: (t) => fmtMoney(t.gross) },
  { key: "discounts", group: "revenue", label: "Descontos", input: { field: "discounts", source: "shopify" }, total: (t) => fmtMoney(t.discounts) },
  { key: "reversals", group: "revenue", label: "Reembolsos", input: { field: "reversals", source: "shopify" }, total: (t) => fmtMoney(t.reversals) },
  { key: "netRev", group: "revenue", label: "Receita líq.", hint: "Bruta − descontos − reembolsos", cell: (_, r) => fmtMoney(r.netRev), total: (t) => fmtMoney(t.netRev) },
  { key: "aov", group: "revenue", label: "AOV", hint: "Valor médio por encomenda", cell: (_, r) => fmtMoney(r.aov), total: (t) => fmtMoney(t.aov) },

  { key: "cogs", group: "costs", label: "COGS", input: { field: "cogs", source: "manual" }, total: (t) => fmtMoney(t.cogs) },
  { key: "cogPct", group: "costs", label: "COGS %", hint: "COGS / receita líquida", cell: (_, r) => fmtPct(r.cogPct), total: (t) => fmtPct(t.cogPct) },

  { key: "adsMeta", group: "ads", label: "Ads Meta", input: { field: "adsMeta", source: "meta" }, total: (t) => fmtMoney(t.adsMeta) },
  { key: "adsGoogle", group: "ads", label: "Ads Google", input: { field: "adsGoogle", source: "google" }, total: (t) => fmtMoney(t.adsGoogle) },
  { key: "cashback", group: "ads", label: "Cashback", hint: "Cashback do cartão sobre o gasto em anúncios", cell: (_, r) => fmtMoney(r.cashback), total: (t) => fmtMoney(t.cashback) },
  {
    key: "roas", group: "ads", label: "ROAS", hint: "Receita líquida / gasto em anúncios",
    cell: (_, r) => fmtX(r.roas), total: (t) => fmtX(t.roas),
    tone: (r, be) => (r.roas === null || be === null ? null : r.roas >= be ? "pos" : "neg"),
  },

  { key: "metaAgency", group: "fees", label: "Agência Meta", hint: "% sobre o gasto Meta", cell: (_, r) => fmtMoney(r.metaAgency), total: (t) => fmtMoney(t.metaAgency) },
  { key: "googleAgency", group: "fees", label: "Agência Google", hint: "% sobre o gasto Google", cell: (_, r) => fmtMoney(r.googleAgency), total: (t) => fmtMoney(t.googleAgency) },
  { key: "txFee", group: "fees", label: "Taxas pag.", input: { field: "txFee", source: "shopify" }, total: (t) => fmtMoney(t.txFee) },

  { key: "totalCost", group: "result", label: "Custo total", hint: "COGS + anúncios + agências + taxas − cashback", cell: (_, r) => fmtMoney(r.totalCost), total: (t) => fmtMoney(t.totalCost) },
  { key: "profit", group: "result", label: "Lucro", cell: (_, r) => fmtMoney(r.profit), total: (t) => fmtMoney(t.profit), tone: profitTone },
  { key: "margin", group: "result", label: "Margem", cell: (_, r) => fmtPct(r.margin), total: (t) => fmtPct(t.margin), tone: profitTone },

  { key: "atc", group: "metrics", label: "ATC", hint: "Add to cart rate", cell: (d) => fmtPct(d.atc) },
  { key: "checkout", group: "metrics", label: "Checkout", hint: "Checkout rate", cell: (d) => fmtPct(d.checkout) },
  { key: "cvr", group: "metrics", label: "CVR", hint: "Taxa de conversão", cell: (d) => fmtPct(d.cvr) },
];

const toneClass = (t: Tone) => (t === "pos" ? "bg-emerald-500/10 text-emerald-400" : t === "neg" ? "bg-red-500/10 text-red-400" : "");

// ---------- utilitários ----------

const monthLabel = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric", timeZone: "UTC" });
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const dayLabel = { format: (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}` };
const weekdayLabel = { format: (d: Date) => WEEKDAYS[d.getUTCDay()] };
const asDate = (iso: string) => new Date(`${iso}T12:00:00Z`);

function todayInLisbon() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

const storageKey = (y: number, m: number) => `fv.profitSheet.${y}-${m + 1}`;

function loadMonth(y: number, m: number, today: string): DayInput[] {
  const raw = localStorage.getItem(storageKey(y, m));
  if (raw) {
    try {
      return JSON.parse(raw) as DayInput[];
    } catch {}
  }
  return mockMonth(y, m, today);
}

function loadFees(): Fees {
  try {
    return { ...defaultFees, ...JSON.parse(localStorage.getItem("fv.profitSheet.fees") ?? "{}") };
  } catch {
    return defaultFees;
  }
}

const subscribeNoop = () => () => {};

// ---------- componente ----------

/** Só desenha no browser: a folha depende da data de hoje e dos valores guardados localmente. */
export function ProfitSheet() {
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  if (!mounted) return <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />;
  return <ProfitSheetInner />;
}

type Filter = "all" | "incomplete" | "loss";

function ProfitSheetInner() {
  const today = todayInLisbon();
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [days, setDays] = useState<DayInput[]>(() => loadMonth(ym.y, ym.m, today));
  const [fees, setFeesState] = useState<Fees>(loadFees);
  const [filter, setFilter] = useState<Filter>("all");
  const [collapsed, setCollapsed] = useState<Set<GroupKey>>(new Set());
  const [showFees, setShowFees] = useState(false);
  const [openNote, setOpenNote] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const totalDays = daysInMonth(ym.y, ym.m);

  function goMonth(delta: number) {
    const d = new Date(Date.UTC(ym.y, ym.m + delta, 1));
    const next = { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    setYm(next);
    setDays(loadMonth(next.y, next.m, today));
    setFilter("all");
  }

  function updateDay(date: string, patch: Partial<DayInput>) {
    setDays((prev) => {
      const next = prev.map((d) => (d.date === date ? { ...d, ...patch } : d));
      localStorage.setItem(storageKey(ym.y, ym.m), JSON.stringify(next));
      return next;
    });
  }

  function setFees(patch: Partial<Fees>) {
    setFeesState((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem("fv.profitSheet.fees", JSON.stringify(next));
      return next;
    });
  }

  const tracked = days.filter(isTracked);
  const totals = useMemo(() => sumDays(days, fees), [days, fees]);
  const previous = useMemo(() => {
    const d = new Date(Date.UTC(ym.y, ym.m - 1, 1));
    const prev = mockMonth(d.getUTCFullYear(), d.getUTCMonth(), today).slice(0, Math.max(totals.days, 1));
    return sumDays(prev, fees);
  }, [ym, today, totals.days, fees]);

  const breakEven = useMemo(() => {
    if (!totals.adSpend) return null;
    const agency = (totals.metaAgency + totals.googleAgency) / totals.adSpend;
    const cashback = totals.cashback / totals.adSpend;
    const spend = (totals.netRev - totals.cogs - totals.txFee) / (1 + agency - cashback);
    return spend > 0 ? totals.netRev / spend : null;
  }, [totals]);

  const incomplete = tracked.filter((d) => isIncomplete(d, fees));
  const inLoss = tracked.filter((d) => computeDay(d, fees).profit < 0);
  const soldWithoutCost = tracked.filter((d) => d.cogs === null).reduce((s, d) => s + computeDay(d, fees).netRev, 0);

  const visibleDays = filter === "incomplete" ? incomplete : filter === "loss" ? inLoss : days;
  const visibleColumns = columns.filter((c) => !collapsed.has(c.group));

  // linhas: dias + subtotal semanal após cada domingo e no fim do mês (só na vista "todos")
  const rows: ({ kind: "day"; day: DayInput } | { kind: "week"; label: string; totals: Totals })[] = [];
  let weekBucket: DayInput[] = [];
  visibleDays.forEach((day, i) => {
    rows.push({ kind: "day", day });
    if (filter !== "all") return;
    weekBucket.push(day);
    const last = i === visibleDays.length - 1;
    if ((weekday(day.date) === 0 || last) && weekBucket.some(isTracked)) {
      rows.push({ kind: "week", label: `Sem. até ${dayLabel.format(asDate(day.date))}`, totals: sumDays(weekBucket, fees) });
    }
    if (weekday(day.date) === 0) weekBucket = [];
  });

  function toggleGroup(g: GroupKey) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  function scrollTable(dir: 1 | -1) {
    scroller.current?.scrollBy({ left: dir * 480, behavior: "smooth" });
  }

  function goToday() {
    const isCurrent = today.startsWith(`${ym.y}-${String(ym.m + 1).padStart(2, "0")}`);
    if (!isCurrent) {
      const y = Number(today.slice(0, 4));
      const m = Number(today.slice(5, 7)) - 1;
      setYm({ y, m });
      setDays(loadMonth(y, m, today));
    }
    setFilter("all");
    requestAnimationFrame(() =>
      document.getElementById(`day-${today}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Profit Sheet</h1>
        <div className="flex items-center rounded-lg border border-border bg-card">
          <button aria-label="Mês anterior" onClick={() => goMonth(-1)} className="p-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" />
          </button>
          <span className="flex items-center gap-2 border-x border-border px-4 py-1.5 text-sm font-medium first-letter:uppercase">
            <CalendarDays className="size-4" />
            {monthLabel.format(new Date(Date.UTC(ym.y, ym.m, 1))).replace(/^./, (c) => c.toUpperCase())}
          </span>
          <button aria-label="Mês seguinte" onClick={() => goMonth(1)} className="p-2 text-muted-foreground hover:text-foreground">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <ProfitSummary current={totals} previous={previous} daysInMonth={totalDays} />

      {/* Barra de controlo */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold">Números diários</h2>
              <p className="text-sm text-muted-foreground">Preenche as células com €. O resto é calculado.</p>
            </div>
            {incomplete.length > 0 && (
              <button onClick={() => setFilter("incomplete")} className="rounded-md bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-400">
                ● {incomplete.length} em falta
              </button>
            )}
            {soldWithoutCost > 0 && (
              <span className="rounded-md bg-amber-500/15 px-3 py-1.5 text-sm font-medium text-amber-400">
                ● {fmtMoney(soldWithoutCost)} vendidos sem custo
              </span>
            )}
          </div>
          <div className="flex rounded-lg border border-border bg-card p-0.5 text-sm">
            {([
              ["all", "Todos os dias"],
              ["incomplete", `Incompletos (${incomplete.length})`],
              ["loss", `Em prejuízo (${inLoss.length})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn("rounded-md px-3 py-1.5 text-muted-foreground", filter === key && "bg-muted font-medium text-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-muted-foreground">Agência Meta: <b className="text-foreground">{fees.metaAgencyPct}%</b></span>
            <span className="text-muted-foreground">Agência Google: <b className="text-foreground">{fees.googleAgencyPct}%</b></span>
            <span className="text-muted-foreground">Cashback cartão: <b className="text-emerald-400">+{fees.cashbackPct}%</b></span>
            <span className="flex items-center gap-2 text-muted-foreground">
              Canais:
              <Toggle label="Meta" checked={fees.metaEnabled} onChange={(v) => setFees({ metaEnabled: v })} />
              <Toggle label="Google" checked={fees.googleEnabled} onChange={(v) => setFees({ googleEnabled: v })} />
            </span>
            <button onClick={() => setShowFees((v) => !v)} className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium hover:bg-muted">
              Alterar taxas
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={goToday} className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium hover:bg-muted">Hoje</button>
            <button aria-label="Ver colunas à esquerda" onClick={() => scrollTable(-1)} className="rounded-lg p-2 text-primary hover:bg-muted"><ArrowLeft className="size-4" /></button>
            <button aria-label="Ver colunas à direita" onClick={() => scrollTable(1)} className="rounded-lg p-2 text-primary hover:bg-muted"><ArrowRight className="size-4" /></button>
          </div>
        </div>

        {showFees && (
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4 text-sm">
            <FeeInput label="Agência Meta (%)" value={fees.metaAgencyPct} onChange={(v) => setFees({ metaAgencyPct: v })} />
            <FeeInput label="Agência Google (%)" value={fees.googleAgencyPct} onChange={(v) => setFees({ googleAgencyPct: v })} />
            <FeeInput label="Cashback cartão (%)" value={fees.cashbackPct} onChange={(v) => setFees({ cashbackPct: v })} />
            <button onClick={() => setShowFees(false)} className="rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground">Feito</button>
          </div>
        )}
      </section>

      {/* Tabela */}
      <div ref={scroller} className="max-h-[70vh] overflow-auto rounded-xl border border-border bg-card">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 bg-card" />
              {groups.map((g) => {
                const span = columns.filter((c) => c.group === g.key).length;
                const isCollapsed = collapsed.has(g.key);
                return (
                  <th key={g.key} colSpan={isCollapsed ? 1 : span} className={cn("relative px-4 py-2.5 text-left font-medium", g.head)}>
                    <button onClick={() => toggleGroup(g.key)} className="flex items-center gap-1.5" title={isCollapsed ? "Mostrar colunas" : "Esconder colunas"}>
                      {g.label}
                      {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    </button>
                    <span className={cn("absolute inset-x-0 bottom-0 h-0.5", g.bar)} />
                  </th>
                );
              })}
              <th className="bg-card px-4 py-2.5 text-left font-medium">Nota</th>
            </tr>
            <tr>
              <th className="sticky left-0 z-30 border-b border-border bg-card px-4 py-2.5 text-left font-medium text-muted-foreground">Dia</th>
              {groups.map((g) =>
                collapsed.has(g.key) ? (
                  <th key={g.key} className={cn("border-b border-border", g.head)} />
                ) : (
                  visibleColumns
                    .filter((c) => c.group === g.key)
                    .map((c) => (
                      <th key={c.key} title={c.hint} className={cn("whitespace-nowrap border-b border-border px-4 py-2.5 text-right font-medium", g.head, c.hint && "underline decoration-dotted underline-offset-4")}>
                        {c.label}
                      </th>
                    ))
                ),
              )}
              <th className="border-b border-border bg-card" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + groups.length + 2} className="px-4 py-10 text-center text-muted-foreground">
                  Nada a mostrar neste filtro.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              if (row.kind === "week") {
                return (
                  <tr key={`wk-${row.label}`} className="bg-background font-semibold">
                    <td className="sticky left-0 z-10 whitespace-nowrap border-b border-border bg-background px-4 py-2.5">{row.label}</td>
                    {groups.map((g) =>
                      collapsed.has(g.key) ? (
                        <td key={g.key} className="border-b border-border" />
                      ) : (
                        visibleColumns
                          .filter((c) => c.group === g.key)
                          .map((c) => (
                            <td key={c.key} className={cn("whitespace-nowrap border-b border-border px-4 py-2.5 text-right tabular-nums", c.tone && toneClass(c.tone(row.totals, breakEven)))}>
                              {c.total?.(row.totals) ?? ""}
                            </td>
                          ))
                      ),
                    )}
                    <td className="border-b border-border" />
                  </tr>
                );
              }

              const d = row.day;
              const tracked = isTracked(d);
              const r = computeDay(d, fees);
              const isToday = d.date === today;
              return (
                <Fragment key={d.date}>
                  <tr id={`day-${d.date}`} className={cn("group hover:bg-muted/40", isToday && "bg-primary/5")}>
                    <td className={cn("sticky left-0 z-10 whitespace-nowrap border-b border-border bg-card px-4 py-1.5 group-hover:bg-muted", isToday && "text-primary")}>
                      <span className="font-medium">{dayLabel.format(asDate(d.date))}</span>{" "}
                      <span className="text-muted-foreground">{weekdayLabel.format(asDate(d.date))}</span>
                    </td>
                    {groups.map((g) =>
                      collapsed.has(g.key) ? (
                        <td key={g.key} className="border-b border-border" />
                      ) : (
                        visibleColumns
                          .filter((c) => c.group === g.key)
                          .map((c) => (
                            <td
                              key={c.key}
                              className={cn(
                                "whitespace-nowrap border-b border-border px-3 py-1.5 text-right tabular-nums",
                                tracked && c.tone && toneClass(c.tone(r, breakEven)),
                              )}
                            >
                              {c.input ? (
                                <EditableCell
                                  label={`${c.label} ${d.date}`}
                                  value={d[c.input.field]}
                                  source={c.input.source}
                                  disabled={(c.input.field === "adsMeta" && !fees.metaEnabled) || (c.input.field === "adsGoogle" && !fees.googleEnabled)}
                                  onChange={(v) => updateDay(d.date, { [c.input!.field]: v })}
                                />
                              ) : tracked ? (
                                c.cell?.(d, r)
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                          ))
                      ),
                    )}
                    <td className="border-b border-border px-4 py-1.5 text-center">
                      <button
                        aria-label="Nota"
                        onClick={() => setOpenNote(openNote === d.date ? null : d.date)}
                        className={cn("rounded p-1 hover:bg-muted", d.note ? "text-primary" : "text-muted-foreground")}
                      >
                        <StickyNote className="size-4" />
                      </button>
                    </td>
                  </tr>
                  {openNote === d.date && (
                    <tr>
                      <td colSpan={visibleColumns.length + groups.length + 2} className="border-b border-border bg-background px-4 py-3">
                        <textarea
                          autoFocus
                          defaultValue={d.note}
                          placeholder="Nota para este dia…"
                          onBlur={(e) => updateDay(d.date, { note: e.target.value })}
                          className="sticky left-4 h-20 w-full max-w-xl rounded-lg border border-border bg-card p-2 text-sm outline-none focus:border-primary"
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filter === "all" && tracked.length > 0 && (
              <tr className="sticky bottom-0 bg-muted font-semibold">
                <td className="sticky left-0 z-10 bg-muted px-4 py-3">Total do mês</td>
                {groups.map((g) =>
                  collapsed.has(g.key) ? (
                    <td key={g.key} />
                  ) : (
                    visibleColumns
                      .filter((c) => c.group === g.key)
                      .map((c) => (
                        <td key={c.key} className={cn("whitespace-nowrap px-4 py-3 text-right tabular-nums", c.tone && toneClass(c.tone(totals, breakEven)))}>
                          {c.total?.(totals) ?? ""}
                        </td>
                      ))
                  ),
                )}
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Dados de exemplo. As alterações ficam guardadas só neste browser até a base de dados estar ligada.
      </p>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-1.5 text-foreground"
    >
      {label}
      <span className={cn("relative h-5 w-9 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-all", checked ? "left-4.5" : "left-0.5")} />
      </span>
    </button>
  );
}

function FeeInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-32 rounded-lg border border-border bg-background px-3 py-2 tabular-nums outline-none focus:border-primary"
      />
    </label>
  );
}
