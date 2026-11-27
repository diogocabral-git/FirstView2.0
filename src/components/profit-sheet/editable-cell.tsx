"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { fmtNum, parseNumber } from "./format";

export type Source = "shopify" | "meta" | "google" | "manual";

const sourceStyle: Record<Source, { label: string; className: string }> = {
  shopify: { label: "S", className: "bg-emerald-500/20 text-emerald-400" },
  meta: { label: "M", className: "bg-blue-500/20 text-blue-400" },
  google: { label: "G", className: "bg-amber-500/20 text-amber-400" },
  manual: { label: "", className: "" },
};

const sourceTitle: Record<Source, string> = {
  shopify: "Vem da Shopify (pode ser corrigido à mão)",
  meta: "Vem da Meta Ads (pode ser corrigido à mão)",
  google: "Vem da Google Ads (pode ser corrigido à mão)",
  manual: "Preenchido à mão",
};

type Props = {
  value: number | null;
  onChange: (v: number | null) => void;
  source?: Source;
  disabled?: boolean;
  label: string;
};

/** Célula com "€" que se pode editar. Grava ao sair do campo ou ao carregar Enter. */
export function EditableCell({ value, onChange, source = "manual", disabled, label }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const missing = value === null && !disabled;
  const src = sourceStyle[source];

  function commit() {
    if (draft === null) return;
    const parsed = parseNumber(draft);
    if (parsed !== value) onChange(parsed);
    setDraft(null);
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {source !== "manual" && (
        <span
          title={sourceTitle[source]}
          className={cn("flex size-4 shrink-0 items-center justify-center rounded text-[9px] font-bold", src.className)}
        >
          {src.label}
        </span>
      )}
      <input
        aria-label={label}
        inputMode="decimal"
        disabled={disabled}
        value={draft ?? fmtNum(value)}
        placeholder={disabled ? "" : "—"}
        onFocus={(e) => {
          setDraft(fmtNum(value));
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(null);
            e.currentTarget.blur();
          }
        }}
        className={cn(
          "w-20 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-right tabular-nums outline-none",
          "hover:border-border focus:border-primary focus:bg-background",
          missing && "border-amber-500/40 bg-amber-500/10 placeholder:text-amber-400",
          disabled && "text-muted-foreground/50",
        )}
      />
      <span className="text-xs text-muted-foreground">€</span>
    </div>
  );
}
