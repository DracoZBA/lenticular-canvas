import { useEffect, useState } from "react";
import {
  Aperture,
  Check,
  Cpu,
  Droplet,
  Layers,
  Repeat2,
  ShieldHalf,
  Smile,
  Sparkles,
  Sunset,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AI_PRESETS, DEFAULT_STYLE, type StyleDraft } from "@/lib/photo-styles";

const LPI_STEPS = [30, 40, 60, 75, 80, 100];
const DPI_STEPS = [300, 600, 720, 1200];
const FRAME_COLORS = ["#0b0b12", "#ffffff", "#d4af37", "#c0c0c0", "#ff2d95", "#00e5ff"];

/** Resuelve el nombre de ícono guardado en cada preset a su componente lucide-react */
const PRESET_ICONS = {
  Smile,
  Zap,
  Sunset,
  Cpu,
  Droplet,
  Aperture,
  ShieldHalf,
} as const;

interface Props {
  open: boolean;
  initial?: StyleDraft | null;
  onClose: () => void;
  onSave: (draft: StyleDraft) => void;
  saving?: boolean;
}

/** Formulario guiado para crear o editar un estilo de foto del evento */
export function StyleEditor({ open, initial, onClose, onSave, saving }: Props) {
  const [draft, setDraft] = useState<StyleDraft>(initial ?? DEFAULT_STYLE);

  useEffect(() => {
    if (open) setDraft(initial ?? DEFAULT_STYLE);
  }, [open, initial]);

  const set = <K extends keyof StyleDraft>(key: K, value: StyleDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar estilo" : "Nuevo estilo de foto"}</DialogTitle>
          <DialogDescription>
            Así saldrán las fotos que se hagan con este estilo el día del evento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-7 py-2">
          <div className="space-y-2">
            <Label htmlFor="style-name">¿Cómo se llama este estilo?</Label>
            <Input
              id="style-name"
              value={draft.name}
              placeholder="Ej. Retrato mágico"
              onChange={(e) => set("name", e.target.value)}
            />
            <Input
              value={draft.description ?? ""}
              placeholder="Descripción corta que verá el invitado (opcional)"
              onChange={(e) => set("description", e.target.value || null)}
            />
          </div>

          <div className="space-y-3">
            <Label>¿Qué efecto tendrá la foto?</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <ModeCard
                active={draft.mode === "flip"}
                icon={<Repeat2 className="h-4 w-4" />}
                title="Efecto Flip"
                subtitle="Al inclinar, la foto cambia por otra imagen"
                onClick={() => set("mode", "flip")}
              />
              <ModeCard
                active={draft.mode === "depth"}
                icon={<Layers className="h-4 w-4" />}
                title="Efecto 3D"
                subtitle="La foto gana profundidad y relieve"
                onClick={() => set("mode", "depth")}
              />
            </div>
          </div>

          {draft.mode === "flip" && (
            <div className="space-y-4 rounded-xl border border-border bg-surface/60 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-primary" /> Segunda imagen creada con IA
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Solo se toma una foto: la IA crea la segunda versión con el estilo que elijas.
                    Si lo desactivas, se usará una versión en blanco y negro de la misma foto.
                  </p>
                </div>
                <Switch checked={draft.ai_enabled} onCheckedChange={(v) => set("ai_enabled", v)} />
              </div>

              {draft.ai_enabled && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Elige un estilo predeterminado (puedes editar el texto después):
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {AI_PRESETS.map((preset) => (
                      <PresetCard
                        key={preset.label}
                        label={preset.label}
                        icon={PRESET_ICONS[preset.icon]}
                        swatch={preset.swatch}
                        active={draft.ai_prompt === preset.prompt}
                        onClick={() => set("ai_prompt", preset.prompt)}
                      />
                    ))}
                  </div>
                  <Textarea
                    rows={3}
                    value={draft.ai_prompt ?? ""}
                    placeholder="Describe la transformación que debe hacer la IA"
                    onChange={(e) => set("ai_prompt", e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <Label>Tamaño de la foto impresa</Label>
            <SliderRow
              label="Ancho"
              unit="cm"
              min={5}
              max={60}
              value={Number(draft.width_cm)}
              onChange={(v) => set("width_cm", v)}
            />
            <SliderRow
              label="Alto"
              unit="cm"
              min={5}
              max={60}
              value={Number(draft.height_cm)}
              onChange={(v) => set("height_cm", v)}
            />
          </div>

          <div className="space-y-4">
            <Label>Marco impreso</Label>
            <SliderRow
              label="Grosor"
              unit="mm"
              min={0}
              max={20}
              value={Number(draft.frame_width_mm)}
              onChange={(v) => set("frame_width_mm", v)}
            />
            <div className="flex flex-wrap items-center gap-2">
              {FRAME_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color de marco ${color}`}
                  onClick={() => set("frame_color", color)}
                  style={{ backgroundColor: color }}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform",
                    draft.frame_color === color
                      ? "border-primary scale-110"
                      : "border-border hover:scale-105",
                  )}
                />
              ))}
              <Input
                value={draft.frame_color}
                onChange={(e) => set("frame_color", e.target.value)}
                className="ml-2 w-28 font-mono text-xs"
              />
            </div>
          </div>

          <details className="rounded-xl border border-border bg-surface/60 p-4">
            <summary className="cursor-pointer text-sm font-medium">
              Ajustes técnicos de impresión (avanzado)
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              Si no sabes qué poner, deja los valores recomendados: 60 LPI y 600 DPI funcionan con
              las láminas lenticulares más comunes.
            </p>
            <div className="mt-4 space-y-4">
              <StepRow
                label="LPI · lentes por pulgada de la lámina"
                value={draft.lpi}
                steps={LPI_STEPS}
                onChange={(v) => set("lpi", v)}
              />
              <StepRow
                label="DPI · resolución de la impresora"
                value={draft.dpi}
                steps={DPI_STEPS}
                onChange={(v) => set("dpi", v)}
              />
            </div>
          </details>
        </div>

        <DialogFooter>
          <Button variant="subtle" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="neon"
            disabled={!draft.name.trim() || saving}
            onClick={() => onSave({ ...draft, name: draft.name.trim() })}
          >
            {initial ? "Guardar cambios" : "Crear estilo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeCard({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all",
        active ? "border-primary/60 bg-primary/10 glow-ring" : "border-border bg-surface/60 hover:border-primary/40",
      )}
    >
      <span className={cn("inline-flex", active ? "text-primary" : "text-muted-foreground")}>{icon}</span>
      <p className="mt-2 text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </button>
  );
}

/**
 * Tarjeta visual para elegir un estilo predeterminado de IA: combina una
 * franja de color (representativa del estilo) con un ícono y el nombre,
 * para que se pueda reconocer de un vistazo sin tener que leer el prompt.
 */
function PresetCard({
  label,
  icon: Icon,
  swatch,
  active,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  swatch: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative overflow-hidden rounded-xl border text-left transition-all",
        active ? "border-primary/70 glow-ring" : "border-border hover:border-primary/40",
      )}
    >
      <div className="flex h-16 items-center justify-center" style={{ backgroundImage: swatch }}>
        <Icon className="h-6 w-6 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" />
      </div>
      <div
        className={cn(
          "flex items-center justify-between gap-1 px-2.5 py-2 text-xs font-medium",
          active ? "bg-primary/15 text-primary" : "bg-surface/60 text-muted-foreground group-hover:text-foreground",
        )}
      >
        <span className="truncate">{label}</span>
        {active && <Check className="h-3.5 w-3.5 shrink-0" />}
      </div>
    </button>
  );
}

function SliderRow({
  label,
  unit,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-primary">
          {value} {unit}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([next]) => onChange(next ?? min)}
      />
    </div>
  );
}

function StepRow({
  label,
  value,
  steps,
  onChange,
}: {
  label: string;
  value: number;
  steps: number[];
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-primary">{value}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => onChange(step)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              value === step
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {step}
          </button>
        ))}
      </div>
    </div>
  );
}
