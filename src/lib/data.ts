"use client";

// Funções de leitura partilhadas pelas páginas (demo: localStorage + dados de exemplo).

import { readStore } from "./store";
import { todayInLisbon } from "./dates";
import { defaultFeeSettings, FEES_KEY, mockMonth, monthStorageKey, type DayInput, type FeeSettings } from "./profit-sheet";
import { EXPENSES_KEY, mockExpenses, mockSubscriptions, SUBSCRIPTIONS_KEY, type Expense, type Subscription } from "./expenses";
import { mockReports, REPORTS_KEY, type DailyReport } from "./daily-reports";

export const getFeeSettings = () => readStore<FeeSettings>(FEES_KEY, () => defaultFeeSettings);

export function getMonth(y: number, m: number): DayInput[] {
  const today = todayInLisbon();
  return readStore(monthStorageKey(y, m), () => mockMonth(y, m, today));
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

export const getExpenses = () => readStore<Expense[]>(EXPENSES_KEY, () => mockExpenses(todayInLisbon()));
export const getSubscriptions = () => readStore<Subscription[]>(SUBSCRIPTIONS_KEY, () => mockSubscriptions(todayInLisbon()));
export const getReports = () => readStore<Record<string, DailyReport>>(REPORTS_KEY, () => mockReports(todayInLisbon()));
