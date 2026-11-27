"use client";

import { useSearchParams } from "next/navigation";

export function LoginError() {
  const error = useSearchParams().get("error");
  if (!error) return null;
  return <p className="text-sm text-red-400">Email ou palavra-passe incorretos.</p>;
}
