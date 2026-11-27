export const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const MONTHS_LONG = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const WEEKDAYS_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function todayInLisbon() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

export const asDate = (iso: string) => new Date(`${iso}T12:00:00Z`);
export const toIso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, n: number) {
  const d = asDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

export const dayShort = (iso: string) => {
  const d = asDate(iso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
};

export const weekdayShort = (iso: string) => WEEKDAYS_SHORT[asDate(iso).getUTCDay()];

export const monthKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}`;

export function parseMonthKey(key: string) {
  return { y: Number(key.slice(0, 4)), m: Number(key.slice(5, 7)) - 1 };
}

export function shiftMonth(y: number, m: number, delta: number) {
  const d = new Date(Date.UTC(y, m + delta, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
}

/** Segunda-feira da semana de `iso`. */
export function weekStart(iso: string) {
  const wd = asDate(iso).getUTCDay();
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}
