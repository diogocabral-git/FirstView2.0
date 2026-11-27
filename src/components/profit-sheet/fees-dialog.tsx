"use client";

import { useState } from "react";
import { CalendarDays, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyFees, type FeePeriod, type FeeSettings } from "@/lib/profit-sheet";
import { dayShort } from "@/lib/dates";

type Props = {
  settings: FeeSettings;
  current: FeePeriod;
  currentFrom: string | null;
  today: string;
  onApply: (next: FeeSettings) => void;
  onCancel: () => void;
};

export function FeesDialog({ settings, current, today, onApply, onCancel }: Props) {
  const [mode, setMode] = useState<"from" | "all">("from");
  const [from, setFrom] = useState(today);
  const [draft, setDraft] = useState<FeePeriod>(current);

  const set = (patch: Partial<FeePeriod>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5 text-sm">
      <div>
        <p className="mb-2 font-medium">A partir de quando?</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <ModeOption
            active={mode === "from"}
            onClick={() => setMode("from")}
            icon={<CalendarDays className="size-4" />}
            title="A partir de um dia"
            text="Mudaste de condições. O que já passou fica como está."
          />
          <ModeOption
            active={mode === "all"}
            onClick={() => setMode("all")}
            icon={<History className="size-4" />}
            title="Corrigir todo o histórico"
            text="Estas sempre foram as taxas certas e estavam mal registadas."
          />
        </div>
      </div>

      {mode === "from" && (
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Primeiro dia</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-48 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
          />
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PctInput label="Meta Agency Fee" hint="Sobre o gasto Meta" value={draft.metaAgencyPct} was={current.metaAgencyPct} onChange={(v) => set({ metaAgencyPct: v })} />
        <PctInput label="Google Agency Fee" hint="Sobre o gasto Google" value={draft.googleAgencyPct} was={current.googleAgencyPct} onChange={(v) => set({ googleAgencyPct: v })} />
        <PctInput label="Taxas de transação" hint="Shopify Payments, PayPal, etc." value={draft.txPct} was={current.txPct} onChange={(v) => set({ txPct: v })} />
        <PctInput label="Cashback do cartão" hint="Devolvido sobre o gasto em anúncios" value={draft.cashbackPct} was={current.cashbackPct} onChange={(v) => set({ cashbackPct: v })} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span className="text-muted-foreground">Cashback sobre:</span>
        {([
          ["both", "Meta e Google"],
          ["meta", "Só Meta"],
          ["google", "Só Google"],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-1.5">
            <input type="radio" name="cashbackOn" checked={draft.cashbackOn === key} onChange={() => set({ cashbackOn: key })} className="accent-[var(--primary)]" />
            {label}
          </label>
        ))}
      </div>

      <p className="rounded-lg bg-muted px-3 py-2 text-muted-foreground">
        {mode === "from"
          ? `Estas taxas valem de ${dayShort(from)} em diante. Tudo o que está antes fica com as taxas que já tinha.`
          : "Estas taxas passam a valer para todo o histórico desta loja."}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => onApply(applyFees(settings, { ...draft, from: mode === "all" ? null : from }))}
          className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground"
        >
          Aplicar
        </button>
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 font-medium hover:bg-muted">
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ModeOption(props: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; text: string }) {
  return (
    <button
      onClick={props.onClick}
      className={cn("rounded-lg border p-3 text-left", props.active ? "border-primary bg-primary/10" : "border-border hover:bg-muted")}
    >
      <span className="flex items-center gap-2 font-medium">
        {props.icon} {props.title}
      </span>
      <span className="mt-1 block text-muted-foreground">{props.text}</span>
    </button>
  );
}

function PctInput(props: { label: string; hint: string; value: number; was: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-medium">{props.label}</span>
      <span className="text-xs text-muted-foreground">{props.hint}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          step={0.1}
          value={props.value}
          onChange={(e) => props.onChange(Number(e.target.value) || 0)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 tabular-nums outline-none focus:border-primary"
        />
        <span className="text-muted-foreground">%</span>
      </div>
      {props.value !== props.was && (
        <span className="text-xs text-muted-foreground">
          <s>{props.was}%</s> → {props.value}%
        </span>
      )}
    </label>
  );
}
