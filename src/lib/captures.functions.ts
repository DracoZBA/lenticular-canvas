import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface SaveCaptureInput {
  eventId: string;
  styleId: string | null;
  image: string;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  deliveredVia?: string[];
}

/** Guarda la foto final del evento y devuelve un enlace temporal para el invitado */
export const saveCapture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SaveCaptureInput) => {
    if (!input?.eventId) throw new Error("Falta el evento");
    if (typeof input.image !== "string" || !input.image.startsWith("data:image/")) {
      throw new Error("Imagen no válida");
    }
    if (input.image.length > 20_000_000) throw new Error("La imagen es demasiado grande");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", data.eventId)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) throw new Error("Evento no encontrado");

    const base64 = data.image.slice(data.image.indexOf(",") + 1);
    const bytes = Buffer.from(base64, "base64");
    const path = `${userId}/${data.eventId}/${crypto.randomUUID()}.png`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: uploadError } = await supabaseAdmin.storage
      .from("capturas")
      .upload(path, bytes, { contentType: "image/png", upsert: false });
    if (uploadError) throw uploadError;

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("capturas")
      .createSignedUrl(path, 60 * 60 * 24 * 60);
    if (signError) throw signError;

    const { data: row, error: insertError } = await supabaseAdmin
      .from("captures")
      .insert({
        event_id: data.eventId,
        style_id: data.styleId,
        owner_id: userId,
        storage_path: path,
        public_url: signed.signedUrl,
        guest_name: data.guestName ?? null,
        guest_email: data.guestEmail ?? null,
        guest_phone: data.guestPhone ?? null,
        delivered_via: data.deliveredVia ?? [],
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    return { id: row.id, url: signed.signedUrl };
  });
