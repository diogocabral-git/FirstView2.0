"use client";

import { useSyncExternalStore } from "react";

function greetingFor(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 20) return "Boa tarde";
  return "Boa noite";
}

// Calculado no browser, com a hora local do utilizador.
export function Greeting() {
  const text = useSyncExternalStore(
    () => () => {},
    () => greetingFor(new Date().getHours()),
    () => "Olá",
  );
  return <h1 className="text-3xl font-semibold">{text} 👋</h1>;
}
