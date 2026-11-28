const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num2 = new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num1 = new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmtMoney = (v: number | null | undefined) => (v === null || v === undefined ? "—" : money.format(v));
export const fmtNum = (v: number | null | undefined) => (v === null || v === undefined ? "" : num2.format(v));
export const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${num1.format(v || 0)}%`);
export const fmtX = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${num2.format(v)}×`);

export function fmtDelta(v: number | null, unit: "%" | "pp" = "%") {
  if (v === null || !Number.isFinite(v)) return null;
  return `${v > 0 ? "+" : ""}${num1.format(v)}${unit === "pp" ? " pp" : "%"}`;
}

/** Aceita "1 234,56", "1234.56", "1,234.56". Devolve null se vazio. */
export function parseNumber(raw: string): number | null {
  let s = raw.replace(/[€\s]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}
