// Profit Sheet: tipos, cálculos e dados de exemplo.
// Os campos marcados como "input" são preenchidos à mão (ou vêm das integrações);
// tudo o resto é calculado aqui.

export type DayInput = {
  date: string; // YYYY-MM-DD
  gross: number | null; // receita bruta (Shopify)
  discounts: number | null; // descontos (Shopify)
  reversals: number | null; // reembolsos/estornos (Shopify)
  orders: number | null; // nº de encomendas (Shopify), para o AOV
  cogs: number | null; // custo dos produtos
  adsMeta: number | null; // gasto Meta Ads
  adsGoogle: number | null; // gasto Google Ads
  txFee: number | null; // taxas de pagamento (Shopify Payments, PayPal…)
  atc: number | null; // add-to-cart rate (%)
  checkout: number | null; // checkout rate (%)
  cvr: number | null; // conversion rate (%)
  note: string;
};

/** Taxas em vigor a partir de uma data (`from` = null: desde sempre). */
export type FeePeriod = {
  from: string | null;
  metaAgencyPct: number;
  googleAgencyPct: number;
  txPct: number; // taxa de transação do fornecedor de pagamentos (% da receita bruta)
  cashbackPct: number; // cashback do cartão sobre o gasto em anúncios
  cashbackOn: "both" | "meta" | "google";
};

export type FeeSettings = {
  periods: FeePeriod[]; // ordenadas por `from`
  metaEnabled: boolean;
  googleEnabled: boolean;
};

export const defaultFeeSettings: FeeSettings = {
  periods: [{ from: null, metaAgencyPct: 0, googleAgencyPct: 0, txPct: 0, cashbackPct: 0, cashbackOn: "both" }],
  metaEnabled: true,
  googleEnabled: true,
};

export function feesFor(s: FeeSettings, date: string): FeePeriod {
  let current = s.periods[0];
  for (const p of s.periods) if (p.from === null || p.from <= date) current = p;
  return current;
}

/** "A partir de um dia": novas taxas a partir de `from`. "Corrigir todo o histórico": from = null. */
export function applyFees(s: FeeSettings, period: FeePeriod): FeeSettings {
  if (period.from === null) return { ...s, periods: [period] };
  const kept = s.periods.filter((p) => p.from === null || p.from < period.from!);
  return { ...s, periods: [...kept, period] };
}

export type DayResult = {
  netRev: number;
  txFee: number;
  aov: number | null;
  cogPct: number | null;
  adsMeta: number;
  adsGoogle: number;
  adSpend: number;
  cashback: number;
  roas: number | null;
  metaAgency: number;
  googleAgency: number;
  totalCost: number;
  profit: number;
  margin: number | null;
};

const n = (v: number | null | undefined) => v ?? 0;
const ratio = (a: number, b: number) => (b ? a / b : null);

export function isTracked(d: DayInput) {
  return d.gross !== null;
}

export function isIncomplete(d: DayInput, s: FeeSettings) {
  if (!isTracked(d)) return false;
  return d.cogs === null || (s.metaEnabled && d.adsMeta === null) || (s.googleEnabled && d.adsGoogle === null);
}

export function computeDay(d: DayInput, s: FeeSettings): DayResult {
  const fees = feesFor(s, d.date);
  const netRev = n(d.gross) - n(d.discounts) - n(d.reversals);
  const adsMeta = s.metaEnabled ? n(d.adsMeta) : 0;
  const adsGoogle = s.googleEnabled ? n(d.adsGoogle) : 0;
  const adSpend = adsMeta + adsGoogle;
  const cashbackBase = fees.cashbackOn === "meta" ? adsMeta : fees.cashbackOn === "google" ? adsGoogle : adSpend;
  const cashback = (cashbackBase * fees.cashbackPct) / 100;
  const metaAgency = (adsMeta * fees.metaAgencyPct) / 100;
  const googleAgency = (adsGoogle * fees.googleAgencyPct) / 100;
  const txFee = d.txFee ?? (n(d.gross) * fees.txPct) / 100;
  const totalCost = n(d.cogs) + adSpend + metaAgency + googleAgency + txFee - cashback;
  const profit = netRev - totalCost;
  return {
    netRev,
    txFee,
    aov: d.orders ? netRev / d.orders : null,
    cogPct: d.cogs === null ? null : ratio(d.cogs * 100, netRev),
    adsMeta,
    adsGoogle,
    adSpend,
    cashback,
    roas: ratio(netRev, adSpend),
    metaAgency,
    googleAgency,
    totalCost,
    profit,
    margin: ratio(profit * 100, netRev),
  };
}

export type Totals = DayResult & {
  gross: number;
  discounts: number;
  reversals: number;
  orders: number;
  cogs: number;
  days: number;
};

export function sumDays(days: DayInput[], fees: FeeSettings): Totals {
  const t = {
    gross: 0, discounts: 0, reversals: 0, orders: 0, cogs: 0, txFee: 0, days: 0,
    netRev: 0, adsMeta: 0, adsGoogle: 0, adSpend: 0, cashback: 0, metaAgency: 0, googleAgency: 0, totalCost: 0, profit: 0,
  };
  for (const d of days) {
    if (!isTracked(d)) continue;
    const r = computeDay(d, fees);
    t.days++;
    t.gross += n(d.gross);
    t.discounts += n(d.discounts);
    t.reversals += n(d.reversals);
    t.orders += n(d.orders);
    t.cogs += n(d.cogs);
    t.txFee += r.txFee;
    t.netRev += r.netRev;
    t.adsMeta += r.adsMeta;
    t.adsGoogle += r.adsGoogle;
    t.adSpend += r.adSpend;
    t.cashback += r.cashback;
    t.metaAgency += r.metaAgency;
    t.googleAgency += r.googleAgency;
    t.totalCost += r.totalCost;
    t.profit += r.profit;
  }
  return {
    ...t,
    aov: ratio(t.netRev, t.orders),
    cogPct: ratio(t.cogs * 100, t.netRev),
    roas: ratio(t.netRev, t.adSpend),
    margin: ratio(t.profit * 100, t.netRev),
  };
}

/** ROAS a partir do qual o lucro é zero, com os custos atuais. */
export function breakEvenRoas(t: Totals) {
  if (!t.adSpend) return null;
  const agencyRate = (t.metaAgency + t.googleAgency) / t.adSpend;
  const cashbackRate = t.cashback / t.adSpend;
  const breakEvenSpend = (t.netRev - t.cogs - t.txFee) / (1 + agencyRate - cashbackRate);
  return breakEvenSpend > 0 ? t.netRev / breakEvenSpend : null;
}

// ---------- datas ----------

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function weekday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = domingo
}

// ---------- mês vazio ----------

export function emptyDay(date: string): DayInput {
  return {
    date, gross: null, discounts: null, reversals: null, orders: null, cogs: null,
    adsMeta: null, adsGoogle: null, txFee: null, atc: null, checkout: null, cvr: null, note: "",
  };
}

/** Mês sem dados (todos os dias por preencher). */
export function blankMonth(year: number, month: number): DayInput[] {
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => emptyDay(isoDate(year, month, i + 1)));
}

// ---------- acesso aos dados (demo: localStorage) ----------

export const monthStorageKey = (y: number, m: number) => `fv.v2.ps.${y}-${String(m + 1).padStart(2, "0")}`;
export const FEES_KEY = "fv.v2.ps.fees";
