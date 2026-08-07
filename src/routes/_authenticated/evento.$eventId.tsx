import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Camera, Copy, Layers, Pencil, Plus, Repeat2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StyleEditor } from "@/components/lenticular/StyleEditor";
import { supabase } from "@/integrations/supabase/client";
import { modeLabel, type PhotoStyle, type StyleDraft } from "@/lib/photo-styles";

export const Route = createFileRoute("/_authenticated/evento/$eventId")({
  head: () => ({
    meta: [
      { title: "Estilos del evento · Lenticular Events" },
      {
        name: "description",
        content:
          "Configura los estilos de foto de este evento: efecto 3D o flip, marco, tamaño y ajustes de impresión.",
      },
      { property: "og:title", content: "Estilos del evento · Lenticular Events" },
      {
        property: "og:description",
        content: "Define cómo saldrán las fotos lenticulares el día del evento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventDetail,
});

function EventDetail() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [styles, setStyles] = useState<PhotoStyle[]>([]);
  const [editing, setEditing] = useState<PhotoStyle | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: event, error }, { data: styleRows }] = await Promise.all([
      supabase.from("events").select("name, event_date, location").eq("id", eventId).maybeSingle(),
      supabase.from("photo_styles").select("*").eq("event_id", eventId).order("sort_order"),
    ]);
    if (error || !event) {
      toast.error("No encontramos este evento.");
      navigate({ to: "/eventos", replace: true });
      return;
    }
    setName(event.name);
    setDate(event.event_date ?? "");
    setLocation(event.location ?? "");
    setStyles((styleRows ?? []) as PhotoStyle[]);
    setLoading(false);
  }, [eventId, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const saveEvent = async () => {
    const { error } = await supabase
      .from("events")
      .update({ name: name.trim(), event_date: date || null, location: location.trim() || null })
      .eq("id", eventId);
    if (error) toast.error("No pudimos guardar el evento.");
    else toast.success("Datos del evento guardados.");
  };

  const saveStyle = async (draft: StyleDraft) => {
    const { data: userData } = await supabase.auth.getUser();
    const ownerId = userData.user?.id;
    if (!ownerId) return;
    if (editing) {
      const { error } = await supabase.from("photo_styles").update(draft).eq("id", editing.id);
      if (error) {
        toast.error("No pudimos guardar el estilo.");
        return;
      }
      toast.success("Estilo actualizado.");
    } else {
      const { error } = await supabase
        .from("photo_styles")
        .insert({ ...draft, event_id: eventId, owner_id: ownerId, sort_order: styles.length });
      if (error) {
        toast.error("No pudimos crear el estilo.");
        return;
      }
      toast.success("Estilo creado.");
    }
    setEditorOpen(false);
    setEditing(null);
    load();
  };

  const duplicate = async (style: PhotoStyle) => {
    const { data: userData } = await supabase.auth.getUser();
    const ownerId = userData.user?.id;
    if (!ownerId) return;
    const { id: _id, event_id: _eventId, ...rest } = style;
    const { error } = await supabase.from("photo_styles").insert({
      ...rest,
      name: `${style.name} (copia)`,
      event_id: eventId,
      owner_id: ownerId,
      sort_order: styles.length,
    });
    if (error) {
      toast.error("No pudimos duplicar el estilo.");
      return;
    }
    load();
  };

  const remove = async (style: PhotoStyle) => {
    const { error } = await supabase.from("photo_styles").delete().eq("id", style.id);
    if (error) {
      toast.error("No pudimos borrar el estilo.");
      return;
    }
    setStyles((prev) => prev.filter((s) => s.id !== style.id));
  };


  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <Button variant="subtle" size="sm" asChild>
            <Link to="/eventos">
              <ArrowLeft className="h-4 w-4" /> Eventos
            </Link>
          </Button>
          <p className="truncate text-sm font-semibold">{name || "Evento"}</p>
          <div className="ml-auto">
            <Button variant="neon" size="sm" asChild>
              <Link to="/kiosco/$eventId" params={{ eventId }}>
                <Camera className="h-4 w-4" /> Modo evento
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-5 py-8">
        <section className="panel space-y-5 p-6">
          <div>
            <h1 className="text-lg font-semibold">Datos del evento</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Esto es solo para que reconozcas el evento en tu lista.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="e-name">Nombre</Label>
              <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-date">Fecha</Label>
              <Input id="e-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-place">Lugar</Label>
              <Input id="e-place" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <Button variant="subtle" onClick={saveEvent} disabled={!name.trim()}>
            Guardar cambios
          </Button>
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Estilos de foto</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                El día del evento el invitado elegirá uno de estos estilos.
              </p>
            </div>
            <Button
              variant="neon"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Nuevo estilo
            </Button>
          </div>

          {!loading && styles.length === 0 && (
            <div className="panel p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Todavía no hay estilos. Crea al menos uno para poder usar el modo evento.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {styles.map((style) => (
              <div key={style.id} className="panel flex flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                    {style.mode === "depth" ? (
                      <Layers className="h-4 w-4" />
                    ) : (
                      <Repeat2 className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{style.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {modeLabel(style.mode)} · {Number(style.width_cm)}×{Number(style.height_cm)} cm ·{" "}
                      {style.lpi} LPI
                    </p>
                    {style.mode === "flip" && style.ai_enabled && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-primary">
                        <Sparkles className="h-3 w-3" /> Segunda imagen con IA
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-auto flex gap-2">
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => {
                      setEditing(style);
                      setEditorOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  <Button variant="subtle" size="sm" onClick={() => duplicate(style)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="subtle" size="sm" onClick={() => remove(style)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <StyleEditor
        open={editorOpen}
        initial={
          editing
            ? ({ ...editing, id: undefined, event_id: undefined } as unknown as StyleDraft)
            : null
        }
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSave={saveStyle}
      />
    </div>
  );
}
