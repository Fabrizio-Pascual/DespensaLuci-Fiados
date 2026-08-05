"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

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
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    setStarting(true)

    ;(async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser")
        const reader = new BrowserMultiFormatReader()
        const controls = await reader.decodeFromVideoDevice(
          undefined, // deja que el navegador elija la cámara trasera si puede
          videoRef.current!,
          (result) => {
            if (result && !cancelled) {
              onDetected(result.getText())
              controls.stop()
              onOpenChange(false)
            }
          },
        )
        if (cancelled) {
          controls.stop()
          return
        }
        controlsRef.current = controls
        setStarting(false)
      } catch (err) {
        console.error(err)
        setError("No se pudo acceder a la cámara. Revisá los permisos del navegador.")
        setStarting(false)
      }
    })()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [open, onDetected, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Escanear código de barras</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-square bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
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
