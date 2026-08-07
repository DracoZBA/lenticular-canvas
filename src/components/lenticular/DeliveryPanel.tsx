import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Loader2, Mail, MessageCircle, Printer, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  /** Enlace temporal del archivo guardado (null mientras se sube) */
  url: string | null;
  uploading: boolean;
  onDownload: () => void;
}

/** Entrega de la foto al invitado: imprimir, descargar, QR, correo y mensajería */
export function DeliveryPanel({ url, uploading, onDownload }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) {
      setQr(null);
      return;
    }
    QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [url]);

  const print = () => {
    if (!url) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<html><head><title>Imprimir foto</title><style>@page{margin:0}body{margin:0}img{width:100%}</style></head><body><img src="${url}" onload="window.focus();window.print()" /></body></html>`,
    );
    win.document.close();
  };

  const message = url ? `¡Aquí está tu foto del evento! ${url}` : "";

  return (
    <section className="panel space-y-6 p-6">
      <div>
        <h3 className="text-lg font-semibold">Entregar la foto</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Imprime la lámina o envía el enlace al invitado.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="neon" size="lg" onClick={print} disabled={!url}>
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
        <Button variant="subtle" size="lg" onClick={onDownload}>
          <Download className="h-4 w-4" /> Descargar PNG
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div className="grid h-40 w-40 place-items-center rounded-xl border border-border bg-white p-2">
          {uploading || !qr ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <img src={qr} alt="Código QR para descargar la foto" className="h-full w-full" />
          )}
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium">Que el invitado escanee el QR</p>
          <p className="text-xs text-muted-foreground">
            Descarga la foto en su móvil al instante, sin dar ningún dato. El enlace caduca en 60 días.
          </p>
          <Button
            variant="subtle"
            size="sm"
            disabled={!url}
            onClick={() => {
              if (!url) return;
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Enlace copiado" : "Copiar enlace"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="guest-email">Enviar por correo</Label>
          <div className="flex gap-2">
            <Input
              id="guest-email"
              type="email"
              inputMode="email"
              placeholder="invitado@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button
              variant="subtle"
              disabled={!url || !email.includes("@")}
              onClick={() => {
                window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent("Tu foto del evento")}&body=${encodeURIComponent(message)}`;
              }}
            >
              <Mail className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="guest-phone">Enviar por WhatsApp o SMS</Label>
          <div className="flex gap-2">
            <Input
              id="guest-phone"
              type="tel"
              inputMode="tel"
              placeholder="+51 999 999 999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button
              variant="subtle"
              disabled={!url || phone.replace(/\D/g, "").length < 6}
              onClick={() =>
                window.open(
                  `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
                  "_blank",
                )
              }
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="subtle"
              disabled={!url || phone.replace(/\D/g, "").length < 6}
              onClick={() => {
                window.location.href = `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(message)}`;
              }}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
