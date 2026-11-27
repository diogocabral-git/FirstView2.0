import { addDays } from "./dates";

export type DailyReport = {
  date: string;
  // 1. Métricas
  atc: number | null;
  reachedCheckout: number | null;
  cvr: number | null;
  cpc: number | null;
  ctr: number | null;
  cpm: number | null;
  // 2. O teu dia
  productsTested: string; // links, um por linha
  collectionsTested: string;
  collectionsToTest: string;
  nextCollection: string;
  bestseller: string;
  observations: string;
  difficulties: string;
  submittedAt: string | null;
};

export const REPORTS_KEY = "fv.dailyReports";

export function emptyReport(date: string): DailyReport {
  return {
    date, atc: null, reachedCheckout: null, cvr: null, cpc: null, ctr: null, cpm: null,
    productsTested: "", collectionsTested: "", collectionsToTest: "", nextCollection: "", bestseller: "",
    observations: "", difficulties: "", submittedAt: null,
  };
}

/** Reports de exemplo para os últimos 45 dias (alguns em falta, de propósito). */
export function mockReports(today: string): Record<string, DailyReport> {
  const out: Record<string, DailyReport> = {};
  for (let i = 1; i <= 45; i++) {
    const date = addDays(today, -i);
    if (i % 6 === 2 || i % 11 === 0) continue;
    out[date] = {
      ...emptyReport(date),
      atc: 3 + ((i * 7) % 20) / 10,
      reachedCheckout: 1.5 + ((i * 3) % 15) / 10,
      cvr: 0.8 + ((i * 5) % 12) / 10,
      cpc: 0.3 + ((i * 13) % 30) / 100,
      ctr: 1.2 + ((i * 7) % 10) / 10,
      cpm: 5 + ((i * 11) % 40) / 10,
      observations: "Dia estável.",
      submittedAt: `${date}T22:00:00Z`,
    };
  }
  return out;
}
