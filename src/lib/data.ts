"use client";

// Funções de leitura partilhadas pelas páginas (demo: localStorage + dados de exemplo).

import { readStore } from "./store";
import { defaultFeeSettings, FEES_KEY, blankMonth, monthStorageKey, type DayInput, type FeeSettings } from "./profit-sheet";
import { EXPENSES_KEY, initialExpenses, initialSubscriptions, SUBSCRIPTIONS_KEY, type Expense, type Subscription } from "./expenses";
import { initialReports, REPORTS_KEY, type DailyReport } from "./daily-reports";

export const getFeeSettings = () => readStore<FeeSettings>(FEES_KEY, () => defaultFeeSettings);

export function getMonth(y: number, m: number): DayInput[] {
  return readStore(monthStorageKey(y, m), () => blankMonth(y, m));
}

/** Dias entre duas datas (inclusive), de vários meses. */
export function getDays(from: string, to: string): DayInput[] {
  const out: DayInput[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7)) - 1;
  const endKey = to.slice(0, 7);
  for (;;) {
    for (const d of getMonth(y, m)) if (d.date >= from && d.date <= to) out.push(d);
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;
    if (key >= endKey) break;
    m++;
    if (m === 12) {
      m = 0;
      y++;
    }
  }
  return out;
}

export const getExpenses = () => readStore<Expense[]>(EXPENSES_KEY, () => initialExpenses());
export const getSubscriptions = () => readStore<Subscription[]>(SUBSCRIPTIONS_KEY, () => initialSubscriptions());
export const getReports = () => readStore<Record<string, DailyReport>>(REPORTS_KEY, () => initialReports());
