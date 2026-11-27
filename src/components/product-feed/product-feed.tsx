"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, ImageOff, Pencil, Plus, Search, Settings2, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMounted, useStore } from "@/lib/store";
import {
  blankProduct, defaultFeedSettings, FEED_KEY, FEED_SETTINGS_KEY, fromShopifyCsv, toCsv, validate,
  type FeedProduct, type FeedSettings,
} from "@/lib/product-feed";
import { fmtMoney, parseNumber } from "@/components/profit-sheet/format";

const emptyList = (): FeedProduct[] => [];
const settingsFallback = () => defaultFeedSettings;

export function ProductFeed() {
  const mounted = useMounted();
  if (!mounted) return <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />;
  return <Inner />;
}

function download(name: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Inner() {
  const [products, setProducts] = useStore<FeedProduct[]>(FEED_KEY, emptyList);
  const [settings, setSettings] = useStore<FeedSettings>(FEED_SETTINGS_KEY, settingsFallback);
  const [editing, setEditing] = useState<FeedProduct | "new" | null>(null);
  const [filter, setFilter] = useState<"all" | "errors" | "ok">("all");
  const [query, setQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const withIssues = products.map((p) => ({ p, issues: validate(p) }));
  const errorCount = withIssues.filter((x) => x.issues.some((i) => i.severity === "error")).length;
  const okCount = products.length - errorCount;
  const health = products.length ? Math.round((okCount / products.length) * 100) : 0;
  const googleCount = withIssues.filter((x) => x.p.google && !x.issues.some((i) => i.severity === "error")).length;
  const metaCount = withIssues.filter((x) => x.p.meta && !x.issues.some((i) => i.severity === "error")).length;

  const visible = withIssues
    .filter((x) => filter === "all" || (filter === "errors" ? x.issues.some((i) => i.severity === "error") : !x.issues.some((i) => i.severity === "error")))
    .filter((x) => !query || `${x.p.id} ${x.p.title} ${x.p.brand}`.toLowerCase().includes(query.toLowerCase()));

  async function importFile(file: File) {
    try {
      const imported = fromShopifyCsv(await file.text(), settings);
      if (!imported.length) throw new Error("Não encontrei produtos ativos com preço neste ficheiro.");
      setProducts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        imported.forEach((p) => map.set(p.id, { ...map.get(p.id), ...p }));
        return [...map.values()];
      });
      setMessage({ tone: "ok", text: `${imported.length} produtos importados.${settings.storeUrl ? "" : " Define o domínio da loja nas definições para criar os links."}` });
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : "Não foi possível ler o ficheiro." });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Product Feed</h1>
          <p className="text-muted-foreground">Os produtos que vão para o Google Merchant Center e para o catálogo da Meta.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowSettings((v) => !v)} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
            <Settings2 className="size-4" /> Definições
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
            <Upload className="size-4" /> Importar CSV da Shopify
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
              e.target.value = "";
            }}
          />
          <button onClick={() => setEditing("new")} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
            <Plus className="size-4" /> Produto
          </button>
        </div>
      </div>

      {message && (
        <div className={cn("flex items-center justify-between rounded-xl border p-3 text-sm", message.tone === "ok" ? "border-emerald-500/40 bg-emerald-500/10" : "border-red-500/40 bg-red-500/10")}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-muted-foreground hover:text-foreground">Fechar</button>
        </div>
      )}

      {showSettings && (
        <div className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Domínio da loja</span>
            <input value={settings.storeUrl} onChange={(e) => setSettings({ ...settings, storeUrl: e.target.value.trim() })} placeholder="https://aminhaloja.com" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Moeda</span>
            <select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} className={inputCls}>
              {["EUR", "USD", "GBP", "CHF", "BRL"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Marca por defeito</span>
            <input value={settings.defaultBrand} onChange={(e) => setSettings({ ...settings, defaultBrand: e.target.value })} placeholder="Nome da marca" className={inputCls} />
          </label>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Produtos" value={String(products.length)} sub={`${okCount} prontos · ${errorCount} com erros`} />
        <Stat label="Saúde do feed" value={products.length ? `${health}%` : "—"} sub="produtos sem erros" tone={products.length && health < 80 ? "warning" : undefined} />
        <FeedCard label="Google Merchant Center" count={googleCount} onDownload={() => download("feed-google.csv", toCsv(products, "google", settings))} />
        <FeedCard label="Catálogo da Meta" count={metaCount} onDownload={() => download("feed-meta.csv", toCsv(products, "meta", settings))} />
      </section>

      {editing && (
        <ProductForm
          initial={editing === "new" ? blankProduct("", settings) : editing}
          isNew={editing === "new"}
          existingIds={products.map((p) => p.id)}
          onCancel={() => setEditing(null)}
          onSave={(p, originalId) => {
            setProducts((prev) => (originalId ? prev.map((x) => (x.id === originalId ? p : x)) : [...prev, p]));
            setEditing(null);
          }}
        />
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <div className="flex gap-1 text-sm">
            {([
              ["all", `Todos (${products.length})`],
              ["errors", `Com erros (${errorCount})`],
              ["ok", `Prontos (${okCount})`],
            ] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={cn("rounded-md px-2.5 py-1", filter === k ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}>{l}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm">
            <Search className="size-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Procurar" className="w-40 bg-transparent outline-none" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left font-medium">Produto</th>
                <th className="px-4 py-2.5 text-left font-medium">ID / SKU</th>
                <th className="px-4 py-2.5 text-right font-medium">Preço</th>
                <th className="px-4 py-2.5 text-left font-medium">Stock</th>
                <th className="px-4 py-2.5 text-center font-medium">Google</th>
                <th className="px-4 py-2.5 text-center font-medium">Meta</th>
                <th className="px-4 py-2.5 text-left font-medium">Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    {products.length ? "Nenhum produto com este filtro." : (
                      <>Ainda não há produtos. <button onClick={() => fileRef.current?.click()} className="text-primary hover:underline">Importa o CSV da Shopify</button> ou <button onClick={() => setEditing("new")} className="text-primary hover:underline">adiciona um à mão</button>.</>
                    )}
                  </td>
                </tr>
              )}
              {visible.map(({ p, issues }) => {
                const errors = issues.filter((i) => i.severity === "error");
                const warnings = issues.filter((i) => i.severity === "warning");
                const toggle = (ch: "google" | "meta") => setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, [ch]: !x[ch] } : x)));
                return (
                  <tr key={p.id} className="group border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        {p.imageLink ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageLink} alt="" className="size-10 shrink-0 rounded-md bg-muted object-cover" />
                        ) : (
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted"><ImageOff className="size-4 text-muted-foreground" /></span>
                        )}
                        <span className="line-clamp-2 max-w-md">{p.title || <span className="text-muted-foreground">Sem título</span>}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{p.id}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {p.salePrice !== null ? (
                        <><span className="text-emerald-400">{fmtMoney(p.salePrice)}</span> <s className="text-muted-foreground">{fmtMoney(p.price)}</s></>
                      ) : fmtMoney(p.price)}
                    </td>
                    <td className="px-4 py-2">{p.availability === "in stock" ? "Em stock" : p.availability === "preorder" ? "Pré-venda" : <span className="text-red-400">Esgotado</span>}</td>
                    <td className="px-4 py-2 text-center"><input type="checkbox" checked={p.google} onChange={() => toggle("google")} aria-label="Enviar para a Google" className="accent-[var(--primary)]" /></td>
                    <td className="px-4 py-2 text-center"><input type="checkbox" checked={p.meta} onChange={() => toggle("meta")} aria-label="Enviar para a Meta" className="accent-[var(--primary)]" /></td>
                    <td className="px-4 py-2" title={issues.map((i) => i.text).join("\n")}>
                      {errors.length ? (
                        <span className="flex items-center gap-1.5 text-red-400"><AlertCircle className="size-4" /> {errors[0].text}{errors.length > 1 && ` +${errors.length - 1}`}</span>
                      ) : warnings.length ? (
                        <span className="flex items-center gap-1.5 text-amber-400"><CheckCircle2 className="size-4" /> Pronto · {warnings.length} aviso{warnings.length > 1 ? "s" : ""}</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 className="size-4" /> Pronto</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <span className="invisible inline-flex gap-1 group-hover:visible">
                        <button aria-label="Editar" onClick={() => setEditing(p)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-4" /></button>
                        <button aria-label="Apagar" onClick={() => setProducts((prev) => prev.filter((x) => x.id !== p.id))} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-400"><Trash2 className="size-4" /></button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Os ficheiros exportados só incluem produtos sem erros. Na Google: Merchant Center, Produtos, Fontes de dados, adicionar ficheiro. Na Meta: Commerce Manager, Catálogo, Fontes de dados, carregar ficheiro.
      </p>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "warning" }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", tone && "border-amber-500/40")}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone && "text-amber-400")}>{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function FeedCard({ label, count, onDownload }: { label: string; count: number; onDownload: () => void }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{count} <span className="text-sm font-normal text-muted-foreground">produtos no feed</span></p>
      </div>
      <button disabled={!count} onClick={onDownload} className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50">
        <Download className="size-4" /> Exportar CSV
      </button>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function ProductForm({ initial, isNew, existingIds, onSave, onCancel }: {
  initial: FeedProduct;
  isNew: boolean;
  existingIds: string[];
  onSave: (p: FeedProduct, originalId: string | null) => void;
  onCancel: () => void;
}) {
  const [p, setP] = useState<FeedProduct>(initial);
  const [price, setPrice] = useState(initial.price === null ? "" : String(initial.price).replace(".", ","));
  const [sale, setSale] = useState(initial.salePrice === null ? "" : String(initial.salePrice).replace(".", ","));
  const set = <K extends keyof FeedProduct>(k: K, v: FeedProduct[K]) => setP((x) => ({ ...x, [k]: v }));
  const final = { ...p, price: parseNumber(price), salePrice: parseNumber(sale) };
  const issues = validate(final);
  const duplicate = p.id.trim() !== initial.id && existingIds.includes(p.id.trim());
  const canSave = p.id.trim() && !duplicate;

  const text = (k: keyof FeedProduct, label: string, placeholder = "", wide = false) => (
    <label className={cn("flex flex-col gap-1 text-sm", wide && "sm:col-span-2")}>
      <span className="text-muted-foreground">{label}</span>
      <input value={String(p[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} placeholder={placeholder} className={cn(inputCls, issues.some((i) => i.field === k && i.severity === "error") && "border-red-500/60")} />
    </label>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) onSave({ ...final, id: p.id.trim() }, isNew ? null : initial.id);
      }}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <h3 className="font-semibold">{isNew ? "Novo produto" : "Editar produto"}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {text("id", "ID / SKU *")}
        {text("title", "Título *", "", true)}
        {text("brand", "Marca")}
        <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-4">
          <span className="text-muted-foreground">Descrição *</span>
          <textarea rows={3} value={p.description} onChange={(e) => set("description", e.target.value)} className={inputCls} />
        </label>
        {text("link", "Link do produto *", "https://", true)}
        {text("imageLink", "Link da imagem *", "https://", true)}
        <label className="flex flex-col gap-1 text-sm"><span className="text-muted-foreground">Preço *</span><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="text-muted-foreground">Preço promocional</span><input inputMode="decimal" value={sale} onChange={(e) => setSale(e.target.value)} className={inputCls} /></label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Disponibilidade</span>
          <select value={p.availability} onChange={(e) => set("availability", e.target.value as FeedProduct["availability"])} className={inputCls}>
            <option value="in stock">Em stock</option><option value="out of stock">Esgotado</option><option value="preorder">Pré-venda</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Condição</span>
          <select value={p.condition} onChange={(e) => set("condition", e.target.value as FeedProduct["condition"])} className={inputCls}>
            <option value="new">Novo</option><option value="refurbished">Recondicionado</option><option value="used">Usado</option>
          </select>
        </label>
        {text("gtin", "GTIN (código de barras)")}
        {text("mpn", "MPN")}
        {text("googleCategory", "Categoria Google", "Ex.: 2271 ou Apparel & Accessories > Clothing > Dresses", true)}
        {text("productType", "Tipo de produto")}
        {text("color", "Cor")}
        {text("size", "Tamanho")}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Género</span>
          <select value={p.gender} onChange={(e) => set("gender", e.target.value as FeedProduct["gender"])} className={inputCls}>
            <option value="">—</option><option value="female">Mulher</option><option value="male">Homem</option><option value="unisex">Unissexo</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Idade</span>
          <select value={p.ageGroup} onChange={(e) => set("ageGroup", e.target.value as FeedProduct["ageGroup"])} className={inputCls}>
            <option value="">—</option><option value="adult">Adulto</option><option value="kids">Criança</option>
          </select>
        </label>
      </div>
      {(issues.length > 0 || duplicate) && (
        <ul className="space-y-1 text-sm">
          {duplicate && <li className="text-red-400">Já existe um produto com este ID.</li>}
          {issues.map((i) => <li key={i.field + i.text} className={i.severity === "error" ? "text-red-400" : "text-amber-400"}>{i.text}</li>)}
        </ul>
      )}
      <div className="flex gap-2">
        <button disabled={!canSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Guardar</button>
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
        <span className="self-center text-xs text-muted-foreground">Podes guardar com erros e corrigir depois. Só os produtos sem erros vão para os ficheiros.</span>
      </div>
    </form>
  );
}
