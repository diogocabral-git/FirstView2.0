"use client";

import { useMemo, useRef, useState } from "react";
import { Check, ClipboardCopy, Download, Info } from "lucide-react";
import { toBlob, toPng } from "html-to-image";
import { cn } from "@/lib/utils";
import { useMounted, useStore, readStore } from "@/lib/store";
import { addDays, asDate, dayShort, MONTHS_LONG, todayInLisbon, WEEKDAYS_LONG, weekdayShort } from "@/lib/dates";
import { emptyReport, initialReports, REPORTS_KEY, type DailyReport } from "@/lib/daily-reports";
import { computeDay, defaultFeeSettings, FEES_KEY, isTracked, blankMonth, monthStorageKey, type DayInput, type FeeSettings } from "@/lib/profit-sheet";
import { fmtMoney } from "@/components/profit-sheet/format";

type NumKey = "atc" | "reachedCheckout" | "cvr" | "cpc" | "ctr" | "cpm";
type TextKey = "productsTested" | "collectionsTested" | "collectionsToTest" | "nextCollection" | "bestseller" | "observations" | "difficulties";

const funnel: { key: NumKey; label: string; unit: string; hint: string }[] = [
  { key: "atc", label: "ATC", unit: "%", hint: "Add to cart rate: % de sessões que adicionaram ao carrinho" },
  { key: "reachedCheckout", label: "Reached checkout", unit: "%", hint: "% de sessões que chegaram ao checkout" },
  { key: "cvr", label: "CVR", unit: "%", hint: "Taxa de conversão: % de sessões que compraram" },
];
const ads: { key: NumKey; label: string; unit: string; hint: string }[] = [
  { key: "cpc", label: "CPC", unit: "€", hint: "Custo médio por clique" },
  { key: "ctr", label: "CTR", unit: "%", hint: "Taxa de cliques média" },
  { key: "cpm", label: "CPM", unit: "€", hint: "Custo médio por mil impressões" },
];
const texts: { key: TextKey; label: string; placeholder: string; rows?: number }[] = [
  { key: "productsTested", label: "Produtos testados", placeholder: "Links, um por linha" },
  { key: "collectionsTested", label: "Coleções já testadas", placeholder: "Links, um por linha" },
  { key: "collectionsToTest", label: "Coleções a testar", placeholder: "Links, um por linha" },
  { key: "nextCollection", label: "Próxima coleção", placeholder: "Link" },
  { key: "bestseller", label: "Bestseller", placeholder: "Link do produto" },
  { key: "observations", label: "Observações", placeholder: "Ex.: o ATC subiu bastante", rows: 3 },
  { key: "difficulties", label: "Principais dificuldades", placeholder: "Ex.: problemas de spend", rows: 3 },
];

const num = (v: number | null, unit: string) =>
  v === null ? "—" : `${v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit === "%" ? "%" : " €"}`;

const reportsFallback = () => initialReports();

function profitSheetDay(date: string): DayInput | undefined {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7)) - 1;
  return readStore(monthStorageKey(y, m), () => blankMonth(y, m)).find((d) => d.date === date);
}

export function DailyReports() {
  const mounted = useMounted();
  if (!mounted) return <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />;
  return <DailyReportsInner />;
}

function DailyReportsInner() {
  const [today] = useState(todayInLisbon);
  const [reports, setReports] = useStore<Record<string, DailyReport>>(REPORTS_KEY, reportsFallback);
  const [fees] = useStore<FeeSettings>(FEES_KEY, () => defaultFeeSettings);
  const [date, setDate] = useState(today);
  const [step, setStep] = useState<1 | 2>(1);
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const psDay = profitSheetDay(date);
  const saved = reports[date];
  // pré-preenche o funil com os números da Profit Sheet, se existirem
  const initial = useMemo<DailyReport>(
    () => saved ?? { ...emptyReport(date), atc: psDay?.atc ?? null, reachedCheckout: psDay?.checkout ?? null, cvr: psDay?.cvr ?? null },
    [saved, date, psDay],
  );
  const [draft, setDraft] = useState<DailyReport>(initial);
  const [draftFor, setDraftFor] = useState(date);
  if (draftFor !== date) {
    setDraftFor(date);
    setDraft(initial);
    setStep(1);
  }

  const yesterday = reports[addDays(date, -1)];
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const step1Done = funnel.every((f) => draft[f.key] !== null) && ads.every((f) => draft[f.key] !== null);
  const result = psDay && isTracked(psDay) ? computeDay(psDay, fees) : null;

  function set<K extends keyof DailyReport>(key: K, value: DailyReport[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function submit() {
    setReports((prev) => ({ ...prev, [date]: { ...draft, submittedAt: new Date().toISOString() } }));
  }

  async function copyImage() {
    if (!cardRef.current) return;
    try {
      const blob = await toBlob(cardRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      if (!blob) throw new Error("sem imagem");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    setTimeout(() => setCopied(null), 3000);
  }

  async function downloadImage() {
    if (!cardRef.current) return;
    const url = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-report-${date}.png`;
    a.click();
  }

  const d = asDate(date);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Daily Reports</h1>
        <p className="text-muted-foreground">Um report por loja, no fim de cada dia. Os números de venda vêm da Profit Sheet.</p>
      </div>

      <div className="flex gap-2">
        {days.map((day) => {
          const done = !!reports[day]?.submittedAt;
          return (
            <button
              key={day}
              onClick={() => setDate(day)}
              className={cn(
                "flex w-14 flex-col items-center rounded-lg border py-2 text-sm",
                day === date ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
              )}
            >
              <span className="text-xs opacity-80">{weekdayShort(day)}</span>
              <span className="font-semibold">{Number(day.slice(8, 10))}</span>
              <span className={cn("mt-1 size-1.5 rounded-full", done ? "bg-emerald-400" : day === today ? "bg-transparent" : "bg-red-400")} />
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Report de {date === today ? "hoje" : `${WEEKDAYS_LONG[d.getUTCDay()].toLowerCase()}, ${dayShort(date)}`}
            {saved?.submittedAt && <span className="ml-2 text-emerald-400">· submetido</span>}
          </p>

          <div className="grid grid-cols-2 rounded-lg border border-border bg-card p-0.5 text-sm">
            <button onClick={() => setStep(1)} className={cn("rounded-md py-2", step === 1 ? "bg-muted font-medium" : "text-muted-foreground")}>
              1 · Métricas {step1Done && <Check className="inline size-3.5 text-emerald-400" />}
            </button>
            <button onClick={() => setStep(2)} className={cn("rounded-md py-2", step === 2 ? "bg-muted font-medium" : "text-muted-foreground")}>
              2 · O teu dia
            </button>
          </div>

          {step === 1 ? (
            <>
              <MetricGroup title="Funil" subtitle="Os três são obrigatórios." badge="Shopify" fields={funnel} draft={draft} yesterday={yesterday} onChange={set} />
              <MetricGroup title="Anúncios" subtitle="Os três são obrigatórios." badge="Gestor de anúncios" fields={ads} draft={draft} yesterday={yesterday} onChange={set} />
              <div className="flex justify-end">
                <button onClick={() => setStep(2)} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted">Seguinte</button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4 rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold">Testes</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {texts.slice(0, 5).map((t) => (
                    <TextField key={t.key} label={t.label} placeholder={t.placeholder} rows={t.rows} value={draft[t.key]} onChange={(v) => set(t.key, v)} />
                  ))}
                </div>
                <h3 className="pt-2 font-semibold">Notas</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {texts.slice(5).map((t) => (
                    <TextField key={t.key} label={t.label} placeholder={t.placeholder} rows={t.rows} value={draft[t.key]} onChange={(v) => set(t.key, v)} />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button onClick={() => setStep(1)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Anterior</button>
                <button
                  disabled={!step1Done}
                  title={step1Done ? undefined : "Preenche primeiro as métricas"}
                  onClick={submit}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {saved?.submittedAt ? "Atualizar report" : "Submeter report"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Pré-visualização: é isto que se copia como imagem */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Imagem do report</p>
          <div ref={cardRef} className="space-y-4 rounded-xl bg-white p-5 text-sm text-zinc-900">
            <div>
              <p className="text-xs font-semibold tracking-wide text-indigo-600">FIRSTVIEW · DAILY REPORT</p>
              <p className="mt-1 text-lg font-bold">{WEEKDAYS_LONG[d.getUTCDay()]}, {d.getUTCDate()} de {MONTHS_LONG[d.getUTCMonth()].toLowerCase()} de {d.getUTCFullYear()}</p>
            </div>
            <PreviewSection title="Resultado do dia">
              <PreviewStat label="Receita" value={result ? fmtMoney(result.netRev) : "—"} />
              <PreviewStat label="Lucro" value={result ? fmtMoney(result.profit) : "—"} tone={result ? (result.profit >= 0 ? "pos" : "neg") : undefined} />
            </PreviewSection>
            <PreviewSection title="Funil">
              {funnel.map((f) => <PreviewStat key={f.key} label={f.label} value={num(draft[f.key], f.unit)} />)}
            </PreviewSection>
            <PreviewSection title="Anúncios">
              {ads.map((f) => <PreviewStat key={f.key} label={f.label} value={num(draft[f.key], f.unit)} />)}
            </PreviewSection>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-zinc-500">Testes</p>
              {texts.slice(0, 5).map((t) => (
                <div key={t.key}>
                  <p className="text-xs text-zinc-500">{t.label}</p>
                  <p className="whitespace-pre-wrap break-all">{draft[t.key] || "—"}</p>
                </div>
              ))}
            </div>
            {texts.slice(5).map((t) => (
              <div key={t.key}>
                <p className="text-xs font-semibold uppercase text-zinc-500">{t.label}</p>
                <p className="whitespace-pre-wrap">{draft[t.key] || "—"}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={copyImage} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              <ClipboardCopy className="size-4" />
              {copied === "ok" ? "Copiada! Cola no WhatsApp (Ctrl+V)" : copied === "fail" ? "O browser não deixou copiar" : "Copiar imagem"}
            </button>
            <button aria-label="Descarregar imagem" onClick={downloadImage} className="rounded-lg border border-border bg-card px-3 py-2 hover:bg-muted">
              <Download className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricGroup(props: {
  title: string;
  subtitle: string;
  badge: string;
  fields: { key: NumKey; label: string; unit: string; hint: string }[];
  draft: DailyReport;
  yesterday?: DailyReport;
  onChange: (key: NumKey, v: number | null) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{props.title}</h3>
          <p className="text-sm text-muted-foreground">{props.subtitle}</p>
        </div>
        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{props.badge}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {props.fields.map((f) => {
          const value = props.draft[f.key];
          const prev = props.yesterday?.[f.key] ?? null;
          const delta = value !== null && prev !== null ? value - prev : null;
          return (
            <label key={f.key} className="flex flex-col gap-1 text-sm">
              <span className="flex items-center gap-1 font-medium">
                {f.label} <span title={f.hint}><Info className="size-3.5 text-muted-foreground" /></span>
              </span>
              <div className="flex items-center rounded-lg border border-border bg-background focus-within:border-primary">
                <input
                  inputMode="decimal"
                  value={value === null ? "" : String(value).replace(".", ",")}
                  placeholder="—"
                  onChange={(e) => {
                    const raw = e.target.value.replace(",", ".");
                    props.onChange(f.key, raw === "" ? null : Number.isFinite(Number(raw)) ? Number(raw) : value);
                  }}
                  className="w-full bg-transparent px-3 py-2 text-right tabular-nums outline-none"
                />
                <span className="pr-3 text-muted-foreground">{f.unit}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                ontem: {prev === null ? "—" : num(prev, f.unit)}
                {delta !== null && delta !== 0 && (
                  <span className={cn("ml-1", delta > 0 === (f.key !== "cpc" && f.key !== "cpm") ? "text-emerald-400" : "text-red-400")}>
                    {delta > 0 ? "+" : ""}{delta.toFixed(2).replace(".", ",")}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function TextField(props: { label: string; placeholder: string; rows?: number; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{props.label}</span>
      <textarea
        rows={props.rows ?? 2}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
      />
    </label>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase text-zinc-500">{title}</p>
      <div className="grid grid-cols-3 gap-2">{children}</div>
    </div>
  );
}

function PreviewStat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={cn("font-semibold tabular-nums", tone === "pos" && "text-emerald-600", tone === "neg" && "text-red-600")}>{value}</p>
    </div>
  );
}
