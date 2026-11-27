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

export type Fees = {
  metaAgencyPct: number;
  googleAgencyPct: number;
  cashbackPct: number; // cashback do cartão sobre o gasto em anúncios
  metaEnabled: boolean;
  googleEnabled: boolean;
};

export const defaultFees: Fees = {
  metaAgencyPct: 0,
  googleAgencyPct: 10,
  cashbackPct: 2,
  metaEnabled: true,
  googleEnabled: true,
};

export type DayResult = {
  netRev: number;
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

export function isIncomplete(d: DayInput, fees: Fees) {
  if (!isTracked(d)) return false;
  return (
    d.cogs === null ||
    d.txFee === null ||
    (fees.metaEnabled && d.adsMeta === null) ||
    (fees.googleEnabled && d.adsGoogle === null)
  );
}

export function computeDay(d: DayInput, fees: Fees): DayResult {
  const netRev = n(d.gross) - n(d.discounts) - n(d.reversals);
  const adsMeta = fees.metaEnabled ? n(d.adsMeta) : 0;
  const adsGoogle = fees.googleEnabled ? n(d.adsGoogle) : 0;
  const adSpend = adsMeta + adsGoogle;
  const cashback = (adSpend * fees.cashbackPct) / 100;
  const metaAgency = (adsMeta * fees.metaAgencyPct) / 100;
  const googleAgency = (adsGoogle * fees.googleAgencyPct) / 100;
  const totalCost = n(d.cogs) + adSpend + metaAgency + googleAgency + n(d.txFee) - cashback;
  const profit = netRev - totalCost;
  return {
    netRev,
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
  txFee: number;
  days: number;
};

export function sumDays(days: DayInput[], fees: Fees): Totals {
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
    t.txFee += n(d.txFee);
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

// ---------- dados de exemplo ----------

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function emptyDay(date: string): DayInput {
  return {
    date, gross: null, discounts: null, reversals: null, orders: null, cogs: null,
    adsMeta: null, adsGoogle: null, txFee: null, atc: null, checkout: null, cvr: null, note: "",
  };
}

/** Gera um mês de exemplo, com dados até ao dia anterior a `today`. */
export function mockMonth(year: number, month: number, today: string): DayInput[] {
  const total = daysInMonth(year, month);
  const out: DayInput[] = [];
  for (let day = 1; day <= total; day++) {
    const date = isoDate(year, month, day);
    if (date >= today) {
      out.push(emptyDay(date));
      continue;
    }
    const rnd = seeded(year * 10000 + (month + 1) * 100 + day);
    const gross = round2(450 + rnd() * 1600);
    const orders = Math.max(1, Math.round(gross / (48 + rnd() * 14)));
    const discounts = round2(gross * (0.07 + rnd() * 0.05));
    const reversals = rnd() < 0.15 ? round2(20 + rnd() * 80) : 0;
    const net = gross - discounts - reversals;
    const adsGoogle = round2(net * (0.25 + rnd() * 0.45));
    const atc = round2(2.6 + rnd() * 2.4);
    const checkout = round2(1.3 + rnd() * 1.6);
    out.push({
      date,
      gross,
      discounts,
      reversals,
      orders,
      // alguns dias sem custo preenchido, para mostrar "incompleto"
      cogs: day % 9 === 4 ? null : round2(net * (0.29 + rnd() * 0.1)),
      adsMeta: 0,
      adsGoogle,
      txFee: round2(gross * (0.025 + rnd() * 0.025)),
      atc: round2(atc),
      checkout: round2(checkout),
      cvr: round2(checkout * (0.45 + rnd() * 0.25)),
      note: "",
    });
  }
  return out;
}
