import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onCapture: (dataUrl: string) => void;
}

/** Cámara del dispositivo en modo kiosco con cuenta atrás de 3 segundos */
export function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const start = useCallback(async () => {
    setError(null);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setError("No pudimos acceder a la cámara. Revisa los permisos del navegador.");
    }
  }, [facing]);

  useEffect(() => {
    start();
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, [start]);

  const shoot = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const side = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d")!;
    if (facing === "user") {
      ctx.translate(side, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      video,
      (video.videoWidth - side) / 2,
      (video.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      side,
      side,
    );
    onCapture(canvas.toDataURL("image/jpeg", 0.95));
  }, [facing, onCapture]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      shoot();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, shoot]);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative aspect-square w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
          style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
        />
        {countdown !== null && (
          <div className="absolute inset-0 grid place-items-center bg-background/50 backdrop-blur-sm">
            <span className="text-8xl font-bold text-gradient-neon">{countdown}</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center gap-4 p-6 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="neon" size="lg" onClick={() => setCountdown(3)} disabled={!!error || countdown !== null}>
          <Camera className="h-5 w-5" /> Tomar foto
        </Button>
        <Button
          variant="subtle"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          disabled={countdown !== null}
        >
          <SwitchCamera className="h-4 w-4" /> Cambiar cámara
        </Button>
        {error && (
          <Button variant="subtle" onClick={start}>
            <RefreshCw className="h-4 w-4" /> Reintentar
          </Button>
        )}
      </div>
    </div>
  );
}
