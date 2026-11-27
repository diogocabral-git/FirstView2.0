"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStoreTick } from "@/lib/store";
import { addDays, dayShort, weekdayShort } from "@/lib/dates";
import { getDays, getFeeSettings, getReports } from "@/lib/data";
import { computeDay, isIncomplete, isTracked } from "@/lib/profit-sheet";

const WINDOW = 30;

export function CommandCenter({ today }: { today: string }) {
  const tick = useStoreTick();

  const data = useMemo(() => {
    void tick;
    const fees = getFeeSettings();
    const reports = getReports();
    const from = addDays(today, -WINDOW);
    const to = addDays(today, -1);
    const days = getDays(from, to).map((d) => {
      const tracked = isTracked(d);
      return {
        date: d.date,
        report: !!reports[d.date]?.submittedAt,
        sheet: tracked && !isIncomplete(d, fees),
        sheetPartial: tracked && isIncomplete(d, fees),
        profit: tracked ? computeDay(d, fees).profit : null,
      };
    });
    const reportCount = days.filter((d) => d.report).length;
    const sheetMissing = days.filter((d) => !d.sheet).length;
    const filled = days.filter((d) => d.profit !== null);
    const profitable = filled.filter((d) => (d.profit ?? 0) > 0).length;
    let best = 0;
    let run = 0;
    for (const d of days) {
      run = d.profit !== null && d.profit > 0 ? run + 1 : 0;
      best = Math.max(best, run);
    }
    let current = 0;
    for (let i = days.length - 1; i >= 0 && days[i].profit !== null && days[i].profit! > 0; i--) current++;
    const alerts = days
      .slice(-7)
      .flatMap((d) => [
        ...(!d.report ? [{ date: d.date, text: "Daily Report por enviar", href: "/daily-reports" }] : []),
        ...(!d.sheet ? [{ date: d.date, text: d.sheetPartial ? "Profit Sheet incompleta" : "Profit Sheet por preencher", href: "/profit-sheet" }] : []),
      ])
      .reverse();
    return { days, reportCount, sheetMissing, filled: filled.length, profitable, best, current, alerts };
  }, [tick, today]);

  const reportPct = Math.round((data.reportCount / WINDOW) * 100);
  const profitPct = data.filled ? Math.round((data.profitable / data.filled) * 100) : 0;
  const circumference = 2 * Math.PI * 52;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Cumprimento</h3>
            <span className="text-xs text-muted-foreground">{WINDOW} dias</span>
          </div>
          <p className="mt-3 text-3xl font-semibold">
            {reportPct}% <span className="text-sm font-normal text-muted-foreground">dos dias com Daily Report</span>
          </p>
          <Strip
            label="Daily Report"
            right={WINDOW - data.reportCount ? `${WINDOW - data.reportCount} em falta` : "sem falhas"}
            cells={data.days.map((d) => ({ date: d.date, state: d.report ? "ok" : "miss" }))}
            okClass="bg-primary"
          />
          <Strip
            label="Profit Sheet"
            right={data.sheetMissing ? `${data.sheetMissing} em falta` : "sem falhas"}
            cells={data.days.map((d) => ({ date: d.date, state: d.sheet ? "ok" : d.sheetPartial ? "partial" : "miss" }))}
            okClass="bg-teal-500"
          />
          <p className="mt-3 text-xs text-muted-foreground">Cada traço é um dia, do mais antigo (esquerda) até ontem. Passa o rato para ver a data.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Consistência</h3>
            <span className="text-xs text-muted-foreground">{WINDOW} dias</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-8">
            <div className="relative size-36">
              <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--muted)" strokeWidth="12" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="#34d399" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(profitPct / 100) * circumference} ${circumference}`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold">{profitPct}%</span>
                <span className="text-xs text-muted-foreground">dias com lucro</span>
              </div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
              <Mini label="Dias com lucro" value={`${data.profitable}`} />
              <Mini label="Dias preenchidos" value={`${data.filled} de ${WINDOW}`} />
              <Mini label="Melhor sequência" value={`${data.best} dias`} />
              <Mini label="Sequência atual" value={`${data.current} dias`} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold">Alertas · últimos 7 dias</h3>
        {data.alerts.length === 0 ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="size-4" /> Está tudo em dia.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {data.alerts.map((a) => (
              <li key={a.date + a.text}>
                <Link href={a.href} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted">
                  <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                  <span className="flex-1">{a.text}</span>
                  <span className="text-muted-foreground">{weekdayShort(a.date)} {dayShort(a.date)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Strip(props: { label: string; right: string; cells: { date: string; state: "ok" | "partial" | "miss" }[]; okClass: string }) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="font-medium">{props.label}</span>
        <span className="text-muted-foreground">{props.right}</span>
      </div>
      <div className="flex gap-1">
        {props.cells.map((c) => (
          <span
            key={c.date}
            title={`${dayShort(c.date)}: ${c.state === "ok" ? "feito" : c.state === "partial" ? "incompleto" : "em falta"}`}
            className={cn("h-4 flex-1 rounded-sm", c.state === "ok" ? props.okClass : c.state === "partial" ? "bg-amber-500/60" : "bg-muted")}
          />
        ))}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
