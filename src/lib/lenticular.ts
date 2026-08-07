/**
 * Motor de simulación lenticular (100% cliente, HTML5 Canvas).
 *
 * Todo el cálculo pesado vive aquí para que los componentes queden limpios.
 * Cuando exista el backend de IA, `useDepthMap` / `useInterlace`
 * (ver src/lib/lenticular-api.ts) reemplazarán `buildDepthViews` e `interlace`.
 */

export type LenticularMode = "depth" | "flip";

export interface PrintSettings {
  /** Lentes por pulgada de la lámina lenticular */
  lpi: number;
  /** Resolución de la impresora */
  dpi: number;
  /** Ancho físico en centímetros */
  widthCm: number;
  /** Alto físico en centímetros */
  heightCm: number;
}

export const DEFAULT_SETTINGS: PrintSettings = {
  lpi: 60,
  dpi: 600,
  widthCm: 15,
  heightCm: 15,
};

/** Número de vistas generadas en modo profundidad 3D */
export const DEPTH_VIEWS = 8;
/** Límite de píxeles por lado para que el navegador no sufra */
export const MAX_PIXELS = 2400;

export const cmToPx = (cm: number, dpi: number) => Math.round((cm / 2.54) * dpi);

export function outputSize(settings: PrintSettings) {
  const rawW = cmToPx(settings.widthCm, settings.dpi);
  const rawH = cmToPx(settings.heightCm, settings.dpi);
  const scale = Math.min(1, MAX_PIXELS / Math.max(rawW, rawH));
  return {
    width: Math.max(2, Math.round(rawW * scale)),
    height: Math.max(2, Math.round(rawH * scale)),
    rawWidth: rawW,
    rawHeight: rawH,
    scaled: scale < 1,
  };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Dibuja la imagen cubriendo el lienzo (object-fit: cover) */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / img.width, height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
}

export function imageToCanvas(img: HTMLImageElement, width: number, height: number) {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  drawCover(ctx, img, width, height);
  return canvas;
}

/**
 * Mapa de profundidad "mock": luminancia + desenfoque de caja + viñeta central.
 * Un modelo de IA (MiDaS / Depth-Anything) lo sustituirá vía /api/generate-depth.
 */
export function buildDepthMap(source: HTMLCanvasElement): HTMLCanvasElement {
  const { width, height } = source;
  const src = source.getContext("2d")!.getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = src.data[i * 4]!;
    const g = src.data[i * 4 + 1]!;
    const b = src.data[i * 4 + 2]!;
    gray[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  // Desenfoque separable rápido (dos pasadas de caja)
  const radius = Math.max(2, Math.round(Math.min(width, height) * 0.02));
  const tmp = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let n = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(width - 1, Math.max(0, x + k));
        sum += gray[y * width + xx]!;
        n++;
      }
      tmp[y * width + x] = sum / n;
    }
  }
  const out = new Float32Array(width * height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let sum = 0;
      let n = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(height - 1, Math.max(0, y + k));
        sum += tmp[yy * width + x]!;
        n++;
      }
      out[y * width + x] = sum / n;
    }
  }

  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  const dst = ctx.createImageData(width, height);
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.hypot(cx, cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const radial = 1 - Math.hypot(x - cx, y - cy) / maxR;
      const d = Math.min(1, Math.max(0, out[i]! * 0.55 + radial * 0.45));
      const v = Math.round(d * 255);
      dst.data[i * 4] = v;
      dst.data[i * 4 + 1] = v;
      dst.data[i * 4 + 2] = v;
      dst.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(dst, 0, 0);
  return canvas;
}

/** Genera N vistas con paralaje horizontal a partir de color + profundidad */
export function buildDepthViews(
  source: HTMLCanvasElement,
  depth: HTMLCanvasElement,
  views = DEPTH_VIEWS,
): HTMLCanvasElement[] {
  const { width, height } = source;
  const color = source.getContext("2d")!.getImageData(0, 0, width, height);
  const dmap = depth.getContext("2d")!.getImageData(0, 0, width, height);
  const maxShift = Math.max(3, Math.round(width * 0.02));
  const result: HTMLCanvasElement[] = [];

  for (let v = 0; v < views; v++) {
    const t = views === 1 ? 0 : v / (views - 1) - 0.5;
    const shift = t * 2 * maxShift;
    const canvas = makeCanvas(width, height);
    const ctx = canvas.getContext("2d")!;
    const out = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const d = dmap.data[i * 4]! / 255;
        const sx = Math.min(width - 1, Math.max(0, Math.round(x - shift * d)));
        const si = y * width + sx;
        out.data[i * 4] = color.data[si * 4]!;
        out.data[i * 4 + 1] = color.data[si * 4 + 1]!;
        out.data[i * 4 + 2] = color.data[si * 4 + 2]!;
        out.data[i * 4 + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
    result.push(canvas);
  }
  return result;
}

/**
 * Entrelazado real: por cada lente se reparten franjas verticales,
 * una por vista, con ancho = DPI / LPI / nº de vistas.
 */
export function interlace(
  views: HTMLCanvasElement[],
  settings: PrintSettings,
): HTMLCanvasElement {
  const { width, height } = outputSize(settings);
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const period = lensPeriod(width, settings, views.length);
  const stripe = period / views.length;

  for (let lens = 0; lens * period < width; lens++) {
    for (let v = 0; v < views.length; v++) {
      const src = views[v]!;
      const dx = lens * period + v * stripe;
      const sx = (dx / width) * src.width;
      const sw = Math.max(1, (stripe / width) * src.width);
      ctx.drawImage(src, sx, 0, sw, src.height, dx, 0, Math.ceil(stripe) + 1, height);
    }
  }
  return canvas;
}

/** Paso de lente en píxeles del lienzo de salida (mínimo: 1 px por vista) */
export function lensPeriod(outputWidth: number, settings: PrintSettings, views: number) {
  const raw = cmToPx(settings.widthCm, settings.dpi);
  const scale = outputWidth / (raw || outputWidth);
  return Math.max(views, (settings.dpi / settings.lpi) * scale);
}

/**
 * Simula lo que el ojo ve al inclinar la lámina: por cada lente sólo una
 * franja queda ampliada y cubre el periodo completo.
 */
export function renderLensView(
  target: HTMLCanvasElement,
  interlaced: HTMLCanvasElement,
  views: number,
  settings: PrintSettings,
  angleDeg: number,
) {
  const ctx = target.getContext("2d")!;
  const { width, height } = target;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);

  const t = (angleDeg + 45) / 90; // 0..1
  const index = Math.min(views - 1, Math.max(0, Math.round(t * (views - 1))));

  const period = lensPeriod(interlaced.width, settings, views);
  const stripe = period / views;
  const scale = width / interlaced.width;

  for (let lens = 0; lens * period < interlaced.width; lens++) {
    const sx = Math.min(interlaced.width - 1, lens * period + index * stripe);
    ctx.drawImage(
      interlaced,
      sx,
      0,
      Math.max(1, stripe),
      interlaced.height,
      lens * period * scale,
      0,
      Math.ceil(period * scale) + 1,
      height,
    );
  }
}


export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Fallo al exportar el lienzo"))),
      type,
    );
  });
}

export async function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
