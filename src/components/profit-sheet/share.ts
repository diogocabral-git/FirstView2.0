import type { DayInput, FeeSettings } from "@/lib/profit-sheet";

// Enquanto não há base de dados, o link de partilha leva os dados no próprio URL (depois do #,
// por isso nunca são enviados ao servidor). Com o Supabase passará a ser um link com token.

export type SharePayload = { y: number; m: number; days: DayInput[]; fees: FeeSettings; store?: string };

export function encodeShare(p: SharePayload) {
  const json = JSON.stringify(p);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(hash: string): SharePayload | null {
  try {
    const b64 = hash.replace(/^#/, "").replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as SharePayload;
  } catch {
    return null;
  }
}
