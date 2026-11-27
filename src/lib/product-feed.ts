// Product Feed para Google Merchant Center e catálogo da Meta.

export type Availability = "in stock" | "out of stock" | "preorder";

export type FeedProduct = {
  id: string; // SKU / id único no feed
  itemGroupId: string; // agrupa variantes do mesmo produto (handle da Shopify)
  title: string;
  description: string;
  link: string;
  imageLink: string;
  price: number | null;
  salePrice: number | null;
  availability: Availability;
  brand: string;
  gtin: string;
  mpn: string;
  googleCategory: string;
  productType: string;
  condition: "new" | "refurbished" | "used";
  color: string;
  size: string;
  gender: "" | "male" | "female" | "unisex";
  ageGroup: "" | "adult" | "kids";
  google: boolean;
  meta: boolean;
};

export type FeedSettings = { storeUrl: string; currency: string; defaultBrand: string };

export const FEED_KEY = "fv.v2.feed";
export const FEED_SETTINGS_KEY = "fv.v2.feed.settings";
export const defaultFeedSettings: FeedSettings = { storeUrl: "", currency: "EUR", defaultBrand: "" };

export function blankProduct(id: string, s: FeedSettings): FeedProduct {
  return {
    id, itemGroupId: "", title: "", description: "", link: "", imageLink: "", price: null, salePrice: null, availability: "in stock",
    brand: s.defaultBrand, gtin: "", mpn: "", googleCategory: "", productType: "", condition: "new",
    color: "", size: "", gender: "", ageGroup: "", google: true, meta: true,
  };
}

export type Issue = { field: keyof FeedProduct; text: string; severity: "error" | "warning" };

export function validate(p: FeedProduct): Issue[] {
  const out: Issue[] = [];
  const req = (field: keyof FeedProduct, text: string) => {
    if (!String(p[field] ?? "").trim()) out.push({ field, text, severity: "error" });
  };
  req("id", "Falta o ID / SKU");
  req("title", "Falta o título");
  req("description", "Falta a descrição");
  req("link", "Falta o link do produto");
  req("imageLink", "Falta a imagem");
  if (p.price === null || p.price <= 0) out.push({ field: "price", text: "Falta o preço", severity: "error" });
  if (p.title.length > 150) out.push({ field: "title", text: "Título com mais de 150 caracteres", severity: "error" });
  if (p.salePrice !== null && p.price !== null && p.salePrice >= p.price) out.push({ field: "salePrice", text: "Preço promocional não é inferior ao preço", severity: "error" });
  if (p.link && !/^https?:\/\//.test(p.link)) out.push({ field: "link", text: "O link tem de começar por https://", severity: "error" });
  if (p.imageLink && !/^https?:\/\//.test(p.imageLink)) out.push({ field: "imageLink", text: "A imagem tem de ser um link https://", severity: "error" });
  if (!p.brand.trim() && !p.gtin.trim() && !p.mpn.trim()) out.push({ field: "brand", text: "Indica a marca, o GTIN ou o MPN", severity: "error" });
  if (!p.gtin.trim()) out.push({ field: "gtin", text: "Sem GTIN (recomendado pela Google)", severity: "warning" });
  if (!p.googleCategory.trim()) out.push({ field: "googleCategory", text: "Sem categoria Google (recomendado)", severity: "warning" });
  if (p.description.length > 0 && p.description.length < 50) out.push({ field: "description", text: "Descrição muito curta", severity: "warning" });
  return out;
}

const csvCell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const money = (v: number | null, currency: string) => (v === null ? "" : `${v.toFixed(2)} ${currency}`);

export function toCsv(products: FeedProduct[], channel: "google" | "meta", s: FeedSettings) {
  const rows = products.filter((p) => p[channel] && validate(p).every((i) => i.severity !== "error"));
  const header =
    channel === "google"
      ? ["id", "item_group_id", "title", "description", "link", "image_link", "availability", "price", "sale_price", "brand", "gtin", "mpn", "condition", "google_product_category", "product_type", "color", "size", "gender", "age_group"]
      : ["id", "item_group_id", "title", "description", "availability", "condition", "price", "sale_price", "link", "image_link", "brand", "gtin", "mpn", "google_product_category", "color", "size", "gender", "age_group"];
  const get = (p: FeedProduct, col: string): string | number | null => {
    switch (col) {
      case "image_link": return p.imageLink;
      case "item_group_id": return p.itemGroupId;
      case "price": return money(p.price, s.currency);
      case "sale_price": return money(p.salePrice, s.currency);
      case "google_product_category": return p.googleCategory;
      case "product_type": return p.productType;
      case "age_group": return p.ageGroup;
      default: return (p as unknown as Record<string, string>)[col] ?? "";
    }
  };
  return [header.join(","), ...rows.map((p) => header.map((h) => csvCell(get(p, h))).join(","))].join("\n");
}

/** Parser de CSV simples (aspas, vírgulas e quebras de linha dentro de aspas). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** Importa o CSV de exportação de produtos da Shopify (Produtos > Exportar). Uma linha por variante. */
export function fromShopifyCsv(text: string, s: FeedSettings): FeedProduct[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const idx = {
    handle: col("Handle"), title: col("Title"), body: col("Body (HTML)"), vendor: col("Vendor"), type: col("Type"),
    sku: col("Variant SKU"), price: col("Variant Price"), compare: col("Variant Compare At Price"), barcode: col("Variant Barcode"),
    image: col("Image Src"), variantImage: col("Variant Image"), opt1: col("Option1 Value"), opt2: col("Option2 Value"),
    status: col("Status"), qty: col("Variant Inventory Qty"),
  };
  if (idx.handle < 0) throw new Error("Este ficheiro não parece uma exportação de produtos da Shopify (falta a coluna Handle).");
  const base = s.storeUrl.replace(/\/$/, "");
  const byHandle = new Map<string, { title: string; body: string; vendor: string; type: string; image: string }>();
  const out: FeedProduct[] = [];
  rows.forEach((r, i) => {
    const handle = r[idx.handle];
    if (!handle) return;
    const parent = byHandle.get(handle) ?? { title: r[idx.title] ?? "", body: r[idx.body] ?? "", vendor: r[idx.vendor] ?? "", type: r[idx.type] ?? "", image: r[idx.image] ?? "" };
    if (!byHandle.has(handle)) byHandle.set(handle, parent);
    if (idx.status >= 0 && r[idx.status] && r[idx.status].toLowerCase() !== "active") return;
    const priceRaw = r[idx.price];
    if (!priceRaw) return; // linhas só de imagem
    const price = Number(priceRaw);
    const compare = Number(r[idx.compare] || 0);
    const variant = [r[idx.opt1], r[idx.opt2]].filter((v) => v && v !== "Default Title");
    const qty = idx.qty >= 0 ? Number(r[idx.qty] || 0) : 1;
    out.push({
      ...blankProduct(r[idx.sku] || `${handle}-${i}`, s),
      itemGroupId: handle,
      title: [parent.title, ...variant].join(" - ").slice(0, 150),
      description: stripHtml(parent.body).slice(0, 5000),
      link: base ? `${base}/products/${handle}` : "",
      imageLink: r[idx.variantImage] || parent.image,
      price: compare > price ? compare : price,
      salePrice: compare > price ? price : null,
      availability: qty > 0 ? "in stock" : "out of stock",
      brand: parent.vendor || s.defaultBrand,
      gtin: r[idx.barcode] ?? "",
      productType: parent.type,
    });
  });
  return out;
}
