/**
 * Estilos de foto por evento: tipos compartidos y utilidades de imagen
 * (marco impreso y variante alternativa para el flip sin IA).
 */

import type { PrintSettings } from "./lenticular";

export type StyleMode = "depth" | "flip";

export interface PhotoStyle {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  mode: string;
  lpi: number;
  dpi: number;
  width_cm: number;
  height_cm: number;
  frame_color: string;
  frame_width_mm: number;
  ai_enabled: boolean;
  ai_prompt: string | null;
  sort_order: number;
}

export type StyleDraft = Omit<PhotoStyle, "id" | "event_id">;

/**
 * `swatch` es un degradado representativo del estilo (se usa como miniatura
 * visual en el selector, sin depender de imágenes externas) y `icon` es el
 * nombre de un ícono de lucide-react que se resuelve en StyleEditor.
 */
export const AI_PRESETS = [
  {
    label: "Caricatura",
    icon: "Smile",
    swatch: "linear-gradient(135deg, #ffb703 0%, #fb8500 50%, #ff6b6b 100%)",
    prompt: "Convierte a la persona en una caricatura ilustrada y divertida, colores vivos, trazo limpio, manteniendo su parecido.",
  },
  {
    label: "Cómic",
    icon: "Zap",
    swatch: "linear-gradient(135deg, #ffd60a 0%, #ff006e 55%, #3a86ff 100%)",
    prompt: "Estilo cómic con tramas de puntos, contornos negros marcados y colores planos saturados.",
  },
  {
    label: "Retro 80s",
    icon: "Sunset",
    swatch: "linear-gradient(135deg, #ff2d95 0%, #7209b7 50%, #00e5ff 100%)",
    prompt: "Estética retro de los años 80: luces de neón, grano de película y colores magenta y cian.",
  },
  {
    label: "Cyberpunk",
    icon: "Cpu",
    swatch: "linear-gradient(135deg, #05ffa1 0%, #00d9ff 45%, #b829ff 100%)",
    prompt: "Retrato cyberpunk futurista con neones, lluvia y reflejos metálicos, manteniendo el parecido.",
  },
  {
    label: "Acuarela",
    icon: "Droplet",
    swatch: "linear-gradient(135deg, #a8dadc 0%, #f1faee 50%, #ffc8dd 100%)",
    prompt: "Retrato pintado en acuarela suave sobre papel, con trazos visibles y fondo difuminado.",
  },
  {
    label: "Blanco y negro clásico",
    icon: "Aperture",
    swatch: "linear-gradient(135deg, #f4f4f4 0%, #9d9d9d 50%, #1a1a1a 100%)",
    prompt: "Retrato en blanco y negro de estudio, alto contraste, iluminación dramática.",
  },
  {
    label: "Superhéroe",
    icon: "ShieldHalf",
    swatch: "linear-gradient(135deg, #ff1e1e 0%, #b91d1d 50%, #1d3ba9 100%)",
    prompt: "Convierte a la persona en un superhéroe de cómic con traje heroico y fondo épico.",
  },
] as const;

export const DEFAULT_STYLE: StyleDraft = {
  name: "Nuevo estilo",
  description: null,
  mode: "flip",
  lpi: 60,
  dpi: 600,
  width_cm: 15,
  height_cm: 15,
  frame_color: "#0b0b12",
  frame_width_mm: 0,
  ai_enabled: true,
  ai_prompt: AI_PRESETS[0].prompt,
  sort_order: 0,
};

export function styleToSettings(style: PhotoStyle): PrintSettings {
  return {
    lpi: style.lpi,
    dpi: style.dpi,
    widthCm: Number(style.width_cm),
    heightCm: Number(style.height_cm),
  };
}

export const modeLabel = (mode: string) => (mode === "depth" ? "Efecto 3D" : "Efecto Flip");

function cloneCanvas(source: HTMLCanvasElement) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext("2d")!.drawImage(source, 0, 0);
  return canvas;
}

/** Dibuja el marco impreso configurado en el estilo (sobre una copia) */
export function applyFrame(source: HTMLCanvasElement, style: PhotoStyle): HTMLCanvasElement {
  const mm = Number(style.frame_width_mm);
  if (!mm) return source;
  const canvas = cloneCanvas(source);
  const ctx = canvas.getContext("2d")!;
  const widthMm = Number(style.width_cm) * 10;
  const border = Math.max(1, Math.round((mm / widthMm) * canvas.width));
  ctx.strokeStyle = style.frame_color || "#000000";
  ctx.lineWidth = border;
  ctx.strokeRect(border / 2, border / 2, canvas.width - border, canvas.height - border);
  return canvas;
}

/** Variante local usada en el flip cuando la IA está desactivada */
export function monochromeVariant(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = cloneCanvas(source);
  const ctx = canvas.getContext("2d")!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 0.299 * img.data[i]! + 0.587 * img.data[i + 1]! + 0.114 * img.data[i + 2]!;
    const boosted = Math.min(255, Math.max(0, (v - 128) * 1.25 + 128));
    img.data[i] = boosted;
    img.data[i + 1] = boosted;
    img.data[i + 2] = boosted;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
