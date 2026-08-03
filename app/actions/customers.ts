"use server"

import { db } from "@/lib/db"
import { customers, customerPurchases } from "@/lib/db/schema"
import { requireEnabledUser } from "@/lib/session"
import { and, desc, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type CustomerWithBalance = {
  id: number
  name: string
  phone: string | null
  email: string | null
  note: string | null
  balance: number
  pendingCount: number
}

export async function getCustomers(): Promise<CustomerWithBalance[]> {
  await requireEnabledUser()
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      note: customers.note,
      balance: sql<string>`COALESCE(SUM(CASE WHEN ${customerPurchases.paid} = false THEN ${customerPurchases.amount} ELSE 0 END), 0)`,
      pendingCount: sql<number>`COUNT(CASE WHEN ${customerPurchases.paid} = false THEN 1 END)::int`,
    })
    .from(customers)
    .leftJoin(customerPurchases, eq(customerPurchases.customerId, customers.id))
    .groupBy(customers.id)
    .orderBy(desc(customers.createdAt))

  return rows.map((r) => ({
    ...r,
    balance: Number(r.balance),
    pendingCount: Number(r.pendingCount),
  }))
}

export async function getCustomerPurchases(customerId: number) {
  await requireEnabledUser()
  return db
    .select()
    .from(customerPurchases)
    .where(eq(customerPurchases.customerId, customerId))
    .orderBy(desc(customerPurchases.createdAt))
}

export async function addCustomer(formData: {
  name: string
  phone?: string
  email?: string
  note?: string
}) {
  const currentUser = await requireEnabledUser()
  const name = formData.name?.trim()
  if (!name) throw new Error("El nombre es obligatorio.")

  await db.insert(customers).values({
    name,
    phone: formData.phone?.trim() || null,
    email: formData.email?.trim().toLowerCase() || null,
    note: formData.note?.trim() || null,
    createdByUserId: currentUser.id,
  })
  revalidatePath("/")
}

export async function addPurchase(formData: {
  customerId: number
  description: string
  amount: number
}) {
  const currentUser = await requireEnabledUser()
  const amount = Number(formData.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Anotá un monto mayor a 0.")
  }
  const description = formData.description?.trim()
  if (!description) {
    throw new Error("Anotá qué se llevó.")
  }

  await db.insert(customerPurchases).values({
    customerId: formData.customerId,
    description,
    amount: amount.toFixed(2),
    createdByUserId: currentUser.id,
    createdByName: currentUser.name,
  })
  revalidatePath("/")
}

export async function togglePurchasePaid(id: number, paid: boolean) {
  await requireEnabledUser()
  await db
    .update(customerPurchases)
    .set({ paid, paidAt: paid ? new Date() : null })
    .where(eq(customerPurchases.id, id))
  revalidatePath("/")
}

export async function payAllForCustomer(customerId: number) {
  await requireEnabledUser()
  await db
    .update(customerPurchases)
    .set({ paid: true, paidAt: new Date() })
    .where(
      and(
        eq(customerPurchases.customerId, customerId),
        eq(customerPurchases.paid, false),
      ),
    )
  revalidatePath("/")
}

export async function deletePurchase(id: number) {
  await requireEnabledUser()
  await db.delete(customerPurchases).where(eq(customerPurchases.id, id))
  revalidatePath("/")
}

export async function deleteCustomer(id: number) {
  await requireEnabledUser()
  await db.delete(customerPurchases).where(eq(customerPurchases.customerId, id))
  await db.delete(customers).where(eq(customers.id, id))
  revalidatePath("/")
}
