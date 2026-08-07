import { Layers, Repeat2, Upload, X, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { DEPTH_VIEWS, outputSize, type LenticularMode, type PrintSettings } from "@/lib/lenticular";

const LPI_STEPS = [30, 40, 60, 75, 80, 100];
const DPI_STEPS = [300, 600, 720, 1200];

interface Props {
  mode: LenticularMode;
  onModeChange: (mode: LenticularMode) => void;
  sources: string[];
  onSourcesChange: (sources: string[]) => void;
  settings: PrintSettings;
  onSettingsChange: (settings: PrintSettings) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function ConfigPanel({
  mode,
  onModeChange,
  sources,
  onSourcesChange,
  settings,
  onSettingsChange,
  onGenerate,
  isGenerating,
}: Props) {
  const required = mode === "flip" ? 2 : 1;
  const size = outputSize(settings);

  const readFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files).slice(0, required);
    Promise.all(
      picked.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(file);
          }),
      ),
    ).then((urls) => {
      const next = [...sources];
      urls.forEach((url, i) => {
        if (picked.length === required) next[i] = url;
        else next[next.length >= required ? required - 1 : next.length] = url;
      });
      onSourcesChange(next.slice(0, required));
    });
  };

  return (
    <section className="panel flex flex-col gap-7 p-6">
      <div>
        <h2 className="text-lg font-semibold">Configuración</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Define el efecto y los parámetros físicos de la lámina.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Modo de efecto
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <ModeCard
            active={mode === "depth"}
            icon={<Layers className="h-4 w-4" />}
            title="Efecto 3D"
            subtitle="Profundidad · 1 foto"
            onClick={() => onModeChange("depth")}
          />
          <ModeCard
            active={mode === "flip"}
            icon={<Repeat2 className="h-4 w-4" />}
            title="Efecto Flip"
            subtitle="2 cambios · 2 fotos"
            onClick={() => onModeChange("flip")}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Imágenes fuente
          </Label>
          <span className="text-xs text-muted-foreground">
            {sources.filter(Boolean).length}/{required}
          </span>
        </div>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            readFiles(e.dataTransfer.files);
          }}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface/60 px-4 py-8 text-center transition-colors hover:border-primary/60 hover:bg-surface-raised/60"
        >
          <span className="rounded-full bg-primary/15 p-3 text-primary">
            <Upload className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium">
            {mode === "depth" ? "Arrastra 1 fotografía" : "Arrastra 2 fotografías"}
          </span>
          <span className="text-xs text-muted-foreground">PNG, JPG o WEBP · máx. recomendado 4000 px</span>
          <input
            type="file"
            accept="image/*"
            multiple={required > 1}
            className="sr-only"
            onChange={(e) => readFiles(e.target.files)}
          />
        </label>

        <div className={cn("grid gap-3", required > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {Array.from({ length: required }).map((_, i) => (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface"
            >
              {sources[i] ? (
                <>
                  <img
                    src={sources[i]}
                    alt={`Fuente ${i + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Quitar imagen ${i + 1}`}
                    onClick={() => {
                      const next = [...sources];
                      next[i] = "";
                      onSourcesChange(next);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-background/80 p-1 text-foreground/80 backdrop-blur hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  {mode === "flip" ? `Vista ${i + 1}` : "Foto base"}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Ajustes de impresión
        </Label>

        <StepRow
          label="LPI · lentes por pulgada"
          value={settings.lpi}
          steps={LPI_STEPS}
          onChange={(lpi) => onSettingsChange({ ...settings, lpi })}
        />
        <StepRow
          label="DPI · resolución de impresora"
          value={settings.dpi}
          steps={DPI_STEPS}
          onChange={(dpi) => onSettingsChange({ ...settings, dpi })}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Ancho</span>
            <span className="font-mono text-primary">{settings.widthCm} cm</span>
          </div>
          <Slider
            min={5}
            max={60}
            step={1}
            value={[settings.widthCm]}
            onValueChange={([widthCm]) => onSettingsChange({ ...settings, widthCm: widthCm ?? 15 })}
          />
          <div className="flex items-center justify-between text-sm">
            <span>Alto</span>
            <span className="font-mono text-primary">{settings.heightCm} cm</span>
          </div>
          <Slider
            min={5}
            max={60}
            step={1}
            value={[settings.heightCm]}
            onValueChange={([heightCm]) =>
              onSettingsChange({ ...settings, heightCm: heightCm ?? 15 })
            }
          />
        </div>

        <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface/60 p-4 text-xs">
          <div>
            <dt className="text-muted-foreground">Lienzo de salida</dt>
            <dd className="mt-1 font-mono text-sm">
              {size.rawWidth} × {size.rawHeight} px
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Vistas entrelazadas</dt>
            <dd className="mt-1 font-mono text-sm">{mode === "flip" ? 2 : DEPTH_VIEWS}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ancho de franja</dt>
            <dd className="mt-1 font-mono text-sm">
              {(settings.dpi / settings.lpi / (mode === "flip" ? 2 : DEPTH_VIEWS)).toFixed(2)} px
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Paso de lente</dt>
            <dd className="mt-1 font-mono text-sm">
              {(settings.dpi / settings.lpi).toFixed(2)} px
            </dd>
          </div>
        </dl>
      </div>

      <Button
        variant="neon"
        size="lg"
        className="w-full"
        onClick={onGenerate}
        disabled={isGenerating || sources.filter(Boolean).length < required}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Entrelazando…
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4" /> Generar Entrelazado Lenticular
          </>
        )}
      </Button>
    </section>
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
        active
          ? "border-primary/60 bg-primary/10 glow-ring"
          : "border-border bg-surface/60 hover:border-primary/40",
      )}
    >
      <span className={cn("inline-flex", active ? "text-primary" : "text-muted-foreground")}>
        {icon}
      </span>
      <p className="mt-2 text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </button>
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
