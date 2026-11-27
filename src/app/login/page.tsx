import { Suspense } from "react";
import { Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { signIn } from "./actions";
import { LoginError } from "./login-error";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <Eye className="size-6 text-primary" />
          <span className="text-lg font-semibold">FirstView</span>
        </div>
        {!isSupabaseConfigured && (
          <p className="mb-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Modo demo: configure o Supabase no ficheiro .env.local para ativar o login.
          </p>
        )}
        <form action={signIn} className="space-y-3">
          <input name="email" type="email" required placeholder="Email" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input name="password" type="password" required placeholder="Palavra-passe" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <Suspense>
            <LoginError />
          </Suspense>
          <button disabled={!isSupabaseConfigured} className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            Entrar
          </button>
        </form>
      </Card>
    </div>
  );
}
