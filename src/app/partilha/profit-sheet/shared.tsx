"use client";

import { useSyncExternalStore } from "react";
import { ProfitSheet } from "@/components/profit-sheet/profit-sheet";
import { decodeShare, type SharePayload } from "@/components/profit-sheet/share";

let cached: { hash: string; payload: SharePayload | null } | null = null;
function readHash() {
  const hash = location.hash;
  if (!cached || cached.hash !== hash) cached = { hash, payload: decodeShare(hash) };
  return cached.payload;
}
const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export function SharedProfitSheet() {
  const payload = useSyncExternalStore(subscribe, readHash, () => undefined);
  if (payload === undefined) return null;
  if (payload === null) return <p className="text-muted-foreground">Este link de partilha não é válido.</p>;
  return <ProfitSheet shared={payload} />;
}
