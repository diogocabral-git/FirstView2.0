"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Eye, ExternalLink, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMounted, useStore } from "@/lib/store";
import { dayShort, todayInLisbon } from "@/lib/dates";
import { fmtMoney, parseNumber } from "@/components/profit-sheet/format";

type WatchedProduct = { id: string; name: string; url: string; price: number | null };

type Competitor = {
  id: string;
  name: string;
  url: string;
  niche: string;
  country: string;
  notes: string;
  archived: boolean;
  lastChecked: string | null;
  products: WatchedProduct[];
};

const KEY = "fv.v2.competitors";
const empty = (): Competitor[] => [];
const uid = () => Math.random().toString(36).slice(2, 10);

function domainOf(url: string) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const href = (url: string) => (url.startsWith("http") ? url : `https://${url}`);
const adLibrary = (q: string) =>
  `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&search_type=keyword_unordered&q=${encodeURIComponent(q)}`;

export function Competitors() {
  const mounted = useMounted();
  if (!mounted) return <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />;
  return <Inner />;
}

function Inner() {
  const [today] = useState(todayInLisbon);
  const [list, setList] = useStore<Competitor[]>(KEY, empty);
  const [editing, setEditing] = useState<Competitor | "new" | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");

  const update = (id: string, patch: Partial<Competitor>) => setList((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const visible = list
    .filter((c) => c.archived === showArchived)
    .filter((c) => !query || `${c.name} ${c.url} ${c.niche} ${c.country}`.toLowerCase().includes(query.toLowerCase()));
  const activeCount = list.filter((c) => !c.archived).length;
  const stale = list.filter((c) => !c.archived && (!c.lastChecked || c.lastChecked < new Date(Date.parse(today) - 7 * 864e5).toISOString().slice(0, 10))).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Concorrentes</h1>
          <p className="text-muted-foreground">As lojas que acompanhas, os produtos delas e os anúncios na Meta Ad Library.</p>
        </div>
        <button onClick={() => setEditing("new")} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="size-4" /> Novo concorrente
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-border bg-card p-0.5 text-sm">
          <button onClick={() => setShowArchived(false)} className={cn("rounded-md px-3 py-1.5", !showArchived ? "bg-muted font-medium" : "text-muted-foreground")}>A seguir ({activeCount})</button>
          <button onClick={() => setShowArchived(true)} className={cn("rounded-md px-3 py-1.5", showArchived ? "bg-muted font-medium" : "text-muted-foreground")}>Arquivados ({list.length - activeCount})</button>
        </div>
        <div className="flex items-center gap-3">
          {stale > 0 && !showArchived && <span className="text-sm text-amber-400">{stale} por ver há mais de 7 dias</span>}
          <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar" className="w-40 bg-transparent outline-none" />
          </label>
        </div>
      </div>

      {editing && (
        <CompetitorForm
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={(c) => {
            setList((prev) => (prev.some((p) => p.id === c.id) ? prev.map((p) => (p.id === c.id ? c : p)) : [...prev, c]));
            setEditing(null);
          }}
        />
      )}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
          {showArchived ? "Nenhum concorrente arquivado." : (
            <>Ainda não estás a seguir nenhuma loja. <button onClick={() => setEditing("new")} className="text-primary hover:underline">Adicionar concorrente</button></>
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {visible.map((c) => (
            <CompetitorCard
              key={c.id}
              c={c}
              today={today}
              onEdit={() => setEditing(c)}
              onDelete={() => setList((prev) => prev.filter((p) => p.id !== c.id))}
              onUpdate={(patch) => update(c.id, patch)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CompetitorCard({ c, today, onEdit, onDelete, onUpdate }: {
  c: Competitor;
  today: string;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<Competitor>) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [p, setP] = useState({ name: "", url: "", price: "" });
  const domain = domainOf(c.url);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt="" className="size-9 rounded-lg bg-muted" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{c.name}</p>
            <a href={href(c.url)} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate text-sm text-muted-foreground hover:text-primary">
              {domain} <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button aria-label="Editar" onClick={onEdit} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-4" /></button>
          <button aria-label={c.archived ? "Voltar a seguir" : "Arquivar"} onClick={() => onUpdate({ archived: !c.archived })} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            {c.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
          </button>
          <button aria-label="Apagar" onClick={onDelete} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-red-400"><Trash2 className="size-4" /></button>
        </div>
      </div>

      <div className="space-y-3 p-4 text-sm">
        <div className="flex flex-wrap gap-2">
          {c.niche && <span className="rounded bg-muted px-2 py-0.5 text-xs">{c.niche}</span>}
          {c.country && <span className="rounded bg-muted px-2 py-0.5 text-xs">{c.country}</span>}
          <span className={cn("rounded px-2 py-0.5 text-xs", c.lastChecked === today ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground")}>
            {c.lastChecked ? `Visto ${c.lastChecked === today ? "hoje" : `a ${dayShort(c.lastChecked)}`}` : "Nunca visto"}
          </span>
        </div>
        {c.notes && <p className="whitespace-pre-wrap text-muted-foreground">{c.notes}</p>}
        <div className="flex flex-wrap gap-2">
          <a href={adLibrary(domain)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 hover:bg-muted">
            Anúncios na Meta <ExternalLink className="size-3" />
          </a>
          <a href={`${href(c.url).replace(/\/$/, "")}/collections/all?sort_by=best-selling`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 hover:bg-muted" title="Funciona em lojas Shopify">
            Mais vendidos <ExternalLink className="size-3" />
          </a>
          <button onClick={() => onUpdate({ lastChecked: today })} className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 hover:bg-muted">
            <Eye className="size-3.5" /> Marcar como visto
          </button>
        </div>
      </div>

      <div className="mt-auto border-t border-border">
        <p className="px-4 pt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Produtos a seguir</p>
        <ul className="divide-y divide-border text-sm">
          {c.products.map((prod) => (
            <li key={prod.id} className="group flex items-center justify-between gap-2 px-4 py-2">
              <a href={href(prod.url)} target="_blank" rel="noreferrer" className="truncate hover:text-primary">{prod.name || prod.url}</a>
              <span className="flex shrink-0 items-center gap-2 tabular-nums text-muted-foreground">
                {prod.price !== null && fmtMoney(prod.price)}
                <button aria-label="Remover produto" onClick={() => onUpdate({ products: c.products.filter((x) => x.id !== prod.id) })} className="invisible hover:text-red-400 group-hover:visible"><X className="size-3.5" /></button>
              </span>
            </li>
          ))}
        </ul>
        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!p.url.trim()) return;
              onUpdate({ products: [...c.products, { id: uid(), name: p.name.trim(), url: p.url.trim(), price: parseNumber(p.price) }] });
              setP({ name: "", url: "", price: "" });
              setAdding(false);
            }}
            className="grid gap-2 p-3 sm:grid-cols-[1fr_1fr_90px_auto]"
          >
            <input autoFocus placeholder="Nome" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} className={inputCls} />
            <input placeholder="Link *" value={p.url} onChange={(e) => setP({ ...p, url: e.target.value })} className={inputCls} />
            <input placeholder="Preço €" inputMode="decimal" value={p.price} onChange={(e) => setP({ ...p, price: e.target.value })} className={inputCls} />
            <div className="flex gap-1">
              <button className="rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">OK</button>
              <button type="button" onClick={() => setAdding(false)} className="rounded-lg px-2 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
            </div>
          </form>
        ) : (
          <button onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-1.5 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <Plus className="size-3.5" /> Adicionar produto
          </button>
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function CompetitorForm({ initial, onSave, onCancel }: { initial: Competitor | null; onSave: (c: Competitor) => void; onCancel: () => void }) {
  const [v, setV] = useState({
    name: initial?.name ?? "",
    url: initial?.url ?? "",
    niche: initial?.niche ?? "",
    country: initial?.country ?? "",
    notes: initial?.notes ?? "",
  });
  const valid = v.name.trim() && v.url.trim();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSave({
          id: initial?.id ?? uid(),
          archived: initial?.archived ?? false,
          lastChecked: initial?.lastChecked ?? null,
          products: initial?.products ?? [],
          name: v.name.trim(),
          url: v.url.trim(),
          niche: v.niche.trim(),
          country: v.country.trim(),
          notes: v.notes.trim(),
        });
      }}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <h3 className="font-semibold">{initial ? "Editar concorrente" : "Novo concorrente"}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm"><span className="text-muted-foreground">Nome *</span><input autoFocus value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inputCls} /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="text-muted-foreground">Site *</span><input value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} placeholder="loja.com" className={inputCls} /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="text-muted-foreground">Nicho</span><input value={v.niche} onChange={(e) => setV({ ...v, niche: e.target.value })} placeholder="Ex.: vestidos" className={inputCls} /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="text-muted-foreground">País</span><input value={v.country} onChange={(e) => setV({ ...v, country: e.target.value })} placeholder="Ex.: Alemanha" className={inputCls} /></label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-4"><span className="text-muted-foreground">Notas</span><textarea rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} placeholder="Ofertas, ângulos de anúncio, preços…" className={inputCls} /></label>
      </div>
      <div className="flex gap-2">
        <button disabled={!valid} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Guardar</button>
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
      </div>
    </form>
  );
}
