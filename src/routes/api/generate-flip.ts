import { createFileRoute } from "@tanstack/react-router";

/**
 * Genera la segunda vista del efecto Flip a partir de la foto tomada
 * en el evento, aplicando el estilo configurado por el organizador.
 *
 * Usa la API de Gemini (Google AI Studio) directamente. Necesitas una
 * GEMINI_API_KEY gratuita: https://aistudio.google.com/apikey
 *
 * Si prefieres otro proveedor (OpenAI, Replicate, Stability, etc.) solo
 * hay que cambiar la llamada `fetch` de más abajo: el resto del endpoint
 * (validaciones, respuesta a la app) no cambia.
 */

const MODEL = "gemini-2.5-flash-image";

type Json = Record<string, unknown>;

/** Busca recursivamente una imagen base64 en la respuesta del modelo */
function findImage(node: unknown): string | null {
  if (typeof node === "string") {
    if (node.startsWith("data:image/")) return node;
    if (node.length > 512 && /^[A-Za-z0-9+/=\s]+$/.test(node)) {
      return `data:image/png;base64,${node.replace(/\s/g, "")}`;
    }
    return null;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findImage(item);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node as Json)) {
      const found = findImage(value);
      if (found) return found;
    }
  }
  return null;
}

export const Route = createFileRoute("/api/generate-flip")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["GEMINI_API_KEY"];
        if (!key) {
          return Response.json({ error: "El servicio de IA no está configurado." }, { status: 500 });
        }

        let body: { image?: string; prompt?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Petición inválida." }, { status: 400 });
        }

        const image = typeof body.image === "string" ? body.image : "";
        const prompt = (typeof body.prompt === "string" ? body.prompt : "").slice(0, 1200).trim();
        if (!image.startsWith("data:image/") || image.length > 12_000_000) {
          return Response.json({ error: "Imagen no válida." }, { status: 400 });
        }
        if (!prompt) {
          return Response.json({ error: "Falta el estilo a aplicar." }, { status: 400 });
        }

        const commaIndex = image.indexOf(",");
        const mimeMatch = /^data:(image\/[a-zA-Z+]+);base64$/.exec(image.slice(0, commaIndex));
        const mimeType = mimeMatch?.[1] ?? "image/png";
        const base64Data = image.slice(commaIndex + 1);

        const upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
          {
            method: "POST",
            headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `Transforma esta fotografía siguiendo este estilo: ${prompt}. Conserva el encuadre, la pose y el parecido de la persona. Devuelve solo la imagen final.`,
                    },
                    { inline_data: { mime_type: mimeType, data: base64Data } },
                  ],
                },
              ],
              generationConfig: { responseModalities: ["IMAGE"] },
            }),
          },
        );

        if (!upstream.ok) {
          const detail = await upstream.text();
          console.error(`Gemini API [${upstream.status}]: ${detail}`);
          if (upstream.status === 429) {
            return Response.json(
              { error: "El servicio de IA está saturado, inténtalo de nuevo en unos segundos." },
              { status: 429 },
            );
          }
          if (upstream.status === 402 || upstream.status === 403) {
            return Response.json(
              { error: "La clave de IA no tiene cuota o permisos suficientes." },
              { status: 402 },
            );
          }
          return Response.json({ error: "La IA no pudo generar la imagen." }, { status: 502 });
        }

        const payload = (await upstream.json()) as Json;
        const found = findImage(payload);

        if (!found) {
          return Response.json({ error: "La IA no devolvió ninguna imagen." }, { status: 502 });
        }
        return Response.json({ image: found });
      },
    },
  },
});
