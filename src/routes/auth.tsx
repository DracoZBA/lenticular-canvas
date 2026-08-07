import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cpu, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso organizadores · Lenticular Events" },
      {
        name: "description",
        content:
          "Entra o crea tu cuenta de organizador para diseñar los estilos de foto lenticular de tus eventos.",
      },
      { property: "og:title", content: "Acceso organizadores · Lenticular Events" },
      {
        property: "og:description",
        content: "Gestiona eventos, estilos de foto y entregas desde una sola cuenta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { modo?: "registro" | "entrar" } => ({
    modo: search['modo'] === "registro" ? "registro" : "entrar",
  }),


  component: AuthPage,
});

function AuthPage() {
  const { modo } = Route.useSearch();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(modo === "registro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/eventos", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/eventos", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Te enviamos un correo para confirmar tu cuenta.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos completar el acceso.");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error("No pudimos iniciar sesión con Google.");
    }
    // Si no hay error, Supabase redirige automáticamente a Google.
  };

  return (
    <div className="grid min-h-screen place-items-center px-5 py-12">
      <div className="panel w-full max-w-md p-8">
        <span className="grid h-11 w-11 place-items-center rounded-xl [background-image:var(--gradient-neon)] text-neon-foreground">
          <Cpu className="h-5 w-5" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">
          {isSignUp ? "Crea tu cuenta" : "Entra a tus eventos"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignUp
            ? "Configura los estilos de foto antes de cada evento."
            : "Accede para gestionar eventos y el modo evento."}
        </p>

        {sent ? (
          <div className="mt-7 space-y-4 rounded-xl border border-border bg-surface/60 p-5 text-center">
            <Mail className="mx-auto h-6 w-6 text-primary" />
            <p className="text-sm">
              Revisa <span className="font-medium">{email}</span> y confirma tu cuenta para entrar.
            </p>
            <Button variant="subtle" onClick={() => setSent(false)}>
              Volver
            </Button>
          </div>
        ) : (
          <>
            <Button variant="subtle" className="mt-7 w-full" onClick={google}>
              Continuar con Google
            </Button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> o con tu correo{" "}
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name">Tu nombre</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ana Pérez"
                    autoComplete="name"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
              </div>
              <Button type="submit" variant="neon" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSignUp ? "Crear cuenta" : "Entrar"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => setIsSignUp((v) => !v)}
              className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground"
            >
              {isSignUp ? "Ya tengo cuenta · Entrar" : "No tengo cuenta · Crear una"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
