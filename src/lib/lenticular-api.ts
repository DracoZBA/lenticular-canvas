/**
 * Capa de acceso al backend de inferencia (aún no existe).
 *
 * Hooks listos para conectar:
 *   POST /api/generate-depth  -> mapa de profundidad monocular (MiDaS / Depth-Anything)
 *   POST /api/interlace       -> entrelazado de alta precisión en servidor
 *
 * Mientras `USE_REMOTE_INFERENCE` sea false, todo se resuelve en el navegador
 * con el motor local de src/lib/lenticular.ts. Al activar el backend basta con
 * poner la bandera en true (o leer una env var) sin tocar la UI.
 */

import { useCallback } from "react";
import {
  buildDepthMap,
  buildDepthViews,
  canvasToBlob,
  interlace,
  loadImage,
  type PrintSettings,
} from "./lenticular";

export const USE_REMOTE_INFERENCE = false;

export const API_ROUTES = {
  depth: "/api/generate-depth",
  interlace: "/api/interlace",
} as const;

async function postCanvas(route: string, canvas: HTMLCanvasElement, meta: object) {
  const form = new FormData();
  form.append("image", await canvasToBlob(canvas), "input.png");
  form.append("meta", JSON.stringify(meta));
  const res = await fetch(route, { method: "POST", body: form });
  if (!res.ok) throw new Error(`El servicio de IA respondió ${res.status}`);
  const url = URL.createObjectURL(await res.blob());
  try {
    const img = await loadImage(url);
    const out = document.createElement("canvas");
    out.width = img.width;
    out.height = img.height;
    out.getContext("2d")!.drawImage(img, 0, 0);
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Mapa de profundidad: IA remota o heurística local */
export function useDepthMap() {
  return useCallback(async (source: HTMLCanvasElement): Promise<HTMLCanvasElement> => {
    if (USE_REMOTE_INFERENCE) {
      return postCanvas(API_ROUTES.depth, source, { model: "depth-anything-v2" });
    }
    return buildDepthMap(source);
  }, []);
}

/** Entrelazado: servidor de alta precisión o canvas local */
export function useInterlace() {
  return useCallback(
    async (
      views: HTMLCanvasElement[],
      settings: PrintSettings,
    ): Promise<HTMLCanvasElement> => {
      if (USE_REMOTE_INFERENCE && views.length > 0) {
        return postCanvas(API_ROUTES.interlace, views[0]!, { settings, views: views.length });
      }
      return interlace(views, settings);
    },
    [],
  );
}

/** Vistas de paralaje a partir de una sola foto */
export function useParallaxViews() {
  return useCallback(
    (source: HTMLCanvasElement, depth: HTMLCanvasElement, views: number) =>
      buildDepthViews(source, depth, views),
    [],
  );
}
