"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

type Row = { month: string; revenue: number; profit: number };

const metrics = [
  { key: "revenue", label: "Receita líquida" },
  { key: "profit", label: "Lucro" },
] as const;

export function RevenueChart({ data }: { data: Row[] }) {
  const [metric, setMetric] = useState<(typeof metrics)[number]["key"]>("revenue");
  const current = data[data.length - 1]?.[metric] ?? 0;
  const label = metrics.find((m) => m.key === metric)!.label;

  return (
    <Card className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label} · mês atual</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">{formatCurrency(current)}</p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5 text-sm">
          {metrics.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={cn(
                "rounded-md px-3 py-1 text-muted-foreground",
                metric === m.key && "bg-muted font-medium text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickFormatter={(v: number) => formatCurrency(v, { compact: true })}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)" }}
              formatter={(v) => [formatCurrency(Number(v)), label]}
            />
            <Bar dataKey={metric} fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
