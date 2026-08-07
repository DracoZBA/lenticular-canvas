import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Cpu, Layers, Repeat2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fotos Lenticulares 3D y Flip para Eventos" },
      {
        name: "description",
        content:
          "Diseña estilos de foto lenticular para tus eventos y el día del evento captura, genera e imprime o envía la foto al invitado en segundos.",
      },
      { property: "og:title", content: "Fotos Lenticulares 3D y Flip para Eventos" },
      {
        property: "og:description",
        content:
          "Configura marcos, tamaño, LPI y DPI por evento. El día del evento: una foto, efecto 3D o flip con IA, e impresión o envío inmediato.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl [background-image:var(--gradient-neon)] text-neon-foreground">
            <Cpu className="h-5 w-5" />
          </span>
          <p className="text-base font-semibold">
            Lenticular <span className="text-gradient-neon">Events</span>
          </p>
          <div className="ml-auto flex gap-2">
            <Button variant="subtle" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button variant="neon" asChild>
              <Link to="/auth" search={{ modo: "registro" }}>
                Crear cuenta
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        <section className="py-20 text-center">
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
            Impulsado por IA
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-6xl">
            Fotos lenticulares <span className="text-gradient-neon">3D y Flip</span> para tus eventos
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Prepara los estilos antes del evento. El día del evento solo hay que tomar una foto y
            elegir cómo entregarla: imprimir, correo, WhatsApp o código QR.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="neon" size="lg" asChild>
              <Link to="/auth">Empezar gratis</Link>
            </Button>
            <Button variant="subtle" size="lg" asChild>
              <Link to="/estudio">Probar el estudio manual</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-5 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon={<Wand2 className="h-5 w-5" />}
            title="1. Crea el evento"
            text="Nombre, fecha y lugar. Tan simple como guardar un contacto."
          />
          <Feature
            icon={<Layers className="h-5 w-5" />}
            title="2. Diseña los estilos"
            text="Tamaño, marco, efecto 3D o flip y ajustes de impresión con valores recomendados."
          />
          <Feature
            icon={<Camera className="h-5 w-5" />}
            title="3. Modo evento"
            text="Pantalla de quiosco: el invitado elige estilo y se toma la foto."
          />
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            title="4. Entrega al instante"
            text="Imprime la lámina o envía el enlace por QR, correo, WhatsApp o SMS."
          />
        </section>

        <section className="panel mb-20 grid gap-6 p-8 sm:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Repeat2 className="h-4 w-4" /> Efecto Flip con una sola foto
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              La IA crea la segunda imagen con el estilo que configuraste (caricatura, cómic, retro
              80s…). Nadie tiene que posar dos veces.
            </p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Layers className="h-4 w-4" /> Efecto 3D de profundidad
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Generamos varias vistas de paralaje y el archivo entrelazado listo para tu lámina
              lenticular, según el LPI y DPI del evento.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="panel p-6">
      <span className="inline-flex text-primary">{icon}</span>
      <h2 className="mt-3 text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
