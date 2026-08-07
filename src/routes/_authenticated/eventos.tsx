import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Camera, Cpu, LogOut, MapPin, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface EventRow {
  id: string;
  name: string;
  event_date: string | null;
  location: string | null;
  created_at: string;
}

export const Route = createFileRoute("/_authenticated/eventos")({
  head: () => ({
    meta: [
      { title: "Mis eventos · Lenticular Events" },
      {
        name: "description",
        content: "Crea y gestiona tus eventos con sus estilos de foto lenticular personalizados.",
      },
      { property: "og:title", content: "Mis eventos · Lenticular Events" },
      {
        property: "og:description",
        content: "Panel del organizador: eventos, estilos de foto y modo evento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, name, event_date, location, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("No pudimos cargar tus eventos.");
    setEvents(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("events")
      .insert({
        name: name.trim(),
        event_date: date || null,
        location: location.trim() || null,
        owner_id: userData.user!.id,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("No pudimos crear el evento.");
      return;
    }
    setOpen(false);
    setName("");
    setDate("");
    setLocation("");
    toast.success("Evento creado. Ahora añade sus estilos de foto.");
    navigate({ to: "/evento/$eventId", params: { eventId: data.id } });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl [background-image:var(--gradient-neon)] text-neon-foreground">
            <Cpu className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-base font-semibold">Mis eventos</h1>
            <p className="text-xs text-muted-foreground">Panel del organizador</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="subtle" asChild>
              <Link to="/estudio">Estudio manual</Link>
            </Button>
            <Button variant="subtle" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {loading ? "Cargando…" : `${events.length} evento(s)`}
          </p>
          <Button variant="neon" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nuevo evento
          </Button>
        </div>

        {!loading && events.length === 0 && (
          <div className="panel mt-6 p-10 text-center">
            <h2 className="text-lg font-semibold">Empieza creando tu primer evento</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Un evento guarda los estilos de foto que se podrán elegir el día del evento: tamaño,
              marco, efecto 3D o flip y ajustes de impresión.
            </p>
            <Button variant="neon" className="mt-6" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Crear evento
            </Button>
          </div>
        )}

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div key={event.id} className="panel flex flex-col gap-4 p-6">
              <div>
                <h2 className="text-base font-semibold">{event.name}</h2>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {event.event_date && (
                    <p className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(`${event.event_date}T00:00:00`).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  {event.location && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.location}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-auto grid grid-cols-2 gap-2">
                <Button variant="subtle" size="sm" asChild>
                  <Link to="/evento/$eventId" params={{ eventId: event.id }}>
                    <Settings2 className="h-4 w-4" /> Estilos
                  </Link>
                </Button>
                <Button variant="neon" size="sm" asChild>
                  <Link to="/kiosco/$eventId" params={{ eventId: event.id }}>
                    <Camera className="h-4 w-4" /> Modo evento
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo evento</DialogTitle>
            <DialogDescription>Solo necesitamos el nombre para empezar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="event-name">Nombre del evento</Label>
              <Input
                id="event-name"
                value={name}
                placeholder="Boda de Ana y Luis"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-date">Fecha (opcional)</Label>
              <Input id="event-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-place">Lugar (opcional)</Label>
              <Input
                id="event-place"
                value={location}
                placeholder="Hotel Central, Salón Azul"
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="subtle" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="neon" onClick={create} disabled={!name.trim() || saving}>
              Crear evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
