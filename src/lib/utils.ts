import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, opts: { compact?: boolean } = {}) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: opts.compact ? 1 : 0,
  }).format(value);
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toLocaleString("pt-PT", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}
