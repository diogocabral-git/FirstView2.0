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

export const REPORTS_KEY = "fv.v2.dailyReports";

export function emptyReport(date: string): DailyReport {
  return {
    date, atc: null, reachedCheckout: null, cvr: null, cpc: null, ctr: null, cpm: null,
    productsTested: "", collectionsTested: "", collectionsToTest: "", nextCollection: "", bestseller: "",
    observations: "", difficulties: "", submittedAt: null,
  };
}

export const initialReports = (): Record<string, DailyReport> => ({});
