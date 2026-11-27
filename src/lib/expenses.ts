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

export const EXPENSES_KEY = "fv.v2.expenses";
export const SUBSCRIPTIONS_KEY = "fv.v2.subscriptions";

export const initialExpenses = (): Expense[] => [];
export const initialSubscriptions = (): Subscription[] => [];

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
