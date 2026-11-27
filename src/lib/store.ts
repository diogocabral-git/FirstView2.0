"use client";

// Armazenamento de demonstração no browser (localStorage), partilhado entre páginas.
// Quando o Supabase estiver ligado, estas funções passam a ler/gravar na base de dados.

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => {
    cache.clear();
    tick++;
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function readStore<T>(key: string, fallback: () => T): T {
  const raw = localStorage.getItem(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T;
  try {
    value = raw === null ? fallback() : (JSON.parse(raw) as T);
  } catch {
    value = fallback();
  }
  cache.set(key, { raw, value });
  return value;
}

export function writeStore<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  cache.delete(key);
  listeners.forEach((l) => l());
}

const serverCache = new Map<string, unknown>();

export function useStore<T>(key: string, fallback: () => T) {
  const value = useSyncExternalStore(
    subscribe,
    () => readStore(key, fallback),
    () => {
      if (!serverCache.has(key)) serverCache.set(key, fallback());
      return serverCache.get(key) as T;
    },
  );
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = readStore(key, fallback);
      writeStore(key, typeof next === "function" ? (next as (p: T) => T)(prev) : next);
    },
    [key, fallback],
  );
  return [value, set] as const;
}

let tick = 0;
listeners.add(() => {
  tick++;
});

/** Número que muda sempre que algum valor guardado muda: usar como dependência de useMemo
 *  em páginas que leem várias chaves com readStore. */
export function useStoreTick() {
  return useSyncExternalStore(subscribe, () => tick, () => 0);
}

const noop = () => () => {};
/** true só no browser, depois da hidratação. */
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}
