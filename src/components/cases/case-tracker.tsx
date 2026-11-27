"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMounted, useStore, useStoreTick } from "@/lib/store";
import { addDays, dayShort, MONTHS_LONG, shiftMonth, todayInLisbon } from "@/lib/dates";
import { getDays, getFeeSettings } from "@/lib/data";
import { daysInMonth, isoDate, sumDays } from "@/lib/profit-sheet";
import { caseConfigs, type CaseConfig, type CaseRecord, type Tone } from "@/lib/cases";
import { fmtMoney, fmtPct, parseNumber } from "@/components/profit-sheet/format";

const toneClass: Record<Tone, string> = {
  neutral: "bg-sky-500/15 text-sky-300",
  warning: "bg-amber-500/15 text-amber-400",
  good: "bg-emerald-500/15 text-emerald-400",
  bad: "bg-red-500/15 text-red-400",
};
const empty = (): CaseRecord[] => [];
const uid = () => Math.random().toString(36).slice(2, 10);

export function CaseTracker({ kind }: { kind: CaseConfig["kind"] }) {
  const mounted = useMounted();
  if (!mounted) return <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />;
  return <Inner config={caseConfigs[kind]} />;
}

function Inner({ config }: { config: CaseConfig }) {
  const [today] = useState(todayInLisbon);
  const tick = useStoreTick();
  const [records, setRecords] = useStore<CaseRecord[]>(config.storageKey, empty);
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | string>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CaseRecord | "new" | null>(null);

  const prefix = isoDate(ym.y, ym.m, 1).slice(0, 7);
  const monthRecords = records.filter((r) => r.date.startsWith(prefix));
  const statusOf = (key: string) => config.statuses.find((s) => s.key === key) ?? config.statuses[0];
  const openRecords = records.filter((r) => statusOf(r.status).open);
  const monthAmount = monthRecords.reduce((a, r) => a + r.amount, 0);
  const openAmount = openRecords.reduce((a, r) => a + r.amount, 0);
  const fees = config.feeField ? monthRecords.reduce((a, r) => a + (Number(r[config.feeField!]) || 0), 0) : 0;
  const decided = records.filter((r) => statusOf(r.status).won || statusOf(r.status).lost);
  const wins = decided.filter((r) => statusOf(r.status).won).length;

  const gross = useMemo(() => {
    void tick;
    return sumDays(getDays(isoDate(ym.y, ym.m, 1), isoDate(ym.y, ym.m, daysInMonth(ym.y, ym.m))), getFeeSettings()).gross;
  }, [tick, ym]);

  const dueSoon = config.deadlineField
    ? openRecords.filter((r) => {
        const due = r[config.deadlineField!];
        return typeof due === "string" && due && due <= addDays(today, 3);
      })
    : [];

  const reasonField = config.fields.find((f) => f.key === "reason");
  const reasons = reasonField?.options?.map((o) => {
    const items = monthRecords.filter((r) => r.reason === o);
    return { label: o, count: items.length, amount: items.reduce((a, r) => a + r.amount, 0) };
  }).filter((r) => r.count > 0).sort((a, b) => b.amount - a.amount) ?? [];

  const visible = records
    .filter((r) => r.date.startsWith(prefix) || (statusFilter === "open" && statusOf(r.status).open))
    .filter((r) => statusFilter === "all" || (statusFilter === "open" ? statusOf(r.status).open : r.status === statusFilter))
    .filter((r) => !query || Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => b.date.localeCompare(a.date));

  const tableFields = config.fields.filter((f) => f.inTable);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{config.title}</h1>
          <p className="text-muted-foreground">{config.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card">
            <button aria-label="Mês anterior" onClick={() => setYm(shiftMonth(ym.y, ym.m, -1))} className="p-2 text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /></button>
            <span className="border-x border-border px-4 py-1.5 text-sm font-medium">{MONTHS_LONG[ym.m]} {ym.y}</span>
            <button aria-label="Mês seguinte" onClick={() => setYm(shiftMonth(ym.y, ym.m, 1))} className="p-2 text-muted-foreground hover:text-foreground"><ChevronRight className="size-4" /></button>
          </div>
          <button onClick={() => setEditing("new")} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="size-4" /> {config.newLabel}
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={`Valor este mês`} value={fmtMoney(monthAmount)} sub={`${monthRecords.length} ${config.item}${monthRecords.length === 1 ? "" : "s"}${fees ? ` · ${fmtMoney(fees)} em taxas` : ""}`} />
        {config.rateLabel ? (
          <Stat label={config.rateLabel} value={gross ? fmtPct((monthAmount / gross) * 100) : "—"} sub={gross ? `sobre ${fmtMoney(gross)} de receita bruta` : "precisa da receita da Profit Sheet"} />
        ) : (
          <Stat label="Abertas" value={String(openRecords.length)} sub={`${fmtMoney(openAmount)} em jogo`} />
        )}
        {config.rateLabel ? (
          <Stat label="Em aberto" value={String(openRecords.length)} sub={`${fmtMoney(openAmount)} em jogo`} />
        ) : (
          <Stat label="Prazos a terminar" value={String(dueSoon.length)} sub="nos próximos 3 dias" tone={dueSoon.length ? "warning" : undefined} />
        )}
        {config.winRate ? (
          <Stat label="Taxa de vitória" value={decided.length ? fmtPct((wins / decided.length) * 100) : "—"} sub={`${wins} ganhos de ${decided.length} decididos`} />
        ) : (
          <Stat label="Motivo principal" value={reasons[0]?.label ?? "—"} sub={reasons[0] ? `${reasons[0].count} · ${fmtMoney(reasons[0].amount)}` : "sem registos este mês"} />
        )}
      </section>

      {dueSoon.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <div>
            <p className="font-medium text-amber-300">Prazos a terminar</p>
            <p className="text-muted-foreground">
              {dueSoon.map((r) => `${r.order} (${dayShort(String(r[config.deadlineField!]))})`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {editing && (
        <CaseForm
          config={config}
          initial={editing === "new" ? null : editing}
          today={today}
          onCancel={() => setEditing(null)}
          onSave={(rec) => {
            setRecords((prev) => (prev.some((p) => p.id === rec.id) ? prev.map((p) => (p.id === rec.id ? rec : p)) : [...prev, rec]));
            setEditing(null);
          }}
        />
      )}

      <section className={cn("grid gap-4", reasons.length > 0 && "xl:grid-cols-[1fr_320px]")}>
        <div className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
            <div className="flex flex-wrap gap-1 text-sm">
              {[{ key: "all", label: "Todos" }, { key: "open", label: "Em aberto" }, ...config.statuses.map((s) => ({ key: s.key, label: s.label }))].map((f) => (
                <button key={f.key} onClick={() => setStatusFilter(f.key)} className={cn("rounded-md px-2.5 py-1", statusFilter === f.key ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}>
                  {f.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm">
              <Search className="size-4 text-muted-foreground" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar" className="w-36 bg-transparent outline-none" />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-2.5 text-left font-medium">Data</th>
                  {tableFields.map((f) => <th key={f.key} className={cn("px-4 py-2.5 font-medium", f.type === "money" ? "text-right" : "text-left")}>{f.label}</th>)}
                  <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                  <th className="px-4 py-2.5 text-left font-medium">Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={tableFields.length + 4} className="px-4 py-12 text-center text-muted-foreground">
                      Ainda não há {config.item}s {statusFilter === "all" ? "neste mês" : "com este filtro"}.{" "}
                      <button onClick={() => setEditing("new")} className="text-primary hover:underline">Adicionar</button>
                    </td>
                  </tr>
                )}
                {visible.map((r) => {
                  const st = statusOf(r.status);
                  return (
                    <tr key={r.id} className="group border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="whitespace-nowrap px-4 py-2.5">{dayShort(r.date)}</td>
                      {tableFields.map((f) => {
                        const v = r[f.key];
                        const overdue = f.key === config.deadlineField && st.open && typeof v === "string" && v && v < today;
                        return (
                          <td key={f.key} className={cn("px-4 py-2.5", f.type === "money" && "text-right tabular-nums", overdue && "text-red-400")}>
                            {v === null || v === "" || v === undefined ? <span className="text-muted-foreground/50">—</span> : f.type === "money" ? fmtMoney(Number(v)) : f.type === "date" ? dayShort(String(v)) : String(v)}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums">{fmtMoney(r.amount)}</td>
                      <td className="px-4 py-2.5">
                        <select
                          value={r.status}
                          onChange={(e) => setRecords((prev) => prev.map((p) => (p.id === r.id ? { ...p, status: e.target.value } : p)))}
                          className={cn("rounded-md border-0 px-2 py-1 text-xs font-medium outline-none", toneClass[st.tone])}
                        >
                          {config.statuses.map((s) => <option key={s.key} value={s.key} className="bg-card text-foreground">{s.label}</option>)}
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        <span className="invisible inline-flex gap-1 group-hover:visible">
                          {config.fields.filter((f) => f.type === "url" && r[f.key]).map((f) => (
                            <a key={f.key} href={String(r[f.key])} target="_blank" rel="noreferrer" aria-label={f.label} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><ExternalLink className="size-4" /></a>
                          ))}
                          <button aria-label="Editar" onClick={() => setEditing(r)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-4" /></button>
                          <button aria-label="Apagar" onClick={() => setRecords((prev) => prev.filter((p) => p.id !== r.id))} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-400"><Trash2 className="size-4" /></button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {reasons.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold">Por {reasonField?.label.toLowerCase()}</h3>
            <p className="text-xs text-muted-foreground">{MONTHS_LONG[ym.m]} {ym.y}</p>
            <ul className="mt-4 space-y-3 text-sm">
              {reasons.map((r) => (
                <li key={r.label}>
                  <div className="flex justify-between">
                    <span>{r.label}</span>
                    <span className="tabular-nums text-muted-foreground">{r.count} · {fmtMoney(r.amount)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${monthAmount ? (r.amount / monthAmount) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "warning" }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", tone === "warning" && "border-amber-500/40")}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 truncate text-2xl font-semibold tabular-nums", tone === "warning" && "text-amber-400")}>{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function CaseForm({ config, initial, today, onSave, onCancel }: {
  config: CaseConfig;
  initial: CaseRecord | null;
  today: string;
  onSave: (r: CaseRecord) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = { date: initial?.date ?? today, amount: initial ? String(initial.amount).replace(".", ",") : "", status: initial?.status ?? config.statuses[0].key };
    for (const f of config.fields) {
      const v = initial?.[f.key];
      base[f.key] = v === null || v === undefined ? "" : f.type === "money" ? String(v).replace(".", ",") : String(v);
    }
    return base;
  });
  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));
  const amount = parseNumber(values.amount);
  const missing = config.fields.filter((f) => f.required && !values[f.key]?.trim());
  const valid = amount !== null && amount > 0 && values.date && missing.length === 0;

  function save() {
    if (!valid) return;
    const rec: CaseRecord = { id: initial?.id ?? uid(), date: values.date, amount: amount!, status: values.status };
    for (const f of config.fields) {
      const raw = values[f.key]?.trim() ?? "";
      rec[f.key] = raw === "" ? null : f.type === "money" ? parseNumber(raw) : raw;
    }
    onSave(rec);
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold">{initial ? `Editar ${config.item}` : config.newLabel}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Data" required><input type="date" value={values.date} onChange={(e) => set("date", e.target.value)} className={inputCls} /></Field>
        <Field label="Valor (€)" required><input inputMode="decimal" value={values.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0,00" className={inputCls} /></Field>
        <Field label="Estado">
          <select value={values.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
            {config.statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        {config.fields.map((f) => (
          <Field key={f.key} label={f.label} required={f.required} wide={f.type === "textarea"}>
            {f.type === "select" ? (
              <select value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} className={inputCls}>
                <option value="">Escolher…</option>
                {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === "textarea" ? (
              <textarea rows={2} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} className={inputCls} />
            ) : (
              <input
                type={f.type === "date" ? "date" : f.type === "url" ? "url" : "text"}
                inputMode={f.type === "money" ? "decimal" : undefined}
                value={values[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={inputCls}
              />
            )}
          </Field>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button disabled={!valid} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Guardar</button>
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
        {!valid && <span className="text-xs text-muted-foreground">Preenche data, valor{missing.length ? ` e ${missing.map((m) => m.label.toLowerCase()).join(", ")}` : ""}.</span>}
      </div>
    </form>
  );
}

function Field({ label, required, wide, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1 text-sm", wide && "sm:col-span-2 lg:col-span-4")}>
      <span className="text-muted-foreground">{label}{required && " *"}</span>
      {children}
    </label>
  );
}
