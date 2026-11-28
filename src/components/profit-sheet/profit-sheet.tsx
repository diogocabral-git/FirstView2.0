"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Share2, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeDay, daysInMonth, defaultFeeSettings, feesFor, FEES_KEY, isIncomplete, isTracked, blankMonth, monthStorageKey, sumDays, averageDays, weekday,
  type Averages, type DayInput, type DayResult, type FeeSettings, type Totals,
} from "@/lib/profit-sheet";
import { useMounted, useStore, writeStore } from "@/lib/store";
import { todayInLisbon } from "@/lib/dates";
import { FeesDialog } from "./fees-dialog";
import { decodeShare, encodeShare, type SharePayload } from "./share";
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
  avg?: (a: Averages) => string;
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
  { key: "txFee", group: "fees", label: "Taxas transação", hint: "% do fornecedor de pagamentos sobre a receita bruta (pode ser corrigida à mão)", input: { field: "txFee", source: "shopify" }, total: (t) => fmtMoney(t.txFee) },

  { key: "totalCost", group: "result", label: "Custo total", hint: "COGS + anúncios + agências + taxas − cashback", cell: (_, r) => fmtMoney(r.totalCost), total: (t) => fmtMoney(t.totalCost) },
  { key: "profit", group: "result", label: "Lucro", cell: (_, r) => fmtMoney(r.profit), total: (t) => fmtMoney(t.profit), tone: profitTone },
  { key: "margin", group: "result", label: "Margem", cell: (_, r) => fmtPct(r.margin), total: (t) => fmtPct(t.margin), tone: profitTone },

  { key: "atc", group: "metrics", label: "ATC", hint: "Add to cart rate", cell: (d) => fmtPct(d.atc), avg: (a) => fmtPct(a.atc) },
  { key: "checkout", group: "metrics", label: "Checkout", hint: "Checkout rate", cell: (d) => fmtPct(d.checkout), avg: (a) => fmtPct(a.checkout) },
  { key: "cvr", group: "metrics", label: "CVR", hint: "Taxa de conversão", cell: (d) => fmtPct(d.cvr), avg: (a) => fmtPct(a.cvr) },
];

const toneClass = (t: Tone) => (t === "pos" ? "bg-emerald-500/10 text-emerald-400" : t === "neg" ? "bg-red-500/10 text-red-400" : "");

// ---------- utilitários ----------

const monthLabel = new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric", timeZone: "UTC" });
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const dayLabel = { format: (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}` };
const weekdayLabel = { format: (d: Date) => WEEKDAYS[d.getUTCDay()] };
const asDate = (iso: string) => new Date(`${iso}T12:00:00Z`);

const feesFallback = () => defaultFeeSettings;

/** Valores a zero aparecem a cinzento, para os números reais sobressaírem. */
const isZeroText = (s: string) => /^-?0(,0+)?\s?[€%×]?$/.test(s.replace(/\u00a0/g, " ").trim());
function Val({ text }: { text: string | undefined }) {
  if (!text) return null;
  return isZeroText(text) ? <span className="font-normal text-muted-foreground">{text}</span> : <>{text}</>;
}
const pctNum = (v: number) => v.toLocaleString("pt-PT", { maximumFractionDigits: 2 });

// ---------- importação por link (#importar=…) ----------

type ImportPayload = { y: number; m: number; days: (Partial<DayInput> & { date: string })[] };
let lastImport: { y: number; m: number } | null = null;

/** Lê um link "#importar=…", grava o mês no browser e limpa o URL. Devolve o mês importado. */
function consumeImport(): { y: number; m: number } | null {
  if (typeof window === "undefined") return lastImport;
  const h = window.location.hash;
  if (!h.startsWith("#importar=")) return lastImport;
  const p = decodeShare(h.slice("#importar=".length)) as unknown as ImportPayload | null;
  history.replaceState(null, "", window.location.pathname + window.location.search);
  if (!p || typeof p.y !== "number" || typeof p.m !== "number" || !Array.isArray(p.days)) return lastImport;
  const byDate = new Map(p.days.map((d) => [d.date, d]));
  writeStore(monthStorageKey(p.y, p.m), blankMonth(p.y, p.m).map((d) => ({ ...d, ...byDate.get(d.date) })));
  lastImport = { y: p.y, m: p.m };
  return lastImport;
}

// ---------- componente ----------

/** Só desenha no browser: a folha depende da data de hoje e dos valores guardados localmente. */
export function ProfitSheet({ shared }: { shared?: SharePayload }) {
  const mounted = useMounted();
  if (!mounted) return <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />;
  return <ProfitSheetInner shared={shared} />;
}

type Filter = "all" | "incomplete" | "loss";

function ProfitSheetInner({ shared }: { shared?: SharePayload }) {
  const readOnly = !!shared;
  const [today] = useState(todayInLisbon);
  const [ym, setYm] = useState(() =>
    shared ? { y: shared.y, m: shared.m } : (consumeImport() ?? { y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }),
  );
  const monthFallback = useMemo(() => () => blankMonth(ym.y, ym.m), [ym]);
  const [storedDays, setDays] = useStore<DayInput[]>(monthStorageKey(ym.y, ym.m), monthFallback);
  const [storedFees, setFeesState] = useStore<FeeSettings>(FEES_KEY, feesFallback);
  const days = shared ? shared.days : storedDays;
  const fees = shared ? shared.fees : storedFees;
  const [shareUrl, setShareUrl] = useState<string | null>(null);
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
    setFilter("all");
  }

  function updateDay(date: string, patch: Partial<DayInput>) {
    setDays((prev) => prev.map((d) => (d.date === date ? { ...d, ...patch } : d)));
  }

  function setFees(patch: Partial<FeeSettings>) {
    setFeesState((prev) => ({ ...prev, ...patch }));
  }

  function share() {
    const url = `${location.origin}/partilha/profit-sheet#${encodeShare({ y: ym.y, m: ym.m, days, fees })}`;
    setShareUrl(url);
    navigator.clipboard?.writeText(url).catch(() => {});
  }

  const tracked = days.filter(isTracked);
  const currentFees = feesFor(fees, days.findLast((d) => isTracked(d))?.date ?? today);
  const totals = useMemo(() => sumDays(days, fees), [days, fees]);
  const previous = useMemo(() => {
    const d = new Date(Date.UTC(ym.y, ym.m - 1, 1));
    const key = monthStorageKey(d.getUTCFullYear(), d.getUTCMonth());
    const raw = localStorage.getItem(key);
    const all: DayInput[] = raw ? JSON.parse(raw) : blankMonth(d.getUTCFullYear(), d.getUTCMonth());
    return sumDays(all.slice(0, Math.max(totals.days, 1)), fees);
  }, [ym, totals.days, fees]);

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

  // linhas: dias + linha da semana (seg–dom: somas e médias) após cada domingo e no fim do mês (só na vista "todos")
  const rows: ({ kind: "day"; day: DayInput } | { kind: "week"; label: string; avg: Averages })[] = [];
  let weekBucket: DayInput[] = [];
  visibleDays.forEach((day, i) => {
    rows.push({ kind: "day", day });
    if (filter !== "all") return;
    weekBucket.push(day);
    const sunday = weekday(day.date) === 0;
    if ((sunday || i === visibleDays.length - 1) && weekBucket[0].date <= today) {
      const a = asDate(weekBucket[0].date);
      const b = asDate(day.date);
      const range =
        weekBucket.length === 1 ? dayLabel.format(b) : a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}–${dayLabel.format(b)}` : `${dayLabel.format(a)}–${dayLabel.format(b)}`;
      rows.push({ kind: "week", label: `Semana ${range}`, avg: averageDays(weekBucket, fees) });
    }
    if (sunday) weekBucket = [];
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
        <h1 className="text-2xl font-semibold">Profit Sheet{readOnly && <span className="ml-2 text-base font-normal text-muted-foreground">· só leitura</span>}</h1>
        <div className={cn("flex items-center rounded-lg border border-border bg-card", readOnly && "pointer-events-none [&>button]:invisible")}>
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
            <span className="text-muted-foreground">Agência Meta: <b className="text-foreground">{pctNum(currentFees.metaAgencyPct)}%</b></span>
            <span className="text-muted-foreground">Agência Google: <b className="text-foreground">{pctNum(currentFees.googleAgencyPct)}%</b></span>
            <span className="text-muted-foreground">Taxas de transação: <b className="text-foreground">{pctNum(currentFees.txPct)}%</b></span>
            <span className="text-muted-foreground">
              Cashback cartão: <b className="text-emerald-400">+{pctNum(currentFees.cashbackPct)}%</b>{" "}
              {currentFees.cashbackOn === "both" ? "Meta + Google" : currentFees.cashbackOn === "meta" ? "só Meta" : "só Google"}
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              Canais:
              <Toggle label="Meta" checked={fees.metaEnabled} disabled={readOnly} onChange={(v) => setFees({ metaEnabled: v })} />
              <Toggle label="Google" checked={fees.googleEnabled} disabled={readOnly} onChange={(v) => setFees({ googleEnabled: v })} />
            </span>
            {!readOnly && (
              <button onClick={() => setShowFees((v) => !v)} className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium hover:bg-muted">
                Alterar taxas
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!readOnly && (
              <button onClick={share} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 font-medium hover:bg-muted">
                <Share2 className="size-4" /> Partilhar
              </button>
            )}
            <button onClick={goToday} className="rounded-lg border border-border bg-card px-3 py-1.5 font-medium hover:bg-muted">Hoje</button>
            <button aria-label="Ver colunas à esquerda" onClick={() => scrollTable(-1)} className="rounded-lg p-2 text-primary hover:bg-muted"><ArrowLeft className="size-4" /></button>
            <button aria-label="Ver colunas à direita" onClick={() => scrollTable(1)} className="rounded-lg p-2 text-primary hover:bg-muted"><ArrowRight className="size-4" /></button>
          </div>
        </div>

        {showFees && (
          <FeesDialog
            settings={fees}
            currentFrom={currentFees.from}
            current={currentFees}
            today={today}
            onApply={(next) => {
              setFeesState(next);
              setShowFees(false);
            }}
            onCancel={() => setShowFees(false)}
          />
        )}

        {shareUrl && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm">
            <span className="text-muted-foreground">Link copiado. Quem o abrir vê esta Profit Sheet só para leitura:</span>
            <input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2" />
            <button onClick={() => setShareUrl(null)} className="text-muted-foreground hover:text-foreground">Fechar</button>
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
                  <tr key={`wk-${row.label}`} className="bg-primary/10 font-semibold">
                    <td className="sticky left-0 z-10 whitespace-nowrap border-b border-border bg-[#1a1f33] px-4 py-2.5">
                      {row.label}
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        {row.avg.days ? `(${row.avg.days} ${row.avg.days === 1 ? "dia" : "dias"})` : "(sem dados)"}
                      </span>
                    </td>
                    {groups.map((g) =>
                      collapsed.has(g.key) ? (
                        <td key={g.key} className="border-b border-border" />
                      ) : (
                        visibleColumns
                          .filter((c) => c.group === g.key)
                          .map((c) => (
                            <td key={c.key} className={cn("whitespace-nowrap border-b border-border px-4 py-2.5 text-right tabular-nums", row.avg.days > 0 && c.tone && toneClass(c.tone(row.avg, breakEven)))}>
                              {row.avg.days ? <Val text={c.avg?.(row.avg) ?? c.total?.(row.avg)} /> : "—"}
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
                              {c.input && readOnly ? (
                                tracked ? <Val text={fmtMoney(c.input.field === "txFee" ? r.txFee : d[c.input.field])} /> : <span className="text-muted-foreground/40">—</span>
                              ) : c.input ? (
                                <EditableCell
                                  label={`${c.label} ${d.date}`}
                                  value={d[c.input.field]}
                                  fallback={c.input.field === "txFee" && tracked ? r.txFee : undefined}
                                  flagMissing={tracked && c.input.field !== "gross"}
                                  source={c.input.source}
                                  disabled={(c.input.field === "adsMeta" && !fees.metaEnabled) || (c.input.field === "adsGoogle" && !fees.googleEnabled)}
                                  onChange={(v) => updateDay(d.date, { [c.input!.field]: v })}
                                />
                              ) : tracked ? (
                                <Val text={c.cell?.(d, r)} />
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
                        title={d.note || undefined}
                        disabled={readOnly && !d.note}
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
                          readOnly={readOnly}
                          defaultValue={d.note}
                          placeholder="Nota para este dia…"
                          onBlur={(e) => !readOnly && updateDay(d.date, { note: e.target.value })}
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
                          <Val text={c.total?.(totals)} />
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
      <p className={cn("text-xs text-muted-foreground", readOnly && "hidden")}>
        Dados de exemplo. As alterações ficam guardadas só neste browser até a base de dados estar ligada.
      </p>
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
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
