"use client";

import { useMemo, useState } from "react";
import { Briefcase, ChevronLeft, ChevronRight, Plus, Repeat, Sparkles, User, Users, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn, formatCurrency } from "@/lib/utils";
import { useMounted, useStore } from "@/lib/store";
import { MONTHS_LONG, MONTHS_SHORT, shiftMonth, todayInLisbon } from "@/lib/dates";
import {
  EXPENSES_KEY, expenseCategories, mockExpenses, mockSubscriptions, monthExpenses, subscriptionChargeInMonth, SUBSCRIPTIONS_KEY,
  type Expense, type ExpenseCategory, type Subscription,
} from "@/lib/expenses";
import { isoDate } from "@/lib/profit-sheet";

const icons: Record<ExpenseCategory, React.ElementType> = { operations: Briefcase, team: Users, personal: User, extra: Sparkles };
const money = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(v);
const uid = () => Math.random().toString(36).slice(2, 10);

export function ExpensesPage() {
  const mounted = useMounted();
  if (!mounted) return <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />;
  return <ExpensesInner />;
}

function ExpensesInner() {
  const [today] = useState(todayInLisbon);
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const expFallback = useMemo(() => () => mockExpenses(today), [today]);
  const subFallback = useMemo(() => () => mockSubscriptions(today), [today]);
  const [expenses, setExpenses] = useStore<Expense[]>(EXPENSES_KEY, expFallback);
  const [subs, setSubs] = useStore<Subscription[]>(SUBSCRIPTIONS_KEY, subFallback);
  const [adding, setAdding] = useState<ExpenseCategory | null>(null);
  const [addingSub, setAddingSub] = useState(false);

  const prefix = isoDate(ym.y, ym.m, 1).slice(0, 7);
  const monthItems = expenses.filter((e) => e.date.startsWith(prefix));
  const activeSubs = subs.filter((s) => subscriptionChargeInMonth(s, ym.y, ym.m) > 0 || (s.cycle === "yearly" && !s.endDate));
  const { byCategory, total } = monthExpenses(expenses, subs, ym.y, ym.m);
  const monthlySubs = subs.filter((s) => !s.endDate).reduce((a, s) => a + (s.cycle === "monthly" ? s.amount : s.amount / 12), 0);

  const history = Array.from({ length: 12 }, (_, i) => {
    const { y, m } = shiftMonth(ym.y, ym.m, i - 11);
    return { label: MONTHS_SHORT[m].toUpperCase(), total: monthExpenses(expenses, subs, y, m).total };
  });
  const withData = history.filter((h) => h.total > 0);
  const priciest = withData.reduce((a, b) => (b.total > a.total ? b : a), { label: "—", total: 0 });
  const avg = withData.length ? withData.reduce((a, b) => a + b.total, 0) / withData.length : 0;
  const prevTotal = history[10].total;
  const change = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Despesas</h1>
          <p className="text-muted-foreground">O que sai, por categoria e por loja. Entra no cálculo do lucro.</p>
        </div>
        <div className="flex items-center rounded-lg border border-border bg-card">
          <button aria-label="Mês anterior" onClick={() => setYm(shiftMonth(ym.y, ym.m, -1))} className="p-2 text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /></button>
          <span className="border-x border-border px-4 py-1.5 text-sm font-medium">{MONTHS_LONG[ym.m]} {ym.y}</span>
          <button aria-label="Mês seguinte" onClick={() => setYm(shiftMonth(ym.y, ym.m, 1))} className="p-2 text-muted-foreground hover:text-foreground"><ChevronRight className="size-4" /></button>
        </div>
      </div>

      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Despesas de {MONTHS_LONG[ym.m]} {ym.y} · {money(total)}</p>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {expenseCategories.map((c) => {
          const Icon = icons[c.key];
          const items = monthItems.filter((e) => e.category === c.key);
          const subItems = subs.filter((s) => s.category === c.key && subscriptionChargeInMonth(s, ym.y, ym.m) > 0);
          const value = byCategory[c.key];
          const share = total ? Math.round((value / total) * 100) : 0;
          return (
            <div key={c.key} className="flex flex-col rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between gap-2 border-b border-border p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted"><Icon className="size-4 text-primary" /></span>
                  <div>
                    <p className="font-medium">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{items.length + subItems.length} despesas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{money(value)}</p>
                  <p className="text-xs text-muted-foreground">{share}% do mês</p>
                </div>
              </div>
              <ul className="flex-1 divide-y divide-border text-sm">
                {subItems.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="flex items-center gap-2">{s.name} <Repeat className="size-3 text-muted-foreground" aria-label="Subscrição" /></span>
                    <span className="tabular-nums">{money(subscriptionChargeInMonth(s, ym.y, ym.m))}</span>
                  </li>
                ))}
                {items.map((e) => (
                  <li key={e.id} className="group flex items-center justify-between px-4 py-2.5">
                    <span>{e.description}</span>
                    <span className="flex items-center gap-2 tabular-nums">
                      {money(e.amount)}
                      <button aria-label="Apagar despesa" onClick={() => setExpenses((prev) => prev.filter((x) => x.id !== e.id))} className="invisible text-muted-foreground hover:text-red-400 group-hover:visible">
                        <X className="size-3.5" />
                      </button>
                    </span>
                  </li>
                ))}
                {items.length + subItems.length === 0 && (
                  <li className="px-4 py-8 text-center text-muted-foreground">Nada em {c.label.toLowerCase()} este mês</li>
                )}
              </ul>
              {adding === c.key ? (
                <ExpenseForm
                  defaultDate={today.startsWith(prefix) ? today : isoDate(ym.y, ym.m, 1)}
                  onCancel={() => setAdding(null)}
                  onSave={(e) => {
                    setExpenses((prev) => [...prev, { ...e, id: uid(), category: c.key }]);
                    setAdding(null);
                  }}
                />
              ) : (
                <button onClick={() => setAdding(c.key)} className="flex items-center justify-center gap-1.5 border-t border-border py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Plus className="size-3.5" /> {c.join}
                </button>
              )}
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-semibold">Subscrições ativas</h2>
            <button onClick={() => setAddingSub(true)} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
              <Plus className="size-4" /> Subscrição
            </button>
          </div>
          <div className="p-4">
            <p className="text-2xl font-semibold tabular-nums">{money(monthlySubs)} <span className="text-sm font-normal text-muted-foreground">por mês · {subs.filter((s) => !s.endDate).length} subscrições</span></p>
          </div>
          {addingSub && (
            <SubscriptionForm
              defaultDate={today}
              onCancel={() => setAddingSub(false)}
              onSave={(s) => {
                setSubs((prev) => [...prev, { ...s, id: uid() }]);
                setAddingSub(false);
              }}
            />
          )}
          <ul className="divide-y divide-border border-t border-border text-sm">
            {activeSubs.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-12 text-xs text-muted-foreground">dia {Number(s.startDate.slice(8, 10))}</span>
                  <span className="font-medium">{s.name}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {expenseCategories.find((c) => c.key === s.category)?.label} · {s.cycle === "monthly" ? "mensal" : "anual"}
                  </span>
                  {s.endDate && <span className="text-xs text-amber-400">termina {s.endDate}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">{money(s.amount)}</span>
                  {!s.endDate && (
                    <button
                      onClick={() => setSubs((prev) => prev.map((x) => (x.id === s.id ? { ...x, endDate: today } : x)))}
                      className="text-xs text-muted-foreground hover:text-red-400"
                    >
                      Terminar
                    </button>
                  )}
                </div>
              </li>
            ))}
            {activeSubs.length === 0 && <li className="px-4 py-8 text-center text-muted-foreground">Sem subscrições ativas.</li>}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold">Ao longo dos meses</h2>
          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums">{money(total)}</span>
            {change !== null && (
              <span className={cn("text-sm", change > 0 ? "text-red-400" : "text-emerald-400")}>
                {change > 0 ? "+" : ""}{change.toFixed(1).replace(".", ",")}% vs mês anterior
              </span>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-muted p-3"><p className="text-muted-foreground">Mês mais caro</p><p className="font-medium">{priciest.label} · {money(priciest.total)}</p></div>
            <div className="rounded-lg bg-muted p-3"><p className="text-muted-foreground">Média mensal</p><p className="font-medium">{money(avg)}</p></div>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} width={56} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickFormatter={(v: number) => formatCurrency(v, { compact: true })} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }} formatter={(v) => [money(Number(v)), "Despesas"]} />
                <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function ExpenseForm({ defaultDate, onSave, onCancel }: { defaultDate: string; onSave: (e: Omit<Expense, "id" | "category">) => void; onCancel: () => void }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultDate);
  const value = Number(amount.replace(",", "."));
  const valid = description.trim() && value > 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ description: description.trim(), amount: value, date, scope: "business" });
      }}
      className="space-y-2 border-t border-border p-3"
    >
      <input autoFocus placeholder="Descrição (ex.: edição de vídeo)" value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
      <div className="flex gap-2">
        <input placeholder="Valor €" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
      </div>
      <select disabled className={cn(inputCls, "text-muted-foreground")} title="Atribuir a uma loja fica disponível quando as lojas estiverem ligadas">
        <option>Todo o negócio</option>
      </select>
      <div className="flex gap-2">
        <button disabled={!valid} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">Guardar</button>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
      </div>
    </form>
  );
}

function SubscriptionForm({ defaultDate, onSave, onCancel }: { defaultDate: string; onSave: (s: Omit<Subscription, "id">) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("operations");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [startDate, setStartDate] = useState(defaultDate);
  const value = Number(amount.replace(",", "."));
  const valid = name.trim() && value > 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ name: name.trim(), amount: value, category, cycle, startDate, endDate: null, scope: "business" });
      }}
      className="grid gap-2 border-t border-border p-4 sm:grid-cols-2"
    >
      <input autoFocus placeholder="Nome (ex.: Claude)" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      <input placeholder="Valor €" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
      <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className={inputCls}>
        {expenseCategories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <select value={cycle} onChange={(e) => setCycle(e.target.value as "monthly" | "yearly")} className={inputCls}>
        <option value="monthly">Repete-se mensalmente</option>
        <option value="yearly">Repete-se anualmente</option>
      </select>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">Começa em <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} /></label>
      <div className="flex items-center gap-2">
        <button disabled={!valid} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">Guardar</button>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
      </div>
    </form>
  );
}
