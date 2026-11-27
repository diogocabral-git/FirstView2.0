"use client";

// Agregados por período (semana/mês/intervalo) a partir da Profit Sheet, despesas e reports.

import { addDays, asDate, monthKey, shiftMonth, weekStart } from "./dates";
import { getDays, getExpenses, getFeeSettings, getReports, getSubscriptions } from "./data";
import { monthExpenses } from "./expenses";
import { breakEvenRoas, daysInMonth, isoDate, sumDays, type Totals } from "./profit-sheet";

export type PeriodStats = {
  key: string;
  label: string;
  from: string;
  to: string;
  totals: Totals;
  expenses: number;
  finalProfit: number;
  refundRate: number | null;
  reportsSent: number;
  reportDays: number;
  breakEven: number | null;
};

/** Despesas do intervalo: cada mês reparte o seu total pelos dias. */
export function expensesBetween(from: string, to: string) {
  const exps = getExpenses();
  const subs = getSubscriptions();
  let total = 0;
  let cursor = from;
  while (cursor <= to) {
    const y = Number(cursor.slice(0, 4));
    const m = Number(cursor.slice(5, 7)) - 1;
    const dim = daysInMonth(y, m);
    const monthEnd = isoDate(y, m, dim);
    const end = to < monthEnd ? to : monthEnd;
    const days = Number(end.slice(8, 10)) - Number(cursor.slice(8, 10)) + 1;
    total += (monthExpenses(exps, subs, y, m).total * days) / dim;
    cursor = addDays(end, 1);
  }
  return total;
}

export function statsBetween(from: string, to: string, today: string, label = "", key = from): PeriodStats {
  const fees = getFeeSettings();
  const totals = sumDays(getDays(from, to), fees);
  const reports = getReports();
  const lastReportDay = to < today ? to : addDays(today, -1);
  let reportDays = 0;
  let reportsSent = 0;
  for (let d = from; d <= lastReportDay; d = addDays(d, 1)) {
    reportDays++;
    if (reports[d]?.submittedAt) reportsSent++;
  }
  const expenses = expensesBetween(from, to < today ? to : today);
  return {
    key,
    label,
    from,
    to,
    totals,
    expenses,
    finalProfit: totals.profit - expenses,
    refundRate: totals.gross ? (totals.reversals / totals.gross) * 100 : null,
    reportsSent,
    reportDays,
    breakEven: breakEvenRoas(totals),
  };
}

export function lastWeeks(today: string, count: number): PeriodStats[] {
  const thisMonday = weekStart(today);
  return Array.from({ length: count }, (_, i) => {
    const from = addDays(thisMonday, -7 * i);
    const to = addDays(from, 6);
    const f = asDate(from);
    const t = asDate(to);
    const label = `${f.getUTCDate()}/${f.getUTCMonth() + 1} – ${t.getUTCDate()}/${t.getUTCMonth() + 1}`;
    return statsBetween(from, to, today, label);
  });
}

export function lastMonths(today: string, count: number): PeriodStats[] {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7)) - 1;
  return Array.from({ length: count }, (_, i) => {
    const p = shiftMonth(y, m, -i);
    const from = isoDate(p.y, p.m, 1);
    const to = isoDate(p.y, p.m, daysInMonth(p.y, p.m));
    return statsBetween(from, to, today, "", monthKey(p.y, p.m));
  });
}
