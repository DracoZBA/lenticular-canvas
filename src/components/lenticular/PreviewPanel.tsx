import { useEffect, useRef, useState } from "react";
import { Download, FileImage, Smartphone, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { renderLensView, type PrintSettings } from "@/lib/lenticular";

export interface GenerationResult {
  interlaced: HTMLCanvasElement;
  depth: HTMLCanvasElement | null;
  views: number;
}

interface Props {
  result: GenerationResult | null;
  settings: PrintSettings;
  isGenerating: boolean;
  angle: number;
  onAngleChange: (angle: number) => void;
  onDownloadPrint: () => void;
  onDownloadDepth: () => void;
}

export function PreviewPanel({
  result,
  settings,
  isGenerating,
  angle,
  onAngleChange,
  onDownloadPrint,
  onDownloadDepth,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gyro, setGyro] = useState(false);
  const [gyroError, setGyroError] = useState<string | null>(null);

  // Repinta la vista simulada cada vez que cambia el ángulo o el resultado
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;
    // Se pinta a resolución nativa del entrelazado para que cada franja
    // caiga en píxeles enteros; el navegador reescala al mostrar.
    canvas.width = result.interlaced.width;
    canvas.height = result.interlaced.height;
    renderLensView(canvas, result.interlaced, result.views, settings, angle);
  }, [result, settings, angle]);

  // Giroscopio móvil: la inclinación del dispositivo mueve el ángulo de visión
  useEffect(() => {
    if (!gyro) return;
    const handler = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma ?? 0;
      onAngleChange(Math.max(-45, Math.min(45, Math.round(gamma))));
    };
    window.addEventListener("deviceorientation", handler, true);
    return () => window.removeEventListener("deviceorientation", handler, true);
  }, [gyro, onAngleChange]);

  const enableGyro = async () => {
    setGyroError(null);
    type PermissionCtor = { requestPermission?: () => Promise<PermissionState | string> };
    const ctor = window.DeviceOrientationEvent as unknown as PermissionCtor | undefined;
    if (!ctor) {
      setGyroError("Este dispositivo no expone sensores de orientación.");
      return;
    }
    if (typeof ctor.requestPermission === "function") {
      const state = await ctor.requestPermission();
      if (state !== "granted") {
        setGyroError("Permiso de sensores denegado.");
        return;
      }
    }
    setGyro(true);
  };

  return (
    <section className="panel flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Vista previa interactiva</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Simulación óptica de la lámina: mueve el ángulo para ver el cambio.
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface/70 px-3 py-1 font-mono text-xs text-primary">
          {angle > 0 ? `+${angle}` : angle}°
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
        <div
          className="relative w-full"
          style={{ aspectRatio: `${settings.widthCm} / ${settings.heightCm}` }}
        >
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Skeleton className="absolute inset-0 rounded-none opacity-60" />
              <Loader2 className="relative h-8 w-8 animate-spin text-primary" />
              <p className="relative text-sm text-muted-foreground">
                Calculando franjas y paralaje…
              </p>
            </div>
          ) : result ? (
            <>
              <canvas
                ref={canvasRef}
                className="h-full w-full"
                style={{ transform: `perspective(1200px) rotateY(${angle * 0.35}deg)` }}
              />
              <div className="pointer-events-none absolute inset-0 lens-overlay opacity-40" />
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <Sparkles className="h-7 w-7 text-primary/70" />
              <p className="max-w-xs text-sm text-muted-foreground">
                Carga tus imágenes y pulsa <span className="text-foreground">Generar</span> para
                previsualizar el entrelazado.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Inclinación / ángulo de visión
          </Label>
          <Button
            variant={gyro ? "default" : "subtle"}
            size="sm"
            onClick={gyro ? () => setGyro(false) : enableGyro}
          >
            <Smartphone className="h-4 w-4" />
            {gyro ? "Giroscopio activo" : "Usar giroscopio"}
          </Button>
        </div>
        <Slider
          min={-45}
          max={45}
          step={1}
          value={[angle]}
          onValueChange={([next]) => onAngleChange(next ?? 0)}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>-45°</span>
          <span>0°</span>
          <span>+45°</span>
        </div>
        {gyroError && <p className="text-xs text-destructive">{gyroError}</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="neon" onClick={onDownloadPrint} disabled={!result}>
          <Download className="h-4 w-4" /> Descargar para imprimir
        </Button>
        <Button
          variant="subtle"
          onClick={onDownloadDepth}
          disabled={!result?.depth}
          className={cn(!result?.depth && "opacity-60")}
        >
          <FileImage className="h-4 w-4" /> Exportar mapa de profundidad
        </Button>
      </div>
    </section>
  );
}
