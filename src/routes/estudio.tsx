import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Cpu, Share2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfigPanel } from "@/components/lenticular/ConfigPanel";
import { PreviewPanel, type GenerationResult } from "@/components/lenticular/PreviewPanel";
import {
  DEFAULT_SETTINGS,
  DEPTH_VIEWS,
  downloadCanvas,
  imageToCanvas,
  loadImage,
  outputSize,
  type LenticularMode,
  type PrintSettings,
} from "@/lib/lenticular";
import { useDepthMap, useInterlace, useParallaxViews } from "@/lib/lenticular-api";
import sampleA from "@/assets/sample-a.jpg";
import sampleB from "@/assets/sample-b.jpg";

export const Route = createFileRoute("/estudio")({
  head: () => ({
    meta: [
      { title: "Estudio manual lenticular · 3D y Flip" },
      {
        name: "description",
        content:
          "Sube tus fotos y genera el archivo lenticular entrelazado ajustando LPI, DPI y tamaño, con vista previa interactiva de inclinación.",
      },
      { property: "og:title", content: "Estudio manual lenticular · 3D y Flip" },
      {
        property: "og:description",
        content: "Entrelazado lenticular en el navegador con vista previa de inclinación en tiempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LenticularStudio,
});

function LenticularStudio() {
  const [mode, setMode] = useState<LenticularMode>("flip");
  const [sources, setSources] = useState<string[]>([sampleA, sampleB]);
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS);
  const [angle, setAngle] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const getDepthMap = useDepthMap();
  const runInterlace = useInterlace();
  const buildViews = useParallaxViews();

  useEffect(() => {
    setResult(null);
    setSources((prev) => (mode === "flip" ? [prev[0] || sampleA, prev[1] || sampleB] : [prev[0] || sampleA]));
  }, [mode]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setResult(null);
    try {
      const { width, height } = outputSize(settings);
      const workW = Math.min(width, 1200);
      const workH = Math.round((workW * height) / width);
      const images = await Promise.all(sources.filter(Boolean).map(loadImage));
      const base = images.map((img) => imageToCanvas(img, workW, workH));

      let views: HTMLCanvasElement[];
      let depth: HTMLCanvasElement | null = null;

      if (mode === "flip") {
        views = base.slice(0, 2);
      } else {
        depth = await getDepthMap(base[0]!);
        views = buildViews(base[0]!, depth, DEPTH_VIEWS);
      }

      const interlaced = await runInterlace(views, settings);
      setResult({ interlaced, depth, views: views.length });
      toast.success("Entrelazado generado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el entrelazado.");
    } finally {
      setIsGenerating(false);
    }
  }, [mode, sources, settings, getDepthMap, buildViews, runInterlace]);

  const exportPrint = () => {
    if (!result) return;
    downloadCanvas(result.interlaced, `lenticular-${settings.lpi}lpi-${settings.dpi}dpi.png`);
  };

  const exportDepth = () => {
    if (!result?.depth) return;
    downloadCanvas(result.depth, "mapa-de-profundidad.png");
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-5 py-4">
          <Button variant="subtle" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Inicio
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl [background-image:var(--gradient-neon)] text-neon-foreground">
              <Cpu className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight sm:text-lg">
                Estudio <span className="text-gradient-neon">3D & Flip</span>
              </h1>
              <p className="text-xs text-muted-foreground">Entrelazado listo para impresión</p>
            </div>
          </div>
          <div className="ml-auto">
            <Button variant="subtle" onClick={exportPrint} disabled={!result}>
              <Share2 className="h-4 w-4" /> Exportar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <ConfigPanel
          mode={mode}
          onModeChange={setMode}
          sources={sources}
          onSourcesChange={setSources}
          settings={settings}
          onSettingsChange={setSettings}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
        <PreviewPanel
          result={result}
          settings={settings}
          isGenerating={isGenerating}
          angle={angle}
          onAngleChange={setAngle}
          onDownloadPrint={exportPrint}
          onDownloadDepth={exportDepth}
        />
      </main>
    </div>
  );
}
