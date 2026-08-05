"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import {
  searchProducts,
  updateProductField,
  updateVariantField,
  type ProductRow,
} from "@/app/actions/products"
import { formatMoney } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { BarcodeScanner } from "@/components/products/barcode-scanner"
import { Search, ScanBarcode, Package, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function ProductsSection() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ProductRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [, startTransition] = useTransition()

  async function runSearch(q: string) {
    if (!q.trim()) {
      setResults(null)
      return
    }
    setLoading(true)
    try {
      const data = await searchProducts(q)
      setResults(data)
      if (data.length === 0) toast.info("No encontré ningún producto con eso.")
    } catch {
      toast.error("No se pudo buscar.")
    } finally {
      setLoading(false)
    }
  }

  function handleScanned(code: string) {
    setQuery(code)
    runSearch(code)
  }

  function updateLocal(id: string, field: "stock" | "price" | "barcode", value: any) {
    setResults((prev) =>
      prev ? prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)) : prev,
    )
  }

  function persist(id: string, field: "stock" | "price" | "barcode", value: string | number) {
    startTransition(async () => {
      try {
        await updateProductField(id, field, value)
      } catch {
        toast.error("No se pudo guardar el cambio.")
      }
    })
  }

  function updateVariantLocal(productId: string, variantId: string, field: "stock" | "price_modifier", value: number) {
    setResults((prev) =>
      prev
        ? prev.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  variants: p.variants.map((v) => (v.id === variantId ? { ...v, [field]: value } : v)),
                }
              : p,
          )
        : prev,
    )
  }

  function persistVariant(variantId: string, field: "stock" | "price_modifier", value: number) {
    startTransition(async () => {
      try {
        await updateVariantField(variantId, field, value)
      } catch {
        toast.error("No se pudo guardar el cambio.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch(query)
              }}
              placeholder="Buscar por nombre..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => runSearch(query)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
            </Button>
            <Button variant="outline" onClick={() => setScannerOpen(true)}>
              <ScanBarcode className="h-4 w-4" />
              Escanear
            </Button>
          </div>
        </CardContent>
      </Card>

      {results === null && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Buscá un producto por nombre o escaneá el código de barras de lo que llegó.
        </p>
      )}

      {results && results.length === 0 && !loading && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No hay ningún producto que coincida con "{query}".
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {results?.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {p.image_url ? (
                    <Image src={p.image_url} alt={p.name} fill className="object-contain p-1" sizes="56px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.category_name || "Sin categoría"} · {p.unit}
                  </p>
                  {p.barcode && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {p.barcode}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Precio</Label>
                  <Input
                    type="number"
                    value={p.price}
                    onChange={(e) => updateLocal(p.id, "price", e.target.value === "" ? 0 : Number(e.target.value))}
                    onBlur={(e) => persist(p.id, "price", parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Stock</Label>
                  <Input
                    type="number"
                    value={p.stock}
                    onChange={(e) => updateLocal(p.id, "stock", e.target.value === "" ? 0 : Number(e.target.value))}
                    onBlur={(e) => persist(p.id, "stock", parseInt(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                  <Label className="text-xs">Código de barras</Label>
                  <Input
                    value={p.barcode ?? ""}
                    onChange={(e) => updateLocal(p.id, "barcode", e.target.value)}
                    onBlur={(e) => persist(p.id, "barcode", e.target.value.trim())}
                    placeholder="Escanealo o escribilo"
                    className="h-9"
                  />
                </div>
              </div>

              {p.variants.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Variantes / sabores</p>
                  {p.variants.map((v) => (
                    <div key={v.id} className="flex items-center gap-2">
                      <span className="flex-1 truncate text-sm">{v.name}</span>
                      <Input
                        type="number"
                        value={v.stock}
                        onChange={(e) =>
                          updateVariantLocal(p.id, v.id, "stock", e.target.value === "" ? 0 : Number(e.target.value))
                        }
                        onBlur={(e) => persistVariant(v.id, "stock", parseInt(e.target.value) || 0)}
                        className="h-8 w-20"
                        title="Stock"
                      />
                      <Input
                        type="number"
                        value={v.price_modifier}
                        onChange={(e) =>
                          updateVariantLocal(
                            p.id,
                            v.id,
                            "price_modifier",
                            e.target.value === "" ? 0 : Number(e.target.value),
                          )
                        }
                        onBlur={(e) => persistVariant(v.id, "price_modifier", parseFloat(e.target.value) || 0)}
                        className="h-8 w-24"
                        title="Diferencia de precio"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onDetected={handleScanned} />
    </div>
  )
}
