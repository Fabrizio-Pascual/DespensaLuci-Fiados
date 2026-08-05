"use server"

import { pool } from "@/lib/db"
import { requireEnabledUser } from "@/lib/session"

export type ProductVariantRow = {
  id: string
  name: string
  stock: number
  price_modifier: number
}

export type ProductRow = {
  id: string
  name: string
  price: number
  stock: number
  unit: string
  barcode: string | null
  image_url: string | null
  category_name: string | null
  variants: ProductVariantRow[]
}

export type CategoryRow = {
  id: string
  name: string
}

export async function getCategories(): Promise<CategoryRow[]> {
  await requireEnabledUser()
  const { rows } = await pool.query(
    `select id, name from public.categories order by display_order asc, name asc`,
  )
  return rows
}

async function attachVariants(products: ProductRow[]): Promise<ProductRow[]> {
  if (products.length === 0) return products
  const ids = products.map((p) => p.id)
  const { rows } = await pool.query(
    `select id, product_id, name, stock, price_modifier
     from public.product_variants
     where product_id = any($1::uuid[])
     order by name asc`,
    [ids],
  )
  const byProduct = new Map<string, ProductVariantRow[]>()
  for (const r of rows) {
    const list = byProduct.get(r.product_id) ?? []
    list.push({ id: r.id, name: r.name, stock: r.stock, price_modifier: Number(r.price_modifier) })
    byProduct.set(r.product_id, list)
  }
  return products.map((p) => ({ ...p, variants: byProduct.get(p.id) ?? [] }))
}

// Busca por nombre (texto libre) o por código de barras exacto.
export async function searchProducts(query: string): Promise<ProductRow[]> {
  await requireEnabledUser()
  const q = query.trim()
  if (!q) return []

  const { rows } = await pool.query(
    `select p.id, p.name, p.price, p.stock, p.unit, p.barcode, p.image_url,
            c.name as category_name
     from public.products p
     left join public.categories c on c.id = p.category_id
     where p.barcode = $1
        or p.name ilike '%' || $1 || '%'
     order by (p.barcode = $1) desc, p.name asc
     limit 25`,
    [q],
  )

  return attachVariants(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: Number(r.price),
      stock: r.stock,
      unit: r.unit,
      barcode: r.barcode,
      image_url: r.image_url,
      category_name: r.category_name,
      variants: [],
    })),
  )
}

// Lista todos los productos de una categoría (para cuando no sabés
// el nombre ni el código, pero sí en qué sección está).
export async function listProductsByCategory(categoryId: string): Promise<ProductRow[]> {
  await requireEnabledUser()
  const { rows } = await pool.query(
    `select p.id, p.name, p.price, p.stock, p.unit, p.barcode, p.image_url,
            c.name as category_name
     from public.products p
     left join public.categories c on c.id = p.category_id
     where p.category_id = $1
     order by p.name asc
     limit 100`,
    [categoryId],
  )

  return attachVariants(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      price: Number(r.price),
      stock: r.stock,
      unit: r.unit,
      barcode: r.barcode,
      image_url: r.image_url,
      category_name: r.category_name,
      variants: [],
    })),
  )
}

export async function updateProductField(
  id: string,
  field: "stock" | "price" | "barcode",
  value: string | number,
) {
  await requireEnabledUser()
  const column = field === "stock" ? "stock" : field === "price" ? "price" : "barcode"
  await pool.query(`update public.products set "${column}" = $2, updated_at = now() where id = $1`, [
    id,
    value,
  ])
}

export async function updateVariantField(id: string, field: "stock" | "price_modifier", value: number) {
  await requireEnabledUser()
  const column = field === "stock" ? "stock" : "price_modifier"
  await pool.query(`update public.product_variants set "${column}" = $2 where id = $1`, [id, value])
}

export async function createVariant(
  productId: string,
  data: { name: string; stock: number; price_modifier: number },
) {
  await requireEnabledUser()
  if (!data.name.trim()) throw new Error("Ponele un nombre al sabor/variante.")
  await pool.query(
    `insert into public.product_variants (product_id, name, stock, price_modifier, is_active)
     values ($1, $2, $3, $4, true)`,
    [productId, data.name.trim(), data.stock || 0, data.price_modifier || 0],
  )
}

export async function deleteVariant(id: string) {
  await requireEnabledUser()
  await pool.query(`delete from public.product_variants where id = $1`, [id])
}
