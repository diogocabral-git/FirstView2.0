import { daysInMonth, isoDate } from "./profit-sheet";

export type ExpenseCategory = "operations" | "team" | "personal" | "extra";

export const expenseCategories: { key: ExpenseCategory; label: string; join: string }[] = [
  { key: "operations", label: "Operacional", join: "Juntar a operacional" },
  { key: "team", label: "Equipa", join: "Juntar a equipa" },
  { key: "personal", label: "Pessoal", join: "Juntar a pessoal" },
  { key: "extra", label: "Extra", join: "Juntar a extra" },
];

export type Expense = {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  scope: "business" | string; // "business" = todo o negócio; ou id da loja
};

export type Subscription = {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  cycle: "monthly" | "yearly";
  startDate: string;
  endDate: string | null; // terminada: já não conta a partir do mês seguinte
  scope: "business" | string;
};

export const EXPENSES_KEY = "fv.expenses";
export const SUBSCRIPTIONS_KEY = "fv.subscriptions";

export function mockExpenses(today: string): Expense[] {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7)) - 1;
  const out: Expense[] = [];
  for (let back = 0; back < 6; back++) {
    const d = new Date(Date.UTC(y, m - back, 1));
    const yy = d.getUTCFullYear();
    const mm = d.getUTCMonth();
    const day = (n: number) => isoDate(yy, mm, Math.min(n, daysInMonth(yy, mm)));
    out.push(
      { id: `e-${back}-1`, category: "operations", description: "Software", amount: 120 + back * 15, date: day(5), scope: "business" },
      { id: `e-${back}-2`, category: "team", description: "Editor de vídeo (freelancer)", amount: 180, date: day(12), scope: "business" },
    );
    if (back % 2 === 0) out.push({ id: `e-${back}-3`, category: "extra", description: "Amostras de produto", amount: 65, date: day(20), scope: "business" });
  }
  return out.filter((e) => e.date <= today);
}

export function mockSubscriptions(today: string): Subscription[] {
  const start = `${Number(today.slice(0, 4)) - 1}-01-10`;
  return [
    { id: "s-1", name: "Shopify", category: "operations", amount: 39, cycle: "monthly", startDate: start, endDate: null, scope: "business" },
    { id: "s-2", name: "Tema da loja", category: "operations", amount: 29, cycle: "monthly", startDate: start, endDate: null, scope: "business" },
    { id: "s-3", name: "Canva Pro", category: "operations", amount: 12, cycle: "monthly", startDate: start, endDate: null, scope: "business" },
  ];
}

/** A subscrição conta neste mês? (mensal: todos os meses; anual: no mês de aniversário) */
export function subscriptionChargeInMonth(s: Subscription, y: number, m: number): number {
  const monthStart = isoDate(y, m, 1);
  const monthEnd = isoDate(y, m, daysInMonth(y, m));
  if (s.startDate > monthEnd) return 0;
  if (s.endDate && s.endDate < monthStart) return 0;
  if (s.cycle === "monthly") return s.amount;
  return Number(s.startDate.slice(5, 7)) - 1 === m ? s.amount : 0;
}

export function monthExpenses(expenses: Expense[], subs: Subscription[], y: number, m: number) {
  const prefix = isoDate(y, m, 1).slice(0, 7);
  const byCategory: Record<ExpenseCategory, number> = { operations: 0, team: 0, personal: 0, extra: 0 };
  for (const e of expenses) if (e.date.startsWith(prefix)) byCategory[e.category] += e.amount;
  for (const s of subs) byCategory[s.category] += subscriptionChargeInMonth(s, y, m);
  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
  return { byCategory, total };
}
