"use client"

import { useEffect, useState, useTransition } from "react"
import Image from "next/image"
import {
  searchProducts,
  listProductsByCategory,
  getCategories,
  updateProductField,
  updateVariantField,
  createVariant,
  deleteVariant,
  type ProductRow,
  type CategoryRow,
} from "@/app/actions/products"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { BarcodeScanner } from "@/components/products/barcode-scanner"
import { ImportExportProducts } from "@/components/products/import-export-products"
import { NewProductDialog } from "@/components/products/new-product-dialog"
import { ManageCategoriesDialog } from "@/components/products/manage-categories-dialog"
import { Search, ScanBarcode, Package, Loader2, FileSpreadsheet, Plus, Trash2, Tag } from "lucide-react"
import { toast } from "sonner"

export function ProductsSection() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ProductRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [addingVariantFor, setAddingVariantFor] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  function refreshCategories() {
    getCategories().then(setCategories).catch(() => {})
  }

  async function runSearch(q: string) {
    setActiveCategory(null)
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

  async function pickCategory(cat: CategoryRow) {
    setQuery("")
    setActiveCategory(cat.id)
    setLoading(true)
    try {
      const data = await listProductsByCategory(cat.id)
      setResults(data)
    } catch {
      toast.error("No se pudo cargar la categoría.")
    } finally {
      setLoading(false)
    }
  }

  function handleScanned(code: string) {
    setQuery(code)
    runSearch(code)
  }

  function refreshCurrent() {
    if (activeCategory) {
      const cat = categories.find((c) => c.id === activeCategory)
      if (cat) pickCategory(cat)
    } else if (query.trim()) {
      runSearch(query)
    }
  }

  function updateLocal(id: string, field: "stock" | "price" | "barcode", value: any) {
    setResults((prev) => (prev ? prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)) : prev))
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
              ? { ...p, variants: p.variants.map((v) => (v.id === variantId ? { ...v, [field]: value } : v)) }
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

  function handleDeleteVariant(productId: string, variantId: string) {
    setResults((prev) =>
      prev
        ? prev.map((p) =>
            p.id === productId ? { ...p, variants: p.variants.filter((v) => v.id !== variantId) } : p,
          )
        : prev,
    )
    startTransition(async () => {
      try {
        await deleteVariant(variantId)
      } catch {
        toast.error("No se pudo borrar el sabor.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
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
                <span className="hidden sm:inline">Escanear</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <NewProductDialog categories={categories} onCreated={refreshCurrent} />
            <ManageCategoriesDialog categories={categories} onChanged={refreshCategories} />
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickCategory(c)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium premium-transition ${
                    activeCategory === c.id
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  <Tag className="h-3 w-3" />
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {results === null && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Buscá un producto por nombre, escaneá un código de barras, o elegí una categoría arriba.
        </p>
      )}

      {results && results.length === 0 && !loading && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No hay ningún producto que coincida.
          </CardContent>
        </Card>
      )}

      <div className="reveal-sequential flex flex-col gap-3">
        {results?.map((p) => (
          <Card key={p.id} className="overflow-hidden premium-transition hover:shadow-md">
            <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
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
                <div className="flex flex-col gap-2 rounded-xl bg-secondary/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Sabores / variantes</p>
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
                        className="h-8 w-20 bg-card"
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
                        className="h-8 w-24 bg-card"
                        title="Diferencia de precio"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteVariant(p.id, v.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {addingVariantFor === p.id ? (
                <NewVariantForm
                  productId={p.id}
                  onCancel={() => setAddingVariantFor(null)}
                  onCreated={() => {
                    setAddingVariantFor(null)
                    refreshCurrent()
                  }}
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => setAddingVariantFor(p.id)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar sabor / variante
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} onDetected={handleScanned} />
      <ImportExportProducts
        open={importOpen}
        onOpenChange={setImportOpen}
        categories={categories}
        onDone={refreshCurrent}
      />
    </div>
  )
}

function NewVariantForm({
  productId,
  onCancel,
  onCreated,
}: {
  productId: string
  onCancel: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [stock, setStock] = useState("")
  const [priceModifier, setPriceModifier] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Ponele un nombre al sabor.")
      return
    }
    setSaving(true)
    try {
      await createVariant(productId, {
        name,
        stock: Number(stock) || 0,
        price_modifier: Number(priceModifier) || 0,
      })
      toast.success("Sabor agregado.")
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo agregar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input placeholder="Nombre (ej: Chocolate)" value={name} onChange={(e) => setName(e.target.value)} className="h-9 bg-card" />
        <Input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} className="h-9 bg-card" />
        <Input
          type="number"
          placeholder="Diferencia de precio"
          value={priceModifier}
          onChange={(e) => setPriceModifier(e.target.value)}
          className="h-9 bg-card"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar sabor"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
