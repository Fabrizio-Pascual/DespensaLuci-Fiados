"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

// Traduce los errores típicos de getUserMedia a algo entendible, y para los
// que no reconocemos mostramos el nombre técnico igual, así se puede
// diagnosticar sin tener que abrir la consola del navegador.
function describeCameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : (err as any)?.name
  const message = err instanceof Error ? err.message : String(err)

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "El navegador tiene la cámara bloqueada para este sitio (permiso denegado). Entrá a la configuración del sitio (ícono al lado de la URL) y poné Cámara en 'Permitir', después recargá la página."
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No se encontró ninguna cámara disponible. Si estás en Brave, puede ser el bloqueo de huellas digitales (Shields) simulando que no hay cámaras: bajá los Shields para este sitio y recargá."
    case "NotReadableError":
    case "TrackStartError":
      return "La cámara está siendo usada por otra app o pestaña (o el sistema operativo se la bloqueó). Cerrá otras apps que puedan estar usándola e intentá de nuevo."
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "No hay ninguna cámara que cumpla lo pedido (cámara trasera). Puede ser un dispositivo sin cámara trasera, como una notebook."
    case "SecurityError":
      return "El navegador bloqueó el acceso a la cámara por seguridad. Revisá que el sitio esté en https:// (no funciona en http:// salvo localhost)."
    case "AbortError":
      return "Se interrumpió el acceso a la cámara antes de poder usarla. Probá de nuevo."
    default:
      return `No se pudo acceder a la cámara${name ? ` (${name})` : ""}${message ? `: ${message}` : ""}.`
  }
}

export function BarcodeScanner({
  open,
  onOpenChange,
  onDetected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetected: (code: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    setStarting(true)

    ;(async () => {
      try {
        const video = videoRef.current
        if (!video) throw new Error("no-video-element")

        if (typeof window === "undefined" || !window.isSecureContext) {
          throw Object.assign(new Error("Contexto no seguro"), { name: "SecurityError" })
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          throw Object.assign(new Error("getUserMedia no disponible"), { name: "NotFoundError" })
        }

        video.muted = true
        video.playsInline = true
        // @ts-ignore -- propiedad no estándar que usa Safari/iOS viejo
        video.setAttribute("webkit-playsinline", "true")

        // Pedimos la cámara nosotros mismos (en vez de dejar que lo haga la
        // librería de lectura) para poder capturar el error real que tira
        // el navegador y mostrarlo tal cual, en vez de un mensaje genérico.
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: "environment" } },
          })
        } catch (err) {
          // Si falló por pedir específicamente la trasera, reintentamos sin
          // esa restricción (algunas notebooks/webcams no tienen "environment").
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream

        const { BrowserMultiFormatReader } = await import("@zxing/browser")
        const reader = new BrowserMultiFormatReader()

        const controls = await reader.decodeFromStream(stream, video, (result) => {
          if (result && !cancelled) {
            onDetected(result.getText())
            controls.stop()
            onOpenChange(false)
          }
        })

        if (cancelled) {
          controls.stop()
          return
        }

        try {
          await video.play()
        } catch {
          // puede rechazar si ya está reproduciendo, no es un error real
        }

        controlsRef.current = controls
        setStarting(false)
      } catch (err) {
        console.error("[barcode-scanner]", err)
        if (!cancelled) {
          setError(describeCameraError(err))
          setStarting(false)
        }
      }
    })()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [open, onDetected, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Escanear código de barras</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-square bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          {starting && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {!starting && !error && (
            <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-primary/80" />
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 p-4 text-center text-sm text-white">
              <p>{error}</p>
              <Button size="sm" variant="secondary" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          )}
        </div>
        <p className="p-4 text-center text-xs text-muted-foreground">
          Apuntá con la cámara al código de barras del producto
        </p>
      </DialogContent>
    </Dialog>
  )
}
