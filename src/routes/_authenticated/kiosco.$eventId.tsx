import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Layers, Loader2, RefreshCw, Repeat2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/lenticular/CameraCapture";
import { DeliveryPanel } from "@/components/lenticular/DeliveryPanel";
import { PreviewPanel, type GenerationResult } from "@/components/lenticular/PreviewPanel";
import { supabase } from "@/integrations/supabase/client";
import { saveCapture } from "@/lib/captures.functions";
import {
  DEPTH_VIEWS,
  downloadCanvas,
  imageToCanvas,
  loadImage,
  outputSize,
} from "@/lib/lenticular";
import { useDepthMap, useInterlace, useParallaxViews } from "@/lib/lenticular-api";
import {
  applyFrame,
  modeLabel,
  monochromeVariant,
  styleToSettings,
  type PhotoStyle,
} from "@/lib/photo-styles";

export const Route = createFileRoute("/_authenticated/kiosco/$eventId")({
  head: () => ({
    meta: [
      { title: "Modo evento · Lenticular Events" },
      {
        name: "description",
        content: "Pantalla de quiosco: elige el estilo, toma la foto y entrégala impresa o por enlace.",
      },
      { property: "og:title", content: "Modo evento · Lenticular Events" },
      {
        property: "og:description",
        content: "Captura y entrega fotos lenticulares en segundos durante el evento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KioskPage,
});

type Step = "style" | "camera" | "processing" | "result";

function KioskPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const [eventName, setEventName] = useState("");
  const [styles, setStyles] = useState<PhotoStyle[]>([]);
  const [style, setStyle] = useState<PhotoStyle | null>(null);
  const [step, setStep] = useState<Step>("style");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [angle, setAngle] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const getDepthMap = useDepthMap();
  const runInterlace = useInterlace();
  const buildViews = useParallaxViews();
  const upload = useServerFn(saveCapture);

  useEffect(() => {
    (async () => {
      const [{ data: event }, { data: rows }] = await Promise.all([
        supabase.from("events").select("name").eq("id", eventId).maybeSingle(),
        supabase.from("photo_styles").select("*").eq("event_id", eventId).order("sort_order"),
      ]);
      if (!event) {
        toast.error("No encontramos este evento.");
        navigate({ to: "/eventos", replace: true });
        return;
      }
      setEventName(event.name);
      setStyles((rows ?? []) as PhotoStyle[]);
    })();
  }, [eventId, navigate]);

  const process = useCallback(
    async (photo: string) => {
      if (!style) return;
      setStep("processing");
      setResult(null);
      setUrl(null);
      try {
        const settings = styleToSettings(style);
        const { width, height } = outputSize(settings);
        const workW = Math.min(width, 1100);
        const workH = Math.round((workW * height) / width);

        setProgress("Preparando la fotografía…");
        const base = imageToCanvas(await loadImage(photo), workW, workH);

        let views: HTMLCanvasElement[];
        let depth: HTMLCanvasElement | null = null;

        if (style.mode === "flip") {
          let second = monochromeVariant(base);
          if (style.ai_enabled && style.ai_prompt) {
            setProgress("La IA está creando la segunda imagen…");
            try {
              const res = await fetch("/api/generate-flip", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: photo, prompt: style.ai_prompt }),
              });
              if (!res.ok) throw new Error(await res.text());
              const json = (await res.json()) as { image?: string };
              if (json.image) second = imageToCanvas(await loadImage(json.image), workW, workH);
            } catch {
              toast.warning("La IA no respondió; usamos una variante en blanco y negro.");
            }
          }
          views = [base, second];
        } else {
          setProgress("Calculando la profundidad…");
          depth = await getDepthMap(base);
          views = buildViews(base, depth, DEPTH_VIEWS);
        }

        setProgress("Entrelazando para la lámina lenticular…");
        const interlaced = applyFrame(await runInterlace(views, settings), style);
        setResult({ interlaced, depth, views: views.length });
        setStep("result");

        setUploading(true);
        try {
          const saved = await upload({
            data: {
              eventId,
              styleId: style.id,
              image: interlaced.toDataURL("image/png"),
              deliveredVia: [],
            },
          });
          setUrl(saved.url);
        } catch {
          toast.error("La foto se generó, pero no pudimos subirla para el enlace/QR.");
        } finally {
          setUploading(false);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No pudimos generar la foto.");
        setStep("camera");
      }
    },
    [style, eventId, getDepthMap, buildViews, runInterlace, upload],
  );

  const restart = () => {
    setStep("style");
    setStyle(null);
    setResult(null);
    setUrl(null);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <Button variant="subtle" size="sm" asChild>
            <Link to="/eventos">
              <ArrowLeft className="h-4 w-4" /> Salir del modo evento
            </Link>
          </Button>
          <p className="truncate text-sm font-semibold">{eventName}</p>
          {step !== "style" && (
            <Button variant="subtle" size="sm" className="ml-auto" onClick={restart}>
              <RefreshCw className="h-4 w-4" /> Empezar de nuevo
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        {step === "style" && (
          <section className="space-y-6 text-center">
            <h1 className="text-3xl font-bold sm:text-4xl">Elige tu estilo de foto</h1>
            <p className="text-muted-foreground">Toca una opción para empezar.</p>
            {styles.length === 0 ? (
              <div className="panel p-10 text-sm text-muted-foreground">
                Este evento aún no tiene estilos configurados.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {styles.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setStyle(item);
                      setStep("camera");
                    }}
                    className="panel p-6 text-left transition-all hover:border-primary/60 hover:glow-ring"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                      {item.mode === "depth" ? (
                        <Layers className="h-5 w-5" />
                      ) : (
                        <Repeat2 className="h-5 w-5" />
                      )}
                    </span>
                    <p className="mt-3 text-base font-semibold">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.description || modeLabel(item.mode)}
                    </p>
                    {item.mode === "flip" && item.ai_enabled && (
                      <p className="mt-2 flex items-center gap-1 text-xs text-primary">
                        <Sparkles className="h-3 w-3" /> Con toque de IA
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {step === "camera" && (
          <section className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold sm:text-3xl">Colócate frente a la cámara</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Estilo seleccionado: <span className="text-primary">{style?.name}</span> · solo una foto.
              </p>
            </div>
            <CameraCapture onCapture={process} />
          </section>
        )}

        {step === "processing" && (
          <section className="panel grid place-items-center gap-4 p-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-semibold">Creando tu foto lenticular…</p>
            <p className="text-sm text-muted-foreground">{progress}</p>
          </section>
        )}

        {step === "result" && style && (
          <section className="grid gap-6 lg:grid-cols-2">
            <PreviewPanel
              result={result}
              settings={styleToSettings(style)}
              isGenerating={false}
              angle={angle}
              onAngleChange={setAngle}
              onDownloadPrint={() =>
                result && downloadCanvas(result.interlaced, `${style.name}-lenticular.png`)
              }
              onDownloadDepth={() => result?.depth && downloadCanvas(result.depth, "profundidad.png")}
            />
            <DeliveryPanel
              url={url}
              uploading={uploading}
              onDownload={() =>
                result && downloadCanvas(result.interlaced, `${style.name}-lenticular.png`)
              }
            />
          </section>
        )}
      </main>
    </div>
  );
}
